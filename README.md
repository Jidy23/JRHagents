# JRHagents

**One skill. Many AI platforms. Clearer work, verifiable results.**

JRHagents is an open-source **Agent Skill**, not an AI model, SaaS dashboard, API gateway, MCP host, or universal plugin. It gives compatible AI assistants a reusable workflow for **thinking, research, writing, data, software, design, and quality checks**. Its instructions work with whatever capabilities the host already provides.

> [!IMPORTANT]
> Installing the skill **does not** give an AI browser access, shell access, extra models, subscriptions, or permission to read your files. JRHagents never claims a tool ran unless there is evidence.

## Mulai dari aplikasi AI yang kamu gunakan

**[Buka panduan interaktif JRHagents](https://jidy23.github.io/JRHagents/#mulai)** — pilih ChatGPT, Claude, Gemini, atau AI coding. Panduan otomatis menunjukkan cara yang relevan tanpa memaksakan Terminal.

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

**26 capabilities** are coordinated workflows and quality practices—not 26 separate third-party products. See [the capability map](skills/jrhagents/references/CAPABILITIES.md). The original 10 open-source concepts are acknowledged as **inspiration**, not bundled dependencies. No API key is needed to read the skill.

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

## Interactive web guide

The [public documentation website](https://jidy23.github.io/JRHagents/) offers a beginner-friendly installation path, a local-only task-instruction builder, a searchable 26-capability index, and accessibility-aware CSS visuals. The website does **not** execute AI tasks or install software from your browser. See [V24 release notes](docs/V24-RELEASE.md).
