# JRHagents V19 — test report

Results below describe **local tests** in the working environment and the intended GitHub CI checks. Successful tests do not prove all AI client variants work in every installation.

## Locally verified

- Python unittest: **58 tests passed** (CLI, MCP, installer, setup, safety and packaging behavior).
- Node built-in test runner: **27 tests passed** (browser audit, install command generator, site models, HTML structure).
- Headless Chromium, widths **1440 / 768 / 390 / 320 px**: page loaded without JS errors and no horizontal overflow. Browser sample audit, JSON download, OS/client/mode changes, unsupported MCP feedback, search, theme and mobile navigation passed.
- Wheel `jrhagents-19.0.0-py3-none-any.whl` built locally and installed into an isolated virtual environment; `python -m jrhagents --version` returned **19.0.0** and bundled SKILL.md exists.
- CLI local setup created an actual Skill folder and Cursor MCP configuration in a test project.

## Important limitations

- This environment cannot test downloading the new code from GitHub via network before publication; source ZIP URL is based on pip-supported archive URL semantics.
- GitHub Pages is a static browser UI; no AI model or live coding agent is hosted there.
- macOS tests are not counted as passed until the GitHub runner executes successfully. Previous macOS CI jobs were cancelled.
- Plugin imports into real Claude Code client have not been independently tested here; manifest is provided for compatible plugin loaders.
- MCP/Skill client-specific version compatibility must be verified by each user.
- The browser audit is heuristic and limited; it cannot certify a repository as safe.

For up-to-date CI, see [GitHub Actions](https://github.com/Jidy23/JRHagents/actions).
