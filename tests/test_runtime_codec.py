import json
import unittest

from runtime.codec import plan_from_dict, plan_to_dict, result_to_dict
from runtime import RunManager, SkillRegistry, SkillSpec


class RuntimeCodecTests(unittest.TestCase):
    def test_plan_round_trip(self):
        value = {
            "schema_version": 1,
            "plan_id": "plan_demo",
            "goal": "Echo a value",
            "steps": [{"id": "one", "skill_id": "echo", "input": {"value": 7}}],
        }
        self.assertEqual(plan_to_dict(plan_from_dict(value)), value)

    def test_invalid_plan_is_rejected_before_execution(self):
        with self.assertRaises(ValueError):
            plan_from_dict({"schema_version": 1, "goal": "", "steps": []})
        with self.assertRaises(ValueError):
            plan_from_dict({"schema_version": 2, "goal": "x", "steps": []})

    def test_rejects_non_string_step_ids_and_boolean_schema(self):
        for field, invalid in (("id", None), ("id", 4), ("skill_id", False)):
            step = {"id": "step", "skill_id": "echo"}
            step[field] = invalid
            with self.subTest(field=field, value=invalid), self.assertRaises(ValueError):
                plan_from_dict({"schema_version": 1, "goal": "x", "steps": [step]})
        with self.assertRaises(ValueError):
            plan_from_dict({"schema_version": True, "goal": "x", "steps": []})
        for root in (None, [], "text", 3):
            with self.subTest(root=root), self.assertRaisesRegex(ValueError, "plan must be an object"):
                plan_from_dict(root)

    def test_rejects_non_json_values_in_nested_input(self):
        for value in (float("nan"), float("inf"), -float("inf"), object(), "\ud800"):
            plan = {"schema_version": 1, "goal": "x", "steps": [
                {"id": "one", "skill_id": "echo", "input": {"nested": [value]}}
            ]}
            with self.subTest(value=repr(value)), self.assertRaises(ValueError):
                plan_from_dict(plan)
        cyclic = []
        cyclic.append(cyclic)
        with self.assertRaisesRegex(ValueError, "cyclic"):
            plan_from_dict({"schema_version": 1, "goal": "x", "steps": [], "data": cyclic})

    def test_result_is_json_serializable(self):
        plan = plan_from_dict({
            "schema_version": 1,
            "goal": "Echo",
            "steps": [{"id": "one", "skill_id": "echo", "input": {}}],
        })
        result = RunManager(SkillRegistry([SkillSpec("echo", "Echo")])).execute(
            plan, {"echo": lambda _: {"ok": True}}
        )
        json.dumps(result_to_dict(result))


if __name__ == "__main__":
    unittest.main()
