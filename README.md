# JRHagents

**One skill. A clearer way to work with AI coding tools.**

JRHagents V16 is a free, local-first toolkit that helps you inspect a project, plan changes, install portable skill instructions, and verify results—without pretending an AI agent or cloud service is running behind the scenes.

[**Interactive getting-started guide**](https://jidy23.github.io/JRHagents/) *(available after GitHub Pages activation)* · [Full installation guide](docs/INSTALL.md) · [Contributing](CONTRIBUTING.md)

## Quick start (Python 3.9+; no extra dependencies for CLI)

```bash
python scripts/jrhagents.py doctor
python scripts/jrhagents.py start --project /path/to/project --task "cek dan rapikan UI"
python scripts/jrhagents.py install --client codex --project /path/to/project
```

Windows: try `py` instead of `python`. To use with Claude Code, select `claude`; with Gemini CLI, select `gemini`. Installed folders are never overwritten.

### Want zero terminals?

Download the source ZIP from GitHub, extract it, and ask your supported AI coding client to read `SKILL.md`. This uses instructions rather than CLI installation; actual support varies by client.

## 3 concrete upgrades over V13

| Level | New capability | Real outcome |
| --- | --- | --- |
| V14 · Navigate | Responsive interactive documentation, feature search, command generator, theme and quick-copy controls | The public can learn how to use the skill without reading a wall of text |
| V15 · Onboard | 3-step setup wizard with per-client installation commands and clear troubleshooting | Less friction for new users; nothing installed by the website |
| V16 · Community | Automated Python/JS tests, contribution guidance, security policy and issue templates | Easier maintenance and safer public contributions |

## What's real (and what isn't)

**Runs locally:** read-only project doctor, bounded heuristic audit, intent routing, project plan, static HTML+JSON report, opt-in project tests/build and 3 supported installer targets.

**AI-client instructions:** UX critique, coding, diagramming, research and release-check principles in `SKILL.md` and modules.

**Not included:** live BYOK providers, MCP servers, autonomous coding agents, automatic cloud deployment or the full third-party projects that inspired the 26-capability map. The interface is documentation, **not** a remote AI chat product.

## CLI

```text
python scripts/jrhagents.py help
python scripts/jrhagents.py doctor --project .
python scripts/jrhagents.py start --project . --task "audit dan rapikan UI"
python scripts/jrhagents.py route "buat diagram arsitektur"
python scripts/jrhagents.py plan "bikin fitur login" --project . --save
python scripts/jrhagents.py audit --project . --json
python scripts/jrhagents.py verify --project . --save
python scripts/jrhagents.py report --project .
python scripts/jrhagents.py install --client claude --project .
```

`verify --run-tests` or `verify --run-build` executes project-defined code **only when explicitly requested**. Do not run on untrusted projects.

## Project structure

```text
SKILL.md                 entry instructions
jrhagents/               Python CLI, routing, auditing, reports and installer
modules/                 26 capability map and safety playbooks
docs/index.html          interactive local/static docs website
docs/assets/             no-dependency CSS and JavaScript
tests/                   offline Python and Node tests
.github/workflows/       CI for contributions
```

## For maintainers

1. Run `python -m unittest discover -s tests -v`.
2. Run `node --test tests/site.test.cjs` and `node --check docs/assets/app.js`.
3. Preview `docs/index.html` locally (or run `python -m http.server 8000 -d docs`).
4. Follow [contributing](CONTRIBUTING.md) and [security](SECURITY.md) before publishing.

## Public release status

The public repository is live. GitHub Pages activation and successful deployment are separate steps.

MIT licensed; third-party repository references in `modules/CAPABILITIES.md` are conceptual inspirations, not copied dependencies. See [attribution](THIRD_PARTY.md).

## Maintainers

This repository is hosted at [Jidy23/JRHagents](https://github.com/Jidy23/JRHagents). Propose changes through pull requests, run local tests, and review diffs. `tools/publish.py` bootstraps a NEW repository and must not be used to update this existing one.

To publish the website, enable **Settings → Pages → Build and deployment → GitHub Actions**, then check the Pages workflow.
