# Kompatibilitas JRHagents

| Tempat menggunakan AI | Cara yang sesuai | Terminal dibutuhkan? | Status |
| --- | --- | --- | --- |
| ChatGPT web/app | Tempel instruksi universal ke chat/instruksi khusus yang disediakan | Tidak | Fallback instruksi manual |
| Claude web/app | Tempel instruksi universal ke chat/instruksi khusus yang disediakan | Tidak | Fallback instruksi manual |
| Gemini web/app | Tempel instruksi universal ke chat/instruksi khusus yang disediakan | Tidak | Fallback instruksi manual |
| Chatbot lain | Tempel instruksi universal jika fitur instruksi/chat tersedia | Tidak | Best effort |
| Codex, Claude Code, Cursor, Gemini CLI, Copilot dan AI coding yang mendukung Agent Skills | `npx skills add Jidy23/JRHagents --skill jrhagents` pada Terminal komputer | Ya | Bergantung versi dan dukungan host |

**Tidak ada klaim bahwa semua platform memiliki instalasi native.** JRHagents tidak menyediakan API, endpoint, model AI, akses tool, atau server MCP publik. Jika AI hanya punya fitur `create_skill` untuk menambahkan API, itu bukan metode yang cocok untuk Skill instruksional ini.

Standar rujukan: https://agentskills.io/specification. Installer: https://github.com/vercel-labs/skills.
