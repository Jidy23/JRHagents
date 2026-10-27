import unittest

from runtime import (
    ApprovalRequired,
    RunManager,
    Risk,
    SkillRegistry,
    SkillSpec,
    StepSpec,
    WorkflowPlan,
)
class RuntimeTests(unittest.TestCase):
    def test_executes_in_order_and_records_events(self):
        seen = []
        registry = SkillRegistry([SkillSpec("echo", "Return input")])
        plan = WorkflowPlan("echo twice", (
            StepSpec("first", "echo", {"value": 1}),
            StepSpec("second", "echo", {"value": 2}),
        ))
        result = RunManager(registry).execute(
            plan, {"echo": lambda data: seen.append(data["value"]) or data["value"]}
        )
        self.assertEqual(seen, [1, 2])
        self.assertEqual(result.status, "completed")
        self.assertEqual(result.outputs, {"first": 1, "second": 2})
        self.assertEqual(result.events[-1].type, "run.completed")

    def test_high_risk_skill_requires_approval(self):
        registry = SkillRegistry([
            SkillSpec("deploy", "Deploy production", risk=Risk.HIGH, requires_approval=True)
        ])
        plan = WorkflowPlan("deploy", (StepSpec("deploy-step", "deploy"),))
        with self.assertRaises(ApprovalRequired):
            RunManager(registry).execute(plan, {"deploy": lambda _: "deployed"})

        result = RunManager(registry).execute(
            plan, {"deploy": lambda _: "deployed"}, approved_steps={"deploy-step"}
        )
        self.assertEqual(result.outputs["deploy-step"], "deployed")

    def test_missing_handler_fails_closed(self):
        registry = SkillRegistry([SkillSpec("browser", "Use a browser")])
        plan = WorkflowPlan("browse", (StepSpec("browse-step", "browser"),))
        with self.assertRaises(KeyError):
            RunManager(registry).execute(plan, {})

    def test_duplicate_skill_and_invalid_risk_are_rejected(self):
        with self.assertRaises(ValueError):
            SkillRegistry([SkillSpec("same", "one"), SkillSpec("same", "two")])
        with self.assertRaises(ValueError):
            SkillSpec("unsafe", "No approval", risk=Risk.HIGH)

    def test_string_risk_cannot_bypass_approval(self):
        with self.assertRaises(ValueError):
            SkillSpec("unsafe", "No approval", risk="high")
        with self.assertRaises(ValueError):
            SkillSpec("unsafe", "Bad approval", risk="high", requires_approval="yes")
        with self.assertRaises(ValueError):
            SkillSpec("unsafe", "Unknown risk", risk="unknown")
        skill = SkillSpec("protected", "Needs approval", risk="high", requires_approval=True)
        self.assertIs(skill.risk, Risk.HIGH)
        with self.assertRaises(ApprovalRequired):
            RunManager(SkillRegistry([skill])).execute(
                WorkflowPlan("protected", (StepSpec("step", "protected"),)),
                {"protected": lambda _: "should not run"},
            )

    def test_failed_and_paused_runs_preserve_safe_evidence(self):
        registry = SkillRegistry([SkillSpec("safe", "Safe"),
                                  SkillSpec("high", "High", risk=Risk.HIGH, requires_approval=True)])
        with self.assertRaises(ApprovalRequired) as paused:
            RunManager(registry).execute(WorkflowPlan("pause", (StepSpec("s", "high"),)), {})
        self.assertEqual(paused.exception.status, "paused")
        self.assertEqual(paused.exception.events[-1].type, "run.paused")
        with self.assertRaises(RuntimeError) as failed:
            RunManager(registry).execute(
                WorkflowPlan("fail", (StepSpec("s", "safe"),)),
                {"safe": lambda _: (_ for _ in ()).throw(RuntimeError("secret-value"))},
            )
        self.assertEqual(failed.exception.status, "failed")
        self.assertEqual(failed.exception.events[-1].type, "run.failed")
        self.assertNotIn("secret-value", repr(failed.exception.events))

    def test_missing_skill_or_handler_exposes_failure_events(self):
        for registry, skill_id in [(SkillRegistry(), "unknown"),
                                   (SkillRegistry([SkillSpec("known", "Known")]), "known")]:
            with self.subTest(skill_id=skill_id):
                with self.assertRaises(KeyError) as failed:
                    RunManager(registry).execute(WorkflowPlan("x", (StepSpec("s", skill_id),)), {})
                self.assertEqual(failed.exception.status, "failed")
                self.assertEqual(failed.exception.events[-1].type, "run.failed")


if __name__ == "__main__":
    unittest.main()
