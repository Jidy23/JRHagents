# JRHagents

**One skill. 66 useful workflows. Any language. Verifiable results.**

JRHagents is an open-source **Agent Skill**, not an AI model, SaaS dashboard, API gateway, MCP host, or universal plugin. It gives compatible AI assistants a reusable workflow for **thinking, research, writing, data, software, design, and quality checks**. Its instructions work with whatever capabilities the host already provides.

> [!IMPORTANT]
> Installing the skill **does not** give an AI browser access, shell access, extra models, subscriptions, or permission to read your files. JRHagents never claims a tool ran unless there is evidence.

## Mulai dari aplikasi AI yang kamu gunakan

**[Buka panduan interaktif JRHagents](https://jidy23.github.io/JRHagents/#mulai)** — pilih ChatGPT, Claude, Gemini, atau AI coding. Panduan otomatis menunjukkan cara yang relevan tanpa memaksakan Terminal.

Di halaman Mulai, pilih satu dari lima contoh tugas atau isi tujuan dan batasan sendiri. Teks ini hanya digunakan untuk instruksi yang disalin di browser dan tidak disimpan oleh situs.

### A. ChatGPT / Claude web / Gemini web — tanpa Terminal dan tanpa API

1. Di website, pilih **Chatbot biasa** dan nama aplikasinya.
2. Klik **Salin instruksi lengkap** (berasal dari [`UNIVERSAL_PROMPT.md`](UNIVERSAL_PROMPT.md)).
3. Tempel ke chat atau fitur instruksi khusus aplikasi yang tersedia. Kirim tugas dengan bahasa biasa.

**Tidak perlu `npx`, ZIP, Python, endpoint, Base URL, atau API key JRHagents.** Jika aplikasi menampilkan formulir `create_skill` yang meminta URL API, itu adalah integrasi API, bukan jalur memasang instruksi JRHagents. Gunakan pesan/instruksi manual. Ini bukan pemasangan native dan tidak menambah tool yang belum dimiliki aplikasi.

### B. AI coding yang mendukung Agent Skills — jika punya Terminal komputer

Jalankan pada **Terminal komputer** (bukan diketik di chat). Membutuhkan Node.js dan internet:

```bash
npx skills add Jidy23/JRHagents --skill jrhagents
```

Installer dapat meminta pilihan aplikasi dan izin. Native install bergantung versi/dukungan host; ini **bukan** cara menggunakan JRHagents dalam chatbot tanpa shell. Lihat [petunjuk instalasi](docs/INSTALL.md).

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

**66 capabilities** are coordinated workflows and quality practices—not 66 separate third-party products. See [the capability map](skills/jrhagents/references/CAPABILITIES.md). The original 10 open-source concepts are acknowledged as **inspiration**, not bundled dependencies. No API key is needed to read the skill.

The [workflow index](skills/jrhagents/workflow-index.json) exposes the 66 entries with stable IDs, references and optional host capabilities. Chat is the minimum; optional tools only help when the chosen AI actually provides them. For thesis and quantitative research, the [academic playbook](skills/jrhagents/references/ACADEMIC.md) covers theory, identification, diagnostics and interpretation.

For applications that want to execute reviewed workflows, the repository also
ships a small dependency-free [Agent Runtime contract](docs/AGENT-RUNTIME.md).
It provides explicit skill registration, fail-closed execution, step-scoped
approval, and audit events. It does not provide models, API keys, network
access, or external integrations; those must be injected by the host app.
The runtime also exposes a versioned JSON plan boundary for web, CLI, and MCP
adapters.

The first service adapter is a server-side GitHub adapter with read-only
repository/PR operations and an approval-required PR merge operation. See
[`adapters/github/`](adapters/github/); credentials remain the host's secret,
never the Skill or browser.

Cloudflare Pages is supported by a separate server-side adapter for account,
project, and deployment inspection plus approval-required deploy, retry, and
rollback actions. See [`adapters/cloudflare/`](adapters/cloudflare/).

Supabase is supported by an allowlisted server-side table adapter with
read-only selects by default and approval-required insert/update operations.
It does not expose arbitrary SQL, delete, or auth-admin actions. See
[`adapters/supabase/`](adapters/supabase/).

MCP is supported through an injected JSON-RPC client boundary with discovery,
tool listing, and approval-gated tool calls. See [`adapters/mcp/`](adapters/mcp/).

The unified host runtime composes these adapters into one workflow surface with
an optional skill allowlist and per-step approval. See [`adapters/host/`](adapters/host/).
It also supports explicit low-risk retries and cooperative cancellation with
preserved lifecycle events.

The goal planner boundary converts an injected natural-language proposal into
a validated plan for review; it never executes tools by itself. See
[`adapters/planner/`](adapters/planner/).
Planner approvals are bound to the plan ID and content fingerprint before
execution.

The audit run store records bounded, redacted execution history. Use the
in-memory store for ephemeral runs or `createFileAuditStore` for a host-owned
JSON file with serialized writes and atomic replacement. See
[`adapters/audit/`](adapters/audit/).

The idempotency boundary prevents a client retry from executing the same
successful action twice. It supports bounded in-memory or host-owned JSON file
storage; expiry and tenant scoping remain host responsibilities. See
[`adapters/idempotency/`](adapters/idempotency/).

## Optional quality workflow for a source checkout

Run the local checks from a trusted checkout with:

```bash
python tools/verify_project.py
```

The command reports observed check results and reviewable suggestions when a
check fails or cannot run. It does not check browser interactions or live
services. A local project-memory store is separately opt-in; no conversation
or project data is saved automatically. The configuration auditor is a
limited, read-only heuristic, not a comprehensive security scan. See the
[quality workflow guide](docs/QUALITY_WORKFLOW.md) for commands, consent,
privacy, and scope.

These Python runtime modules and tools are **not included** in the standalone
Skill or plugin package. The portable Skill follows the same evidence-first
practice using only the host's actual tools.

## Platform pathways

| Your AI | Recommended way | What you get |
| --- | --- | --- |
| Claude Code, Codex, Gemini CLI, Cursor, Copilot and other compatible agent runtimes | `npx skills add Jidy23/JRHagents --skill jrhagents` | Native skill **where supported by that client and version** |
| Gemini CLI (alternative) | `gemini skills install https://github.com/Jidy23/JRHagents` | Native Gemini CLI installation if supported by your version |
| ChatGPT, Claude web, general chatbots without compatible skill discovery | Copy [universal instructions](UNIVERSAL_PROMPT.md) | Portable instructions; actual tools depend on that service |
| Your custom agent app | Read `skills/jrhagents/SKILL.md` + requested references | Adapter integration owned by your app |

[Full installation & troubleshooting](docs/INSTALL.md) · [Platform compatibility](docs/COMPATIBILITY.md) · [Interactive web guide](https://jidy23.github.io/JRHagents/)

## Folder structure

```text
skills/jrhagents/
  SKILL.md                 # single canonical Agent Skill
  references/              # concise specialist playbooks, read on demand
  assets/                  # report/plan templates
  scripts/project_scan.py  # optional, read-only scan for shell-enabled hosts
runtime/                    # optional host-agnostic execution primitives
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

To build an offline portable Skill archive, run `python tools/package_release.py`. The archive is reproducible and contains only the Skill folder. See [release process](docs/RELEASE_PROCESS.md).

The scanner is an **optional bounded heuristic**, not a security certification. It runs read-only. Tests have no third-party dependencies.

## License and contribution

MIT. See [LICENSE](LICENSE), [CONTRIBUTING.md](CONTRIBUTING.md), and [SECURITY.md](SECURITY.md). Prior dashboard/MCP/plugin experiments remain accessible in Git history; **this repository's primary product is one skill**.

## Interactive web guide

The [public documentation website](https://jidy23.github.io/JRHagents/) offers a beginner-friendly installation path, a local-only task-instruction builder, a searchable 66-workflow grid, and accessibility-aware CSS visuals. The website does **not** execute AI tasks or install software from your browser. See [V33 release notes](docs/V33-RELEASE.md).

## 66 practical workflows / 66 kemampuan

There are **66 scoped workflow instructions across 11 life and work categories**: productivity, learning, career, personal finance, wellbeing, communication, research, business, engineering, design and digital safety. The Skill does not grant a host new permissions or provide medical advice, market quotes, or external integrations. See [the numbered list](skills/jrhagents/references/CAPABILITIES.md) and [interactive directory](https://jidy23.github.io/JRHagents/).

For ChatGPT/Claude/Gemini web users without a terminal, the website provides **copy-ready full instructions**, not `npx` commands. Blurred preview content is only a visual effect; it is not a security measure.

## Support JRHagents (voluntary)

JRHagents remains free. The compact **heart icon immediately beside the language toggle** offers an optional QRIS appreciation or a path to contribute code. The recipient shown on the operator-provided QRIS is **KOPDES NUSANTARA**, not JRHagents: always verify the recipient before paying. No donation required, no payment detection, and no user tracking. [More information](docs/SUPPORT.md).

## 66 recommendations for improvement

Read the evidence-based [audit and prioritized 66-item roadmap](docs/AUDIT-ROADMAP-66.md). The root `jidy23.github.io` and the project path `jidy23.github.io/JRHagents/` are different URLs; use the project path for this site.
