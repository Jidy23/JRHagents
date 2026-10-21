# JRHagents

**Periksa proyek. Pasang Skill atau MCP. Lihat hasil sebenarnya.**

[Website interaktif](https://jidy23.github.io/JRHagents/) · [Panduan pemasangan](docs/INSTALL.md) · [Laporan tes](docs/TEST_REPORT.md) · [Laporkan bug](https://github.com/Jidy23/JRHagents/issues)

JRHagents adalah toolkit gratis dan open source untuk pemula, pengembang solo, dan pengguna AI coding. **Tidak memerlukan akun untuk Audit Cepat di browser.** Di komputer, paket Python menyediakan CLI lokal, installer Skill, serta server MCP read-only. Website statis **tidak** menjalankan AI sendiri atau mengakses proyek GitHub tanpa izin.

## Mulai tanpa instalasi

Buka **[JRHagents Pages](https://jidy23.github.io/JRHagents/#coba)**, pilih beberapa file kode atau folder, lalu lihat pola masalah dan unduh laporan JSON. Semuanya berlangsung di browser. Dukungan: JS/TS/Python/HTML/CSS/JSON dan berkas teks. Ini pemeriksaan awal berbasis pola, bukan pemindai keamanan menyeluruh.

## Download satu klik (opsional)

- [Skill ZIP](https://jidy23.github.io/JRHagents/downloads/JRHagents-Skill.zip) — berkas `SKILL.md` + referensi untuk impor manual ke AI coding kompatibel, **tanpa Python**. Aplikasi AI harus mendukung penggunaan skill dari berkas.
- [Claude Code Plugin ZIP](https://jidy23.github.io/JRHagents/downloads/JRHagents-Claude-Plugin.zip) — sumber plugin berformat Claude Code, bukan installer otomatis semua platform.
- [Wheel Python offline](https://jidy23.github.io/JRHagents/downloads/jrhagents-19.0.0-py3-none-any.whl) — jalankan `python -m pip install /lokasi/file.whl` dalam virtual environment bila Python tersedia. MCP membutuhkan paket Python ini.

## Pasang Skill ke AI coding (Windows, macOS, Linux)

Buka Terminal **di folder proyek yang ingin dipakai**. Pastikan Python **3.9+** sudah terpasang. Salin berurutan:

### Windows PowerShell

```powershell
py -m venv .jrh-venv
.\.jrh-venv\Scripts\python.exe -m pip install "https://github.com/Jidy23/JRHagents/archive/refs/heads/main.zip"
.\.jrh-venv\Scripts\python.exe -m jrhagents setup --client codex --project .
.\.jrh-venv\Scripts\python.exe -m jrhagents --version
```

### macOS / Linux

```bash
python3 -m venv .jrh-venv
./.jrh-venv/bin/python -m pip install "https://github.com/Jidy23/JRHagents/archive/refs/heads/main.zip"
./.jrh-venv/bin/python -m jrhagents setup --client codex --project .
./.jrh-venv/bin/python -m jrhagents --version
```

Ganti `codex` dengan `claude`, `gemini`, `cursor`, `copilot`, `opencode`, atau `windsurf`. Mulai ulang klien AI. Perintah ini menggunakan **arsip source GitHub**, bukan nama paket di PyPI. Jika proyek memiliki folder `.jrh-venv`, jangan commit folder tersebut.

Untuk menghubungkan MCP ke Cursor (contoh):

```bash
./.jrh-venv/bin/python -m jrhagents setup --mode mcp --client cursor --project .
```

Di Windows, gunakan `.\.jrh-venv\Scripts\python.exe` sebagai pengganti `./.jrh-venv/bin/python`. MCP otomatis mendukung **Claude Code, Cursor, Gemini CLI, GitHub Copilot, dan VS Code**. Pemasangan MCP menggabungkan konfigurasi tanpa menghapus koneksi lain, membuat cadangan jika ada perubahan, dan menolak menimpa entri `jrhagents` yang berbeda.

## Yang benar-benar bisa digunakan

| Komponen | Status | Batasan |
|---|---|---|
| Audit Cepat website | Berfungsi di browser | Pemeriksaan pola statis; tidak membaca ZIP |
| CLI: doctor, audit, plan, report, verify | Berfungsi lokal | Test/build hanya dengan flag eksplisit |
| Skill untuk 7 AI coding | Installer lokal | Aplikasi AI masing-masing harus mendukung Skills |
| MCP stdio server | 5 alat read-only | Tidak memodifikasi kode atau mendeploy |
| MCP setup otomatis | 5 klien | Perlu aplikasi kompatibel dan restart |
| Agent Plugin | Paket struktur Claude Code | Perlu impor melalui fitur plugin sesuai versi klien |
| Akses AI cloud / BYOK | Belum termasuk | Tidak ada klaim AI mandiri |
| Integrasi 10 repo inspirasi | Referensi | Tidak disalin atau dipasang otomatis |

## Pengembangan & tes

```bash
python -m pip install -e .
python -m unittest discover -s tests -v
node --test tests/*.test.cjs
node --check docs/assets/app.js
# Optional: browser smoke (requires Playwright + Chromium)
python tests/browser_smoke.py
```

Tidak diperlukan API key untuk menjalankan tes. Pelaporan error yang tidak dapat diverifikasi harus dinyatakan sebagai *belum diuji*.

## Struktur penting

- `docs/index.html` dan `docs/assets/` — Pages, audit browser, pemasangan interaktif.
- `jrhagents/` — CLI Python, analisis lokal, installer, konfigurasi MCP.
- `skills/jrhagents/` dan `SKILL.md` — format Skill standar.
- `.claude-plugin/` — manifest plugin Claude Code.
- `tests/` dan `.github/workflows/` — tes dan otomatisasi CI.

[33 perbaikan konkret](docs/33-IMPROVEMENTS.md) · [Platform dan batasan](docs/PLATFORMS.md) · [Keamanan](SECURITY.md) · [Lisensi MIT](LICENSE).
