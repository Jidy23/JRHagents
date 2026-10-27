#!/usr/bin/env python3
"""Run the repository's documented local checks and summarize real results.

This command executes project test code. Run it only on a checkout you trust.
It does not run browser tests, access live services, or prove security.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from runtime.evidence import CheckResult, CheckStatus, summarize_checks
from runtime.learning import Observation, propose_improvements
from runtime.project_memory import ProjectMemory


NOT_CHECKED = ["browser interactions", "live integrations", "comprehensive security"]


def run_checks(root: Path = ROOT, *, timeout: int = 180):
    """Run fixed commands without a shell; never include command output in reports."""
    root = Path(root)
    node = shutil.which("node")
    js_tests = sorted(str(path.relative_to(root)) for path in (root / "tests").glob("*.test.cjs"))
    checks = [
        ("Python tests", [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py"]),
        ("Catalog consistency", [sys.executable, "tools/build_catalog.py", "--check"]),
        ("JavaScript tests", [node, "--test", *js_tests] if node and js_tests else None),
        ("Website app.js syntax", [node, "--check", "docs/assets/app.js"] if node else None),
        ("Catalog JavaScript syntax", [node, "--check", "docs/assets/catalog.js"] if node else None),
        ("Portable prompt JavaScript syntax", [node, "--check", "docs/assets/universal.js"] if node else None),
    ]
    results = []
    for name, command in checks:
        if command is None:
            reason = "Node.js or the required JavaScript test files are unavailable"
            results.append(CheckResult.not_run(name, reason=reason))
            continue
        try:
            process = subprocess.run(
                command, cwd=str(root), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                timeout=timeout, check=False,
            )
        except FileNotFoundError:
            results.append(CheckResult.not_run(name, reason="Required executable is unavailable"))
        except subprocess.TimeoutExpired:
            results.append(CheckResult.from_observation(
                name, False, source="local process", detail="Check exceeded its time limit"
            ))
        except OSError:
            results.append(CheckResult.not_run(name, reason="The check could not be started"))
        else:
            results.append(CheckResult.from_exit_code(name, process.returncode, source="local process exit code"))
    return summarize_checks([name for name, _ in checks], results)


def suggestions_for(summary):
    """Create reviewable suggestions from actual non-passing check statuses."""
    observations = []
    for index, check in enumerate(summary.checks, 1):
        if check.status is CheckStatus.PASSED:
            continue
        kind = "failed_verification" if check.status is CheckStatus.FAILED else "missing_verification"
        observations.append(Observation(
            f"check-{index}", "local-verification", kind,
            f"{check.name}: {check.status.value}", "local verification summary",
        ))
    return propose_improvements(observations, minimum_observations=1)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="Print structured results")
    parser.add_argument("--memory-file", type=Path, help="Opt in to save a status-only summary in this local SQLite file")
    parser.add_argument("--project", help="Project key for the optional memory")
    parser.add_argument("--confirm-non-sensitive", action="store_true", help="Confirm the saved summary contains no sensitive data")
    options = parser.parse_args(argv)
    if options.memory_file and (not options.project or not options.confirm_non_sensitive):
        parser.error("--memory-file requires --project and --confirm-non-sensitive")
    if not options.memory_file and (options.project or options.confirm_non_sensitive):
        parser.error("--project and --confirm-non-sensitive require --memory-file")

    summary = run_checks()
    suggestions = suggestions_for(summary)
    payload = {
        "schema_version": 1,
        "verification": summary.to_dict(),
        "suggestions": [proposal.to_dict() for proposal in suggestions],
        "not_checked": NOT_CHECKED,
    }
    if options.memory_file:
        try:
            memory = ProjectMemory(options.memory_file, enabled=True)
            body = "\n".join(f"{check.name}: {check.status.value}" for check in summary.checks)
            entry = memory.save(
                project=options.project, kind="progress", title="Local verification summary",
                body=body, source="local-verification", confirmed_non_sensitive=True,
            )
        except (OSError, ValueError, sqlite3.Error):
            parser.exit(2, "Could not save the summary; check the memory path and permissions.\n")
        payload["memory"] = {"id": entry["id"], "trust": entry["trust"]}

    if options.json:
        print(json.dumps(payload, indent=2, ensure_ascii=False))
    else:
        print(f"Local verification: {summary.status.value}")
        for check in summary.checks:
            print(f"  {check.status.value}: {check.name}")
        for suggestion in suggestions:
            print(f"  Suggestion for review: {suggestion.recommendation}")
        print("Not checked: " + ", ".join(NOT_CHECKED))
        if options.memory_file:
            print("A status-only summary was saved to the selected local memory.")
    return 1 if summary.status is CheckStatus.FAILED else 2 if summary.status is CheckStatus.NOT_RUN else 0


if __name__ == "__main__":
    sys.exit(main())
