# JRHagents

**One skill. Many AI platforms. Clearer work, verifiable results.**

JRHagents is an open-source **Agent Skill**, not an AI model, SaaS dashboard, API gateway, MCP host, or universal plugin. It gives compatible AI assistants a reusable workflow for **thinking, research, writing, data, software, design, and quality checks**. Its instructions work with whatever capabilities the host already provides.

> [!IMPORTANT]
> Installing the skill **does not** give an AI browser access, shell access, extra models, subscriptions, or permission to read your files. JRHagents never claims a tool ran unless there is evidence.

## Install from GitHub (native Agent Skills)

Requirements: an Agent Skills-compatible AI coding client, Node.js and an internet connection.

```bash
npx skills add Jidy23/JRHagents --skill jrhagents
```

The installer will ask where to install. For use across supported projects/agents, choose the appropriate global location. You may see a prompt to approve installation. [Supported flags and sources](https://github.com/vercel-labs/skills/blob/main/docs/commands.md).

**No terminal / chat-only AI?** Open [UNIVERSAL_PROMPT.md](UNIVERSAL_PROMPT.md), copy its content into your AI's instructions or conversation. This is a **prompt fallback**, not an automatically loaded native skill. Some apps let you upload `SKILL.md` as knowledge/instructions; follow each app's current instructions.

## Use it in plain language

```
JRHagents, bedah ide usaha ini dan pilih prioritas pertama.
JRHagents, rapikan UI website ini tanpa mengubah fiturnya.
JRHagents, audit repo dan laporkan temuan beserta buktinya.
JRHagents, susun outline skripsi dan bedakan data dari asumsi.
JRHagents, buat rencana untuk fitur login, lalu uji jika tool tersedia.
```

No slash commands to memorize; the host recognizes intent if it loads the skill. You can also explicitly ask it to read/activate **jrhagents**.

## What it actually does

1. Understand your goal, audience, and constraints.
2. Determine what this AI *really* can do (chat-only, files, tools, code, web).
3. Load only the applicable reference workflow, avoiding irrelevant instructions.
4. Produce the requested answer or work using available and authorized tools.
5. Check outcomes, make uncertainty visible, and finish with **one next action**.

**26 capabilities** are coordinated workflows and quality practices—not 26 separate third-party products. See [the capability map](skills/jrhagents/references/CAPABILITIES.md). The original 10 open-source concepts are acknowledged as **inspiration**, not bundled dependencies. No API key is needed to read the skill.

## Platform pathways

| Your AI | Recommended way | What you get |
| --- | --- | --- |
| Claude Code, Codex, Gemini CLI, Cursor, Copilot and other compatible agent runtimes | `npx skills add Jidy23/JRHagents --skill jrhagents` | Native skill **where supported by that client and version** |
| Gemini CLI (alternative) | `gemini skills install https://github.com/Jidy23/JRHagents` | Native Gemini CLI installation if supported by your version |
| ChatGPT, Claude web, general chatbots without compatible skill discovery | Copy [universal instructions](UNIVERSAL_PROMPT.md) | Portable instructions; actual tools depend on that service |
| Your custom agent app | Read `skills/jrhagents/SKILL.md` + requested references | Adapter integration owned by your app |

[Full installation & troubleshooting](docs/INSTALL.md) · [Platform compatibility](docs/COMPATIBILITY.md) · [Simple web guide](https://jidy23.github.io/JRHagents/)

## Folder structure

```text
skills/jrhagents/
  SKILL.md                 # single canonical Agent Skill
  references/              # concise specialist playbooks, read on demand
  assets/                  # report/plan templates
  scripts/project_scan.py  # optional, read-only scan for shell-enabled hosts
UNIVERSAL_PROMPT.md        # chat-only fallback
README.md                  # user-facing onboarding
docs/                      # documentation, NOT an AI web app
tests/                     # portable offline quality checks
```

**Portability limit:** "for any AI platform" means *best-effort portable guidance*, not every platform has native installation. JRHagents cannot create integrations the host does not support. It will give a manual fallback instead of pretending a plugin exists.

## Verify locally (optional, for maintainers)

```bash
python -m unittest discover -s tests -v
python skills/jrhagents/scripts/project_scan.py --path .
```

The scanner is an **optional bounded heuristic**, not a security certification. It runs read-only. Tests have no third-party dependencies.

## License and contribution

MIT. See [LICENSE](LICENSE), [CONTRIBUTING.md](CONTRIBUTING.md), and [SECURITY.md](SECURITY.md). Prior dashboard/MCP/plugin experiments remain accessible in Git history; **this repository's primary product is one skill**.
