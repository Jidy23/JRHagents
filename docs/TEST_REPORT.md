# JRHagents V17 — verification notes

This document is a **local development note**, not a claim that hosted integration is fully deployed.

Automated checks: `python -m unittest discover -s tests -v`, `node --test tests/site.test.cjs`, and `node --check docs/assets/app.js`.

MCP transport tests exercise `initialize`, `tools/list`, `tools/call` and notifications over real subprocess stdio. Installer tests cover seven platforms, all-client dry-run, refusal to overwrite, and backup-on-upgrade. GitHub Actions runs Python tests on Windows, macOS and Linux once this version is pushed.

External AI-client plugin load, MCP client auto-configuration, and GitHub Pages publishing require supported clients or GitHub Pages settings and **cannot be inferred from passing unit tests**.
