from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import os
import sqlite3
import tempfile
import unittest

from runtime.project_memory import MemoryCapacityError, ProjectMemory


class ProjectMemoryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "memory.sqlite3"

    def memory(self, **kwargs):
        return ProjectMemory(self.path, enabled=True, **kwargs)

    def save(self, store, **kwargs):
        values = dict(project="project-a", kind="decision", title="Design", body="Use a compact layout", confirmed_non_sensitive=True)
        values.update(kwargs)
        return store.save(**values)

    def test_disabled_does_not_create_a_file(self):
        with self.assertRaises(PermissionError):
            ProjectMemory(self.path)
        self.assertFalse(self.path.exists())

    def test_saving_requires_explicit_per_entry_confirmation(self):
        store = self.memory()
        with self.assertRaises(PermissionError):
            self.save(store, confirmed_non_sensitive=False)
        with self.assertRaises(PermissionError):
            self.save(store, confirmed_non_sensitive=1)
        self.assertEqual(store.search(project="project-a"), [])

    def test_save_search_reopen_and_delete_respect_project(self):
        store = self.memory()
        first = self.save(store, title="Desain", body="Gunakan TATA LETAK ringkas")
        self.save(store, project="project-b", body="Another project")
        reopened = self.memory()
        results = reopened.search(project="project-a", query="tata letak")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0], first)
        self.assertEqual(results[0]["trust"], "untrusted")
        self.assertFalse(reopened.delete(project="project-b", entry_id=first["id"]))
        self.assertTrue(reopened.delete(project="project-a", entry_id=first["id"]))
        self.assertFalse(reopened.delete(project="project-a", entry_id=first["id"]))
        self.assertEqual(reopened.search(project="project-a"), [])
        self.assertEqual(len(reopened.search(project="project-b")), 1)

    def test_search_has_bound_limit_and_does_not_interpret_sql(self):
        store = self.memory()
        self.save(store, title="older")
        self.save(store, title="newer")
        self.assertEqual([r["title"] for r in store.search(project="project-a", limit=1)], ["newer"])
        self.assertEqual(store.search(project="project-a' OR 1=1 --"), [])
        for limit in (0, 101, True, "1"):
            with self.subTest(limit=limit), self.assertRaises(ValueError):
                store.search(project="project-a", limit=limit)

    def test_capacity_is_persisted_and_never_evicts_automatically(self):
        store = self.memory(max_entries=1)
        first = self.save(store)
        reopened = self.memory()
        self.assertEqual(reopened.max_entries, 1)
        with self.assertRaises(MemoryCapacityError):
            self.save(reopened)
        self.assertEqual(reopened.search(project="project-a"), [first])
        with self.assertRaises(ValueError):
            self.memory(max_entries=2)
        self.assertTrue(reopened.delete(project="project-a", entry_id=first["id"]))
        self.save(reopened)

    def test_concurrent_saves_respect_store_wide_capacity(self):
        store = self.memory(max_entries=4)

        def attempt(index):
            try:
                self.save(store, project=f"project-{index}")
                return True
            except MemoryCapacityError:
                return False

        with ThreadPoolExecutor(max_workers=8) as executor:
            outcomes = list(executor.map(attempt, range(16)))
        self.assertEqual(sum(outcomes), 4)
        with sqlite3.connect(self.path) as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM entries").fetchone()[0], 4)

    def test_rejects_common_credential_shapes_without_echoing_them(self):
        store = self.memory()
        examples = (
            "api_key=example-dont-store-this",
            "Bearer abcdefghijklmnop",
            "sk-proj-abcdefghijklmnop",
            "-----BEGIN PRIVATE KEY-----",
        )
        for value in examples:
            with self.subTest(value=value):
                with self.assertRaises(ValueError) as error:
                    self.save(store, body=value)
                self.assertNotIn(value, str(error.exception))
        self.assertEqual(store.search(project="project-a"), [])

    def test_validates_byte_limits_and_kind(self):
        store = self.memory()
        for invalid in ("", "x" * 4097, "\x00", "\udcff"):
            with self.subTest(body=repr(invalid)), self.assertRaises(ValueError):
                self.save(store, body=invalid)
        for kind in ("", "instruction", None, []):
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                self.save(store, kind=kind)
        with self.assertRaises(ValueError):
            ProjectMemory(self.path, enabled=True, max_entries=0)

    def test_refuses_unknown_or_malformed_files_without_overwriting(self):
        self.path.write_bytes(b"not a sqlite database")
        if os.name == "posix":
            self.path.chmod(0o600)
        with self.assertRaises(ValueError):
            self.memory()
        self.assertEqual(self.path.read_bytes(), b"not a sqlite database")

    @unittest.skipUnless(hasattr(os, "symlink"), "symlinks unavailable")
    def test_refuses_symlink_to_another_file(self):
        target = Path(self.tmp.name) / "target"
        target.write_text("keep")
        try:
            self.path.symlink_to(target)
        except OSError as exc:
            self.skipTest(f"symlink creation unavailable: {exc}")
        with self.assertRaises(ValueError):
            self.memory()
        self.assertEqual(target.read_text(), "keep")

    @unittest.skipUnless(os.name == "posix", "POSIX permission check")
    def test_new_file_is_private_and_insecure_existing_file_is_rejected(self):
        self.memory()
        self.assertEqual(self.path.stat().st_mode & 0o777, 0o600)
        self.path.chmod(0o644)
        with self.assertRaises(PermissionError):
            self.memory()


if __name__ == "__main__":
    unittest.main()
