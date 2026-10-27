import json
import unittest

from runtime import RunManager, SkillRegistry, SkillSpec, StepSpec, WorkflowPlan
from runtime.evidence import CheckResult, CheckStatus, summarize_checks


class EvidenceTests(unittest.TestCase):
    def test_exit_code_is_recorded_without_interpreting_positive_codes_as_success(self):
        passed = CheckResult.from_exit_code("unit", 0, source="CI job 17")
        failed = CheckResult.from_exit_code("build", 1, source="CI job 18")
        interrupted = CheckResult.from_exit_code("lint", -15, source="local process")
        self.assertEqual(passed.status, CheckStatus.PASSED)
        self.assertEqual(failed.status, CheckStatus.FAILED)
        self.assertEqual(interrupted.status, CheckStatus.FAILED)
        self.assertEqual(interrupted.exit_code, -15)

    def test_incomplete_checklist_is_not_run_and_keeps_required_order(self):
        result = summarize_checks(
            ["build", "browser", "tests"],
            [
                CheckResult.from_exit_code("tests", 0, source="test process"),
                CheckResult.from_exit_code("build", 0, source="build process"),
            ],
        )
        self.assertEqual(result.status, CheckStatus.NOT_RUN)
        self.assertEqual([item.name for item in result.checks], ["build", "browser", "tests"])
        self.assertEqual(result.checks[1].status, CheckStatus.NOT_RUN)
        self.assertEqual(result.checks[1].detail, "No result supplied")

    def test_failure_takes_precedence_over_missing_result(self):
        result = summarize_checks(
            ["lint", "smoke"], [CheckResult.from_exit_code("lint", 2, source="lint job")]
        )
        self.assertEqual(result.status, CheckStatus.FAILED)
        self.assertEqual(result.checks[1].status, CheckStatus.NOT_RUN)

    def test_all_pass_only_when_each_required_result_passed(self):
        result = summarize_checks(
            ["unit", "manual"],
            [
                CheckResult.from_exit_code("unit", 0, source="unit test job"),
                CheckResult.from_observation(
                    "manual", True, source="browser session", detail="Observed the expected screen"
                ),
            ],
        )
        self.assertEqual(result.status, CheckStatus.PASSED)
        self.assertEqual(
            result.to_dict()["counts"], {"PASSED": 2, "FAILED": 0, "NOT RUN": 0}
        )
        self.assertEqual(json.loads(json.dumps(result.to_dict()))["checks"][0]["exit_code"], 0)

    def test_empty_checklist_never_reports_passed(self):
        result = summarize_checks([], [])
        self.assertEqual(result.status, CheckStatus.NOT_RUN)
        self.assertEqual(result.to_dict()["counts"], {"PASSED": 0, "FAILED": 0, "NOT RUN": 0})

    def test_skipped_check_requires_a_reason(self):
        skipped = CheckResult.not_run("browser", reason="Browser unavailable")
        self.assertEqual(skipped.to_dict()["status"], "NOT RUN")
        with self.assertRaises(ValueError):
            CheckResult.not_run("browser", reason="  ")
        with self.assertRaises(ValueError):
            CheckResult("browser", CheckStatus.NOT_RUN, detail="skipped", exit_code=0)

    def test_actual_checks_require_a_source_and_observation_detail(self):
        with self.assertRaises(ValueError):
            CheckResult.from_exit_code("lint", 0, source=" ")
        with self.assertRaises(ValueError):
            CheckResult.from_observation("ui", True, source="browser", detail=" ")
        with self.assertRaises(ValueError):
            CheckResult("ui", CheckStatus.PASSED, source="browser")
        with self.assertRaises(ValueError):
            CheckResult("lint", "unknown", source="log")

    def test_exit_status_must_match_and_boolean_exit_codes_are_rejected(self):
        with self.assertRaises(ValueError):
            CheckResult("test", CheckStatus.PASSED, source="process", exit_code=1)
        with self.assertRaises(ValueError):
            CheckResult("test", CheckStatus.FAILED, source="process", exit_code=0)
        with self.assertRaises(ValueError):
            CheckResult.from_exit_code("test", True, source="process")
        with self.assertRaises(ValueError):
            CheckResult.from_observation("test", 1, source="observer", detail="result")

    def test_rejects_duplicate_unknown_and_malformed_results(self):
        item = CheckResult.from_exit_code("test", 0, source="test job")
        with self.assertRaises(ValueError):
            summarize_checks(["test", " test "], [])
        with self.assertRaises(ValueError):
            summarize_checks(["test"], [item, item])
        with self.assertRaises(ValueError):
            summarize_checks(["build"], [item])
        with self.assertRaises(ValueError):
            summarize_checks(["test"], [{"name": "test", "status": "PASSED"}])

    def test_rejects_nonsequences_empty_names_and_excessive_input(self):
        with self.assertRaises(ValueError):
            summarize_checks("unit", [])
        with self.assertRaises(ValueError):
            summarize_checks(["unit"], "test")
        with self.assertRaises(ValueError):
            summarize_checks([" "], [])
        with self.assertRaises(ValueError):
            summarize_checks([f"check-{index}" for index in range(129)], [])
        with self.assertRaises(ValueError):
            CheckResult.not_run("x" * 121, reason="missing")
        with self.assertRaises(ValueError):
            CheckResult.from_exit_code("test", 0, source="x" * 257)

    def test_completed_workflow_is_not_automatically_a_verified_result(self):
        registry = SkillRegistry([SkillSpec("echo", "Return input")])
        plan = WorkflowPlan("Echo", (StepSpec("echo-step", "echo", {"value": 1}),))
        run = RunManager(registry).execute(plan, {"echo": lambda data: data["value"]})
        self.assertEqual(run.status, "completed")
        self.assertEqual(summarize_checks(["unit tests"], []).status, CheckStatus.NOT_RUN)

    def test_runtime_handler_can_supply_result_without_extra_capabilities(self):
        registry = SkillRegistry([SkillSpec("check", "Run an injected verification")])
        plan = WorkflowPlan("Verify", (StepSpec("step", "check"),))
        run = RunManager(registry).execute(plan, {"check": lambda _: {"exit_code": 0}})
        observed = CheckResult.from_exit_code(
            "unit", run.outputs["step"]["exit_code"], source=f"host run {run.run_id}"
        )
        self.assertEqual(summarize_checks(["unit"], [observed]).status, CheckStatus.PASSED)


if __name__ == "__main__":
    unittest.main()
