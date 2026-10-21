# Cara pasang JRHagents — bahasa sederhana

**Kalau cuma ingin mencoba, tidak perlu pasang apa pun.** Buka [Audit Cepat di website](https://jidy23.github.io/JRHagents/#coba), pilih berkas, dan lihat hasil. Data tidak dikirim ke server.

Kalau hanya butuh Skill, unduh [Skill ZIP](https://jidy23.github.io/JRHagents/downloads/JRHagents-Skill.zip) dan impor manual ke aplikasi AI coding yang mendukung Skill. Tidak perlu Python untuk **membaca instruksi Skill**, tetapi beberapa klien butuh penempatan folder sesuai petunjuk mereka.

Untuk MCP atau instalasi otomatis Skill melalui CLI, ikuti ini:

## 1. Siapkan Python

Unduh Python 3.9 atau lebih baru dari https://www.python.org/downloads/. Buka terminal di folder **proyek kamu sendiri**, bukan folder JRHagents.

- Windows: PowerShell → `py --version`
- macOS / Linux: Terminal → `python3 --version`

Jika Python belum dikenali, install Python dan buka terminal baru. Jangan menyalin perintah instalasi yang belum kamu baca dari sumber tidak resmi.

## 2. Pasang toolkit dari GitHub

Perintah berikut membuat lingkungan khusus dalam proyek sehingga tidak mengganggu Python lain. **Jalankan satu baris setiap kali.**

### Windows PowerShell

```powershell
py -m venv .jrh-venv
.\.jrh-venv\Scripts\python.exe -m pip install "https://github.com/Jidy23/JRHagents/archive/refs/heads/main.zip"
.\.jrh-venv\Scripts\python.exe -m jrhagents --version
```

### macOS / Linux

```bash
python3 -m venv .jrh-venv
./.jrh-venv/bin/python -m pip install "https://github.com/Jidy23/JRHagents/archive/refs/heads/main.zip"
./.jrh-venv/bin/python -m jrhagents --version
```

Pemasangan membutuhkan internet dan akses GitHub. Jika unduhan gagal, cek koneksi atau unduh ZIP dari halaman repo, ekstrak, lalu jalankan `python -m pip install /lokasi/folder-hasil-ekstrak` menggunakan Python dari `.jrh-venv`.

## 3. Pilih mode

### Skill — paling mudah

Pilih **satu** aplikasi yang benar-benar kamu gunakan: `codex`, `claude`, `gemini`, `cursor`, `copilot`, `opencode`, atau `windsurf`.

```bash
# Contoh dengan Python di venv yang telah dibuat:
./.jrh-venv/bin/python -m jrhagents setup --mode skill --client cursor --project .
```

Windows: ganti awal perintah dengan `.\.jrh-venv\Scripts\python.exe`.

Restart aplikasi AI. Skill memberi instruksi; AI coding tetap perlu model, izin, dan tool yang tersedia pada aplikasinya.

### MCP — 5 alat pemeriksaan lokal

```bash
./.jrh-venv/bin/python -m jrhagents setup --mode mcp --client cursor --project .
```

Pilihan yang bisa dikonfigurasi otomatis: `claude`, `cursor`, `gemini`, `copilot`, `vscode`. Konfigurasi lama dipertahankan; jika terjadi konflik, program berhenti dan menjelaskan langkah manual. MCP server berisi `jrh_doctor`, `jrh_audit`, `jrh_route`, `jrh_plan`, dan `jrh_status`. Tidak bisa mengirim email, memasang plugin lain, atau mengedit kode.

Untuk melihat perubahan tanpa menulis: tambahkan `--dry-run`. Setelah install, restart aplikasi AI dan periksa daftar server MCP.

### Plugin — hanya untuk klien yang kompatibel

Manifest Claude Code tersedia di `.claude-plugin/plugin.json` dalam repositori. Plugin berbeda dari paket Python dan Skill. Gunakan fitur plugin resmi Claude Code. Jika klien AI-mu tidak mendukung format plugin itu, gunakan mode Skill atau MCP.

## Contoh fungsi nyata

```bash
./.jrh-venv/bin/python -m jrhagents doctor --project .
./.jrh-venv/bin/python -m jrhagents audit --project .
./.jrh-venv/bin/python -m jrhagents plan "rapikan navigasi website" --project .
./.jrh-venv/bin/python -m jrhagents report --project .
```

## Jika error

- **`No module named jrhagents`** → gunakan Python dari `.jrh-venv`, bukan Python lain.
- **`No module named venv`** (sebagian distro Linux) → pasang modul `python3-venv` dari pengelola paket sistem.
- **`Access denied`** → pilih folder proyek milikmu sendiri; jangan menjalankan sebagai administrator tanpa alasan.
- **`No internet / SSL error`** → periksa koneksi dan akses domain GitHub; hindari mematikan verifikasi SSL.
- **`Existing skill`** → gunakan `--dry-run`; bila ingin upgrade, `--upgrade` membuat backup skill.
- **`Existing jrhagents MCP entry differs`** → buka pengaturan MCP dan periksa secara manual. Program sengaja tidak menimpa pengaturan tersebut.
- **Tidak muncul di AI coding** → restart aplikasinya, periksa versi dan lokasi Skill/MCP yang didukung; setiap vendor bisa mengubah lokasi standar.
- **macOS gagal venv / externally managed** → gunakan Python dari instalasi resmi / Homebrew dan lingkungan virtual. Jangan paksa global pip.

[Open issue](https://github.com/Jidy23/JRHagents/issues/new/choose) jika masih gagal; sertakan sistem operasi, versi Python, perintah, dan pesan error, **tanpa API key**.
