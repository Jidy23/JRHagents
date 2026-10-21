# Dukungan platform (apa adanya)

JRHagents terdiri dari tiga hal yang tidak sama: **Skill** (instruksi AI coding), **MCP** (alat lokal), dan **Plugin** (paket untuk platform tertentu).

| Platform | Skill installer | MCP config otomatis | Plugin native |
|---|---:|---:|---|
| Codex | Ya | Belum, gunakan konfigurasi manual | Tergantung format plugin resmi |
| Claude Code | Ya | Ya (proyek `.mcp.json`) | Manifest Claude Code disediakan |
| Gemini CLI | Ya | Ya (proyek `.gemini/settings.json`) | Tidak disediakan |
| Cursor | Ya | Ya (proyek `.cursor/mcp.json`) | Tidak disediakan |
| GitHub Copilot | Ya | Ya (VS Code `.vscode/mcp.json`) | Tidak disediakan |
| OpenCode | Ya | Manual | Tidak disediakan |
| Windsurf | Ya | Manual | Tidak disediakan |
| VS Code | Melalui Copilot | Ya (`.vscode/mcp.json`) | Tidak disediakan |

Penulisan folder Skill hanya memastikan file hadir di folder standar yang diketahui. **Tidak membuktikan klien telah membaca/mengaktifkannya**. Pengguna perlu versi AI client yang mendukungnya, izin plugin/MCP, dan mungkin restart.

Python CLI dirancang untuk Windows, macOS, dan Linux. CI dijalankan otomatis pada Linux/Windows; pengujian macOS terpisah jika runner tersedia. Tidak mengklaim macOS telah diverifikasi bila runner dibatalkan.

JRHagents tidak menyediakan API model AI sendiri, tidak memproses file dari browser ke server, tidak menjalankan plugin pihak ketiga otomatis, dan tidak mengedit project melalui lima MCP tools read-only.
