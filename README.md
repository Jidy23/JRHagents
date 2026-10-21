# JRHagents

**One local-first toolkit. Three honest integration formats: Skill · MCP · Plugin.**

JRHagents V17 helps people inspect projects, plan fixes, and verify evidence. It works offline by default, costs nothing for local tools, and never pretends third-party AI integrations are connected.

**[Interactive guide](https://jidy23.github.io/JRHagents/)** · [Installation](docs/INSTALL.md) · [MCP](docs/MCP.md) · [Compatibility](docs/PLATFORMS.md) · [Source and tests](tests/)

## Quick start (Windows, macOS, Linux; Python 3.9+)

Download the repository ZIP and extract it, or clone this repo. In its root directory:

```bash
python -m pip install .
jrhagents doctor
jrhagents install --client codex --project /path/to/project
```

On Windows, try `py -m pip install .`. For `jrhagents: command not found`, use `python -m jrhagents` instead. Open your AI coding session in the target project and say:

> JRHagents, audit this repo, prioritize one problem, and show proof of verification.

### Works as a skill

`jrhagents install --client <client> --project PATH` supports `codex`, `claude`, `gemini`, `cursor`, `copilot`, `opencode`, and `windsurf`. `--client all` installs all seven **project** variants. `--dry-run` previews; `--upgrade` backs up an existing installation before replacing it. Paths are the supported client conventions, but native client detection has not been tested for every version.

### Works as an MCP server

```bash
jrhagents mcp-config --client claude --project /path/to/project
```

Copy the resulting JSON into your MCP client's settings; it launches the actual `jrhagents-mcp` stdio server. Five **read-only** MCP tools: `jrh_doctor`, `jrh_audit`, `jrh_route`, `jrh_plan`, `jrh_status`. No remote API, personal secrets, or autonomous edits. [MCP instructions](docs/MCP.md).

### Works as an Agent Plugin

The root contains `plugin.json` using **Agent Plugins 1.0**, `skills/jrhagents/SKILL.md`, and `mcp.json`. It is intended for clients that accept the Agent Plugins format. **It is not a ChatGPT Plugin** and it is not automatically installed in any account. The MCP part requires a Python environment with JRHagents installed.

## Honest functionality map

| Real today | Guidance, or requires external tool |
| --- | --- |
| Local doctor, audit, plan, route, status | Coding and UI changes (host AI tools required) |
| Test/build execution only with opt-in CLI flags | Hosted RAG/Onyx, REA, Scrapling and proprietary APIs |
| HTML+JSON audit reports | AI model routing, remote deployments and paid services |
| Seven local skill installers and MCP stdio | Native mobile applications or ChatGPT plugin installation |

## Quality and safety

- Python unit tests and MCP handshake/JSON-RPC smoke tests run in CI on Windows, macOS and Linux with Python 3.9 and 3.13.
- JavaScript tests validate interactive guide commands; the site makes no network calls to install software.
- No auto-overwrite; `--upgrade` retains a backup. The MCP server cannot execute project scripts or write files.
- All seven installer targets are automated-tests coverage, not a guarantee that every proprietary client version discovers skills.

See [Contributing](CONTRIBUTING.md), [Security](SECURITY.md), [Attribution](THIRD_PARTY.md), and [MIT License](LICENSE).

## Docs deployment

Source code and public website are separate. GitHub Pages must be enabled at **Settings → Pages → GitHub Actions**. The Pages workflow now reports an actionable instruction and skips deployment when unavailable, instead of failing at `configure-pages`.
