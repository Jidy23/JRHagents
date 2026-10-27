import contextlib
import io
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from runtime.evidence import CheckStatus
from runtime.project_memory import ProjectMemory
from tools import verify_project


class VerifyProjectTests(unittest.TestCase):
    def test_missing_node_is_not_reported_as_passed(self):
        with tempfile.TemporaryDirectory() as temp, \
             patch.object(verify_project.shutil, "which", return_value=None), \
             patch.object(verify_project.subprocess, "run", return_value=SimpleNamespace(returncode=0)):
            summary = verify_project.run_checks(Path(temp))
        self.assertIs(summary.status, CheckStatus.NOT_RUN)
        self.assertEqual([check.status for check in summary.checks], [
            CheckStatus.PASSED, CheckStatus.PASSED, CheckStatus.NOT_RUN, CheckStatus.NOT_RUN,
            CheckStatus.NOT_RUN, CheckStatus.NOT_RUN,
        ])
        self.assertEqual(len(verify_project.suggestions_for(summary)), 1)

    def test_failed_test_yields_failed_status_and_reviewable_suggestion(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "tests").mkdir()
            (root / "tests" / "one.test.cjs").touch()
            calls = [SimpleNamespace(returncode=1)] + [SimpleNamespace(returncode=0)] * 5
            with patch.object(verify_project.shutil, "which", return_value="node"), \
                 patch.object(verify_project.subprocess, "run", side_effect=calls) as runner:
                summary = verify_project.run_checks(root)
            self.assertEqual(runner.call_count, 6)
            self.assertTrue(all(call.kwargs.get("shell") is None for call in runner.call_args_list))
        self.assertIs(summary.status, CheckStatus.FAILED)
        proposals = verify_project.suggestions_for(summary)
        self.assertEqual(len(proposals), 1)
        self.assertEqual(proposals[0].kind, "failed_verification")

    def test_generated_javascript_syntax_failures_are_not_hidden(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "tests").mkdir()
            (root / "tests" / "one.test.cjs").touch()
            for index in (4, 5):
                calls = [SimpleNamespace(returncode=0) for _ in range(6)]
                calls[index] = SimpleNamespace(returncode=1)
                with self.subTest(index=index), \
                     patch.object(verify_project.shutil, "which", return_value="node"), \
                     patch.object(verify_project.subprocess, "run", side_effect=calls) as runner:
                    summary = verify_project.run_checks(root)
                self.assertIs(summary.status, CheckStatus.FAILED)
                self.assertIs(summary.checks[index].status, CheckStatus.FAILED)
                self.assertEqual(runner.call_args_list[index].args[0][-1], (
                    "docs/assets/catalog.js" if index == 4 else "docs/assets/universal.js"
                ))

    def test_memory_requires_explicit_project_and_confirmation_before_checks(self):
        with patch.object(verify_project, "run_checks") as run, \
             contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            verify_project.main(["--memory-file", "memory.sqlite"])
        run.assert_not_called()

    def test_memory_database_error_is_controlled_and_does_not_echo_details(self):
        summary = verify_project.summarize_checks([], [])
        error_output = io.StringIO()
        with patch.object(verify_project, "run_checks", return_value=summary), \
             patch.object(verify_project, "ProjectMemory", side_effect=sqlite3.OperationalError("sensitive marker")), \
             contextlib.redirect_stderr(error_output), self.assertRaises(SystemExit) as stopped:
            verify_project.main([
                "--memory-file", "memory.sqlite", "--project", "sample", "--confirm-non-sensitive",
            ])
        self.assertEqual(stopped.exception.code, 2)
        self.assertNotIn("sensitive marker", error_output.getvalue())
        self.assertIn("Could not save the summary", error_output.getvalue())

    def test_real_memory_stores_only_approved_summary_and_can_be_recalled(self):
        summary = verify_project.summarize_checks(
            ["test"], [verify_project.CheckResult.not_run("test", reason="not available")]
        )
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "memory.sqlite"
            output = io.StringIO()
            with patch.object(verify_project, "run_checks", return_value=summary), \
                 contextlib.redirect_stdout(output):
                code = verify_project.main([
                    "--json", "--memory-file", str(path), "--project", "sample", "--confirm-non-sensitive",
                ])
            result = json.loads(output.getvalue())
            self.assertEqual(code, 2)
            self.assertEqual(result["verification"]["status"], "NOT RUN")
            self.assertEqual(result["memory"]["trust"], "untrusted")
            self.assertEqual(len(result["suggestions"]), 1)
            stored = ProjectMemory(path, enabled=True).search(project="sample")
            self.assertEqual(stored[0]["body"], "test: NOT RUN")
            self.assertEqual(stored[0]["trust"], "untrusted")


if __name__ == "__main__":
    unittest.main()
