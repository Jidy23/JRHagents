# JRHagents contributor instructions

- Product: one canonical portable Agent Skill at `skills/jrhagents/SKILL.md`; the website is a local documentation and instruction-copy interface.
- `data/capabilities.json` is the source of truth for the 66 workflows. Run `python tools/build_catalog.py` after edits; commit all generated outputs together.
- Keep claims limited to actual host capabilities. Never imply that installation grants APIs, accounts, memory, or permissions.
- Work on a feature branch, preserve existing history and unrelated files, and review diffs before a PR.
- Check with `python -m unittest discover -s tests -p 'test_*.py' -v`, `python tools/build_catalog.py --check`, `node --test tests/catalog.test.cjs`, and `node --check docs/assets/app.js`.
- Prefer small dependencies-free changes; document failed or unrun checks accurately in the PR.
