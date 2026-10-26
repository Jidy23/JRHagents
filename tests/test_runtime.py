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


if __name__ == "__main__":
    unittest.main()
