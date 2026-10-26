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
