# Release checklist

1. Update `data/capabilities.json` and references as needed. Run `python tools/build_catalog.py` and commit generated files together.
2. Run `python -m unittest discover -s tests -p 'test_*.py' -v`, `node --test tests/catalog.test.cjs` and `node --check docs/assets/app.js`.
3. Run `python tools/package_release.py` to create `dist/jrhagents-skill.zip`. Inspect the archive before attaching it to a release. This archive contains the portable Skill folder; it does not grant tools or permissions.
4. Open a PR, wait for all CI jobs on its head commit, and inspect changes. Merge only after the checks and review are complete.
5. After GitHub Pages deploys from `main`, check the canonical `/JRHagents/` URL, links, language switch, clipboard, mobile layout and asset requests. Record the deployed SHA and any browser limitations.
6. Tag the verified commit with a version and write release notes describing what was tested. Roll back with a new revert commit and another CI run if needed; do not force-push shared history.

No package or website endpoint accepts an API key. Do not include personal data, secrets, generated screenshots or credentials in release archives.
