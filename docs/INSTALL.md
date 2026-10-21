# Pasang JRHagents langsung dari GitHub

**Mulai dari Skill.** Tidak perlu mengunduh ZIP, membuat akun JRHagents, menyiapkan Python, atau memasang server MCP untuk mendapatkan instruksi kerja JRHagents di AI coding.

## Jalur paling mudah: Skill

**Syarat:** AI coding yang mendukung Agent Skills, Node.js/npm (untuk `npx`) dan internet. Masuk ke Terminal / PowerShell, lalu jalankan:

```bash
npx skills add Jidy23/JRHagents --skill jrhagents
```

Installer akan menemukan skill dalam repositori GitHub dan menanyakan aplikasi AI serta cakupan pemasangan. Periksa nama sumber sebelum mengizinkan pemasangan.

**Kalau sudah tahu aplikasi:** pemasangan untuk semua proyek milik pengguna, contoh Codex:

```bash
npx skills add Jidy23/JRHagents --skill jrhagents -a codex -g
```

Ganti `codex` dengan salah satu pengenal resmi berikut bila kamu menggunakan aplikasi tersebut: `claude-code`, `gemini-cli`, `cursor`, `github-copilot`, `opencode`, `windsurf`. Untuk memasang hanya di folder proyek saat ini, hilangkan `-g` dan jalankan perintah dari folder proyek. Pengenal lain dan mekanisme dukungan dapat berubah mengikuti versi installer; lihat [daftar klien resmi](https://github.com/vercel-labs/skills/blob/main/docs/agents.md).

Setelah instalasi, buka atau mulai ulang sesi AI coding lalu tulis:

> JRHagents, audit proyek ini dan tunjukkan buktinya. Jangan mengubah kode sebelum saya menyetujui.

Skill memberikan instruksi kepada AI coding yang *sudah kamu gunakan*. Skill tidak membawa model AI, API berbayar, hak akses GitHub, atau kemampuan browser sendiri. Pekerjaan yang bisa dijalankan bergantung pada alat, izin, dan model dalam aplikasi AI tersebut.

### Jika `npx` tidak ditemukan

Pasang [Node.js LTS](https://nodejs.org/en/download), buka Terminal baru, lalu cek `node --version`. Setelah itu ulangi perintah instalasi Skill di atas. Windows/macOS/Linux menggunakan sintaks `npx` yang sama.

### Update Skill

```bash
npx skills check
npx skills update jrhagents
```

Baca dokumentasi [Skills CLI](https://github.com/vercel-labs/skills/blob/main/docs/commands.md) untuk perintah versi yang kamu pakai.

## Untuk Claude Code: Plugin langsung dari GitHub

**Tidak memerlukan ZIP manual.** Di dalam antarmuka perintah Claude Code (bukan shell biasa) ketik dua perintah:

```text
/plugin marketplace add Jidy23/JRHagents
/plugin install jrhagents@jrhagents
```

Paket repositori menyediakan `.claude-plugin/marketplace.json` dan `.claude-plugin/plugin.json`. Instalasi tetap membutuhkan Claude Code yang mendukung marketplace, koneksi internet, dan izin pengguna. Setelah dipasang, periksa plugin yang aktif dalam aplikasi. Plugin ini berisi instruksi dan alur kerja, bukan server cloud AI mandiri.

## Kalau butuh 5 tool lokal: MCP (opsional)

MCP JRHagents saat ini berupa **server lokal berbasis Python**, bukan URL publik. Fitur sebenarnya: `jrh_doctor`, `jrh_audit`, `jrh_route`, `jrh_plan`, `jrh_status`. Kelimanya bersifat **read-only**: tidak membangun aplikasi, menghapus file, atau mendeploy cloud.

Syarat: Python 3.9+, akses GitHub, aplikasi AI yang mendukung MCP. Buka Terminal dalam folder proyek.

### Windows PowerShell

```powershell
py -m venv .jrh-venv
.\.jrh-venv\Scripts\python.exe -m pip install "https://github.com/Jidy23/JRHagents/archive/refs/heads/main.zip"
.\.jrh-venv\Scripts\python.exe -m jrhagents setup --mode mcp --client cursor --project .
```

### macOS / Linux

```bash
python3 -m venv .jrh-venv
./.jrh-venv/bin/python -m pip install "https://github.com/Jidy23/JRHagents/archive/refs/heads/main.zip"
./.jrh-venv/bin/python -m jrhagents setup --mode mcp --client cursor --project .
```

Ganti `cursor` dengan klien MCP yang didukung otomatis: `claude`, `gemini`, `copilot`, atau `vscode`. Setelah setup, restart AI coding dan periksa daftar tool MCP. Jika konfigurasi lain sudah ada, installer berusaha menjaga isinya dan menolak konflik; ia tidak menghubungkan MCP tanpa persetujuan aplikasi AI.

Untuk melihat rencana perubahan tanpa menulis konfigurasi, tambahkan `--dry-run` pada perintah `setup`.

### Jika MCP tidak berhasil

- **`No module named jrhagents`**: gunakan Python dari lingkungan `.jrh-venv`, bukan Python lain.
- **`py/python3 not found`**: instal Python versi 3.9+ dari [python.org](https://www.python.org/downloads/).
- **`No module named venv`**: pada Linux, pasang paket `python3-venv` sesuai distro.
- **`Existing configuration differs`**: cek MCP entry lama secara manual. Installer tidak akan menimpa konfigurasi yang berbeda.
- **`Server not visible`**: periksa restart, file konfigurasi, dan izin tool pada aplikasi AI.

## Tanpa instalasi sama sekali

Buka [Audit Cepat](https://jidy23.github.io/JRHagents/#coba), pilih beberapa berkas kode atau folder, dan unduh laporan indikasi masalah. Audit dilakukan di browser tanpa upload berkas atau API. Ini bukan pemeriksaan menyeluruh.

## Kompatibilitas yang jujur

| Cara | Dari GitHub tanpa unduh ZIP manual | Memerlukan alat lain | Status |
| --- | --- | --- | --- |
| Skill | Ya (`npx skills add`) | Node.js dan AI coding yang mendukung Skills | Siap dicoba |
| Claude Code Plugin | Ya (`/plugin marketplace add`) | Claude Code yang mendukung plugin | Manifest tersedia, verifikasi pada klien diperlukan |
| MCP lokal | Ya (pip mengunduh arsip GitHub otomatis) | Python, terminal, dan MCP host | Server lokal tersedia |
| MCP cloud URL | Belum | Hosting, autentikasi, dan server HTTPS | Belum tersedia |
| Audit browser | Tidak perlu pasang | Browser modern | Berfungsi secara lokal |

Sumber utama: [GitHub JRHagents](https://github.com/Jidy23/JRHagents). Untuk melaporkan kegagalan, gunakan [GitHub Issues](https://github.com/Jidy23/JRHagents/issues/new/choose) dan jangan kirim API key.
