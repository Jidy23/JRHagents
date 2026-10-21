# Contributing to JRHagents

Thanks for helping make practical coding assistance accessible.

1. Check whether an issue already covers your proposal.
2. Prefer focused, reversible improvements and state their acceptance criteria.
3. Run Python tests (`python -m unittest discover -s tests -v`) and website tests (`node --test tests/site.test.cjs`).
4. For UI work: test keyboard navigation, a narrow viewport, both themes and reduced motion.
5. Submit a pull request documenting behavior, risks, actual tests and anything not verified.

**Please do not include:** personal data, secrets, vendor code without a reviewed license, fake metrics or claims of live integrations that have not been connected.

## Development

CLI is Python stdlib only; interactive docs are plain HTML/CSS/JS. Node is used only for UI module tests. No package install is needed to contribute to core features. See `docs/INSTALL.md`.
