# Contributing

JRHagents is one open Agent Skill. Suggestions are welcome when they improve clarity, correctness, portability or safety.

1. Open an issue describing the real problem, affected AI client/version, and minimal reproduction.
2. Keep the canonical skill at `skills/jrhagents/SKILL.md`; put detailed guidance in `references/`.
3. Do not add hidden API calls, telemetry, bundled proprietary code, secret handling, or unverified "supported everywhere" claims.
4. Run `python -m unittest discover -s tests -v` before a PR.
5. For new examples, distinguish chat-only guidance from verified tool actions. Add a regression test for a fixed bug.

Provide original contributions under MIT terms; respect third-party licensing and attribution.
