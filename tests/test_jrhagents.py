"""Regression tests: designed to run fully offline with Python stdlib."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from jrhagents import __version__
from jrhagents.routing import route_request
from jrhagents.core import doctor, audit, initialize, create_plan, verify, status, start
from jrhagents.reporting import generate_report, build_html
from jrhagents.installer import install, destination
from jrhagents.cli import run

class RoutingTests(unittest.TestCase):
    def test_indonesian_intents(self):
        samples = {"audit": "cek proyek ini", "build": "bikin fitur login", "polish": "rapikan tampilan UI", "research": "riset tren terbaru", "release": "siap deploy produksi?", "diagram": "buat diagram arsitektur"}
        for label, request in samples.items():
            with self.subTest(request=request):
                self.assertEqual(route_request(request)["intent"], label)

    def test_build_overrides_ui(self):
        self.assertEqual(route_request("buat website dengan UI responsif")["intent"], "build")

    def test_empty_fails(self):
        with self.assertRaises(ValueError): route_request("")

    def test_modules_unique(self):
        result = route_request("audit dan rapikan UI")
        self.assertEqual(len(result["capabilities"]), len(set(result["capabilities"])))

class FilesystemTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def test_doctor(self):
        r = doctor(self.root)
        self.assertTrue(r["tools"]["python"] or r["tools"]["git"])
        self.assertFalse(r["live_mcp_verified"])
        self.assertFalse(r["live_provider_verified"])

    def test_init_never_overwrites(self):
        p = Path(initialize(self.root))
        self.assertTrue(p.is_file())
        p.write_text("important user edits", encoding="utf-8")
        with self.assertRaises(FileExistsError): initialize(self.root)
        self.assertEqual(p.read_text(encoding="utf-8"), "important user edits")

    def test_missing_project(self):
        with self.assertRaises(ValueError): doctor(self.root / "missing")

    def test_audit_stack(self):
        (self.root / "package.json").write_text('{"name":"demo","scripts":{"test":"echo ok","build":"echo ok"}}', encoding="utf-8")
        (self.root / "package-lock.json").write_text("{}", encoding="utf-8")
        result = audit(self.root)
        self.assertIn("package.json", result["framework_markers"])
        self.assertEqual(result["package"]["scripts_available"], ["build", "test"])
        self.assertIn("package-lock.json", result["lockfiles"])

    def test_secret_redacted(self):
        token = "ghp_" + "A" * 35
        (self.root / "main.py").write_text('credential = "' + token + '"\n', encoding="utf-8")
        result = audit(self.root)
        self.assertTrue(any(x["code"] == "github_token" for x in result["findings"]))
        self.assertNotIn(token, json.dumps(result))

    def test_private_key_redacted(self):
        (self.root / "config.py").write_text('-----BEGIN PRIVATE KEY-----\nDO NOT ECHO\n', encoding="utf-8")
        result = audit(self.root)
        self.assertEqual(result["findings"][0]["code"], "private_key")
        self.assertNotIn("DO NOT ECHO", json.dumps(result))

    def test_does_not_scan_installed_skill(self):
        s = self.root / ".agents" / "skills" / "jrhagents"
        s.mkdir(parents=True)
        (s / "internal.py").write_text("ghp_" + "C"*40, encoding="utf-8")
        self.assertFalse(audit(self.root)["findings"])

    def test_does_not_scan_vendor(self):
        (self.root / "node_modules").mkdir()
        (self.root / "node_modules" / "secret.py").write_text("ghp_" + "A" * 40, encoding="utf-8")
        self.assertFalse(audit(self.root)["findings"])

    def test_tracked_env_name_without_values(self):
        # no .git; merely having an .env is not considered proof it was tracked
        (self.root / ".env").write_text("KEY=TOPSECRET", encoding="utf-8")
        result = audit(self.root)
        self.assertNotIn("TOPSECRET", json.dumps(result))

    def test_no_follow_symlink(self):
        with tempfile.TemporaryDirectory() as outside:
            (Path(outside) / "file.py").write_text("ghp_" + "A"*40, encoding="utf-8")
            try:
                (self.root / "linked").symlink_to(outside, target_is_directory=True)
            except OSError:
                self.skipTest("symlink unsupported")
            self.assertEqual(audit(self.root)["findings"], [])

    def test_plan_redacts_secrets(self):
        token = "ghp_" + "B"*35
        result = create_plan("cek " + token + " pada file", self.root, save=True)
        self.assertNotIn(token, json.dumps(result))
        self.assertNotIn(token, (self.root / ".jrhagents" / "plan.json").read_text())

    def test_plan_default_readonly_and_save(self):
        p = create_plan("bikin fitur UI", self.root)
        self.assertEqual(p["steps"][0]["status"], "pending")
        self.assertFalse((self.root / ".jrhagents" / "plan.json").exists())
        create_plan("bikin fitur UI", self.root, save=True)
        self.assertTrue((self.root / ".jrhagents" / "plan.json").exists())

    def test_verify_not_run_by_default(self):
        v = verify(self.root)
        self.assertEqual(v["status"], "partial")
        self.assertFalse(v["release_ready"])
        self.assertEqual([c["status"] for c in v["checks"]][-2:], ["not_run", "not_run"])

    def test_verify_fail_on_secret(self):
        (self.root / "auth.py").write_text("'sk-" + "P"*35 + "'", encoding="utf-8")
        v = verify(self.root)
        self.assertEqual(v["status"], "failed")
        self.assertFalse(v["release_ready"])

    def test_verify_timeout_range(self):
        with self.assertRaises(ValueError): verify(self.root, timeout=0)

    def test_verify_explicit_python_tests(self):
        tests = self.root / "tests"
        tests.mkdir()
        (tests / "test_sample.py").write_text("import unittest\nclass TestX(unittest.TestCase):\n def test_ok(self):\n  self.assertTrue(True)\n", encoding="utf-8")
        v = verify(self.root, run_tests=True, timeout=20)
        checks = [x for x in v["checks"] if x["name"] == "Project tests"]
        self.assertEqual(checks[0]["status"], "passed")
        self.assertIn("output", checks[0])

    def test_start_one_command(self):
        result = start(self.root, task="rapikan UI aplikasi")
        self.assertEqual(result["intent"], "polish")
        self.assertTrue(result["project_context_created"])
        self.assertTrue(Path(result["report_html"]).exists())
        self.assertEqual(result["verification_status"], "partial")
        again = start(self.root, task="audit proyek ini")
        self.assertFalse(again["project_context_created"])

    def test_plan_refuses_parent_symlink(self):
        with tempfile.TemporaryDirectory() as outside:
            try:
                (self.root / ".jrhagents").symlink_to(outside, target_is_directory=True)
            except OSError:
                self.skipTest("symlink unsupported")
            with self.assertRaises(ValueError): create_plan("audit", self.root, save=True)
            with self.assertRaises(ValueError): start(self.root)

    def test_status(self):
        self.assertFalse(status(self.root)["initialized"])
        initialize(self.root)
        self.assertTrue(status(self.root)["initialized"])

    def test_report_escaped(self):
        (self.root / "package.json").write_text('{"name":"<script>alert(1)</script>","scripts":{}}', encoding="utf-8")
        verify(self.root, save=True)
        result = generate_report(self.root)
        html_text = Path(result["html"]).read_text(encoding="utf-8")
        self.assertIn("Content-Security-Policy", html_text)
        self.assertIn("Offline Report", html_text)
        self.assertNotIn("<script>alert(1)</script>", html_text)
        self.assertTrue(Path(result["json"]).exists())

    def test_report_cannot_write_through_symlink(self):
        work = self.root / ".jrhagents"
        work.mkdir()
        with tempfile.TemporaryDirectory() as outside:
            try:
                (work / "reports").symlink_to(outside, target_is_directory=True)
            except OSError:
                self.skipTest("symlink unsupported")
            with self.assertRaises(ValueError): generate_report(self.root)

class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def test_path_for_clients(self):
        for client, sub in {"codex":".agents", "claude":".claude", "gemini":".gemini"}.items():
            with self.subTest(client=client):
                self.assertIn(sub, str(destination(client, project=self.root)))

    def test_install_and_refuse_overwrite(self):
        r = install("claude", project=self.root)
        dest = Path(r["installed_at"])
        self.assertTrue((dest / "SKILL.md").is_file())
        self.assertTrue((dest / "references" / "CAPABILITIES.md").is_file())
        with self.assertRaises(FileExistsError): install("claude", project=self.root)

    def test_installed_cli_works(self):
        dest = Path(install("codex", project=self.root)["installed_at"])
        p = subprocess.run([sys.executable, "-m", "jrhagents", "--version"], capture_output=True, text=True, timeout=20)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertIn("19.0.0", p.stdout)

    def test_invalid_client(self):
        with self.assertRaises(ValueError): destination("unknown", project=self.root)

class CLITests(unittest.TestCase):
    def test_help(self):
        self.assertEqual(run(["help"]), 0)

    def test_failed_verify_exit_code(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "danger.py").write_text("ghp_" + "X"*35, encoding="utf-8")
            self.assertEqual(run(["verify", "--project", d]), 1)

    def test_invalid_project_returns_error(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(run(["audit", "--project", str(Path(d) / "unknown")]), 2)

    def test_skill_manifest(self):
        text = (ROOT / "SKILL.md").read_text(encoding="utf-8")
        self.assertTrue(text.startswith("---\nname: jrhagents\n"))
        self.assertIn("description:", text.split("---", 2)[1])

if __name__ == "__main__":
    unittest.main()
