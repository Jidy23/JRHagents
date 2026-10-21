# Kompatibilitas: jujur, tidak mengarang dukungan

| Kategori | Contoh | Metode | Catatan |
|---|---|---|---|
| Native Agent Skills | Codex, Claude Code, Gemini CLI, Cursor, Copilot dan agen lain yang mendukung standar ini | `npx skills add Jidy23/JRHagents --skill jrhagents` atau instalasi bawaan | Versi, path, izin dan aktivasi berbeda; pengujian aktual dilakukan oleh pengguna di host |
| Instruksi manual | ChatGPT web, Claude web, chatbot umum | Salin `UNIVERSAL_PROMPT.md` | Tidak otomatis menjadi tool/skill runtime |
| Agent buatan sendiri | Aplikasi LLM kustom | Load `SKILL.md` dan referensi sebagai context secara kondisional | Developer harus mengimplementasikan loader, permissions, tools dan audit |

**Tidak didukung secara universal:** pemasangan otomatis lewat GitHub pada semua aplikasi AI, plugin ChatGPT melalui repo ini, server MCP global, penyimpanan memori lintas aplikasi, atau kemampuan AI baru. Skill tidak memodifikasi aturan keamanan platform induk.

Referensi standar:
- https://agentskills.io/specification
- https://github.com/vercel-labs/skills/blob/main/docs/commands.md
- https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills
- https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/creating-skills.md
