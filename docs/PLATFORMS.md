# Platform & jalur instalasi JRHagents

JRHagents adalah satu *repositori sumber* dengan tiga **format distribusi yang berbeda**: Agent Skill, Plugin Claude Code, dan MCP stdio lokal. Tidak ada janji satu plugin native untuk semua aplikasi AI.

## Skill (jalur utama)

Jalankan `npx skills add https://github.com/Jidy23/JRHagents/tree/main/skills/jrhagents`, pilih target AI coding, dan izinkan pemasangan. Klien yang memiliki pengenal installer resmi: `codex`, `claude-code`, `gemini-cli`, `cursor`, `github-copilot`, `opencode`, `windsurf`. Daftar dapat bertambah/berubah mengikuti versi [skills CLI](https://github.com/vercel-labs/skills/blob/main/docs/agents.md).

Skill tidak membutuhkan Python; pengguna hanya perlu Node.js untuk menjalankan installer. Setelah skill dipasang, kemampuan yang benar-benar bisa dijalankan tetap mengikuti tool dan izin masing-masing AI coding.

## Plugin

Claude Code: `/plugin marketplace add Jidy23/JRHagents`, lalu `/plugin install jrhagents@jrhagents`. Ini bukan perintah terminal biasa. Manifest `.claude-plugin/` sudah tersedia; sukses aktivasi harus dicek di Claude Code, tidak disimpulkan dari keberadaan file di GitHub.

## MCP lokal

Server `jrhagents-mcp` berjalan pada komputer pengguna dengan Python 3.9+, terhubung menggunakan transport stdio. Setup otomatis yang tersedia dalam CLI: Claude Code, Cursor, Gemini CLI, GitHub Copilot, dan VS Code. Server menyediakan lima tool baca proyek saja. Tanpa server yang berjalan, memasang Skill tidak otomatis mengaktifkan MCP.

## MCP jarak jauh

**Belum tersedia.** GitHub Pages adalah layanan berkas statis; tidak dapat menjalankan server MCP Streamable HTTP sendiri. Deploy server HTTPS membutuhkan infrastruktur terpisah, keamanan, pembatasan penggunaan, dan desain autentikasi. Jangan pernah meminta pengguna memasukkan token ke website statis.

## Audit browser

Tidak butuh instalasi. Pemrosesan hanya dalam browser (ukuran/jenis berkas dibatasi), tidak menjamin bebas kerentanan. Alat ini tidak tersambung ke repo privat, API AI, atau komputer pengguna tanpa pilihan file pengguna.
