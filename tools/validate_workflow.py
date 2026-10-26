#!/usr/bin/env python3
"""Validate a JRHagents workflow JSON file without executing it."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
if str(REPOSITORY_ROOT) not in sys.path:
    sys.path.insert(0, str(REPOSITORY_ROOT))

from runtime.codec import plan_from_dict, plan_to_dict


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plan", type=Path, help="path to a workflow JSON file")
    args = parser.parse_args()
    try:
        value = json.loads(args.plan.read_text(encoding="utf-8"))
        plan = plan_from_dict(value)
    except (OSError, json.JSONDecodeError, TypeError, ValueError) as error:
        parser.error(str(error))
    print(json.dumps(plan_to_dict(plan), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
