# JRHagents

**Satu skill. Satu perintah. Hasil yang bisa diperiksa.**

JRHagents adalah tool open-source yang membantu AI coding **mengaudit proyek, merencanakan fitur, merapikan UI/UX, dan memverifikasi hasil**. Gratis, lokal, dan tidak meminta API key.

**[Panduan visual interaktif](https://jidy23.github.io/JRHagents/)** *(aktif setelah GitHub Pages berhasil dideploy)* · [Instalasi](docs/INSTALL.md) · [26 kemampuan](modules/CAPABILITIES.md) · [Berkontribusi](CONTRIBUTING.md)

## Mulai dalam 3 langkah

**1. Download** — klik **Code → Download ZIP** atau [unduh paket resmi](https://github.com/Jidy23/JRHagents/archive/refs/heads/main.zip), lalu ekstrak.

**2. Install** — buka terminal **di folder JRHagents hasil ekstraksi**. Pilih **satu** klien AI yang kamu gunakan:

| AI coding | Salin perintah ini |
| --- | --- |
| **Codex** | `python scripts/jrhagents.py install --client codex --scope user` |
| **Claude Code** | `python scripts/jrhagents.py install --client claude --scope user` |
| **Gemini CLI** | `python scripts/jrhagents.py install --client gemini --scope user` |

Persyaratan: Python 3.9+. Di Windows, bila `python` tidak ada, ganti dengan `py`. Installer tidak menimpa skill yang sudah terpasang. Jika ingin memasang khusus untuk proyek, lihat [panduan instalasi](docs/INSTALL.md).

**3. Pakai** — buka ulang AI coding, kemudian tulis:

> **JRHagents, audit proyek ini, pilih masalah paling penting, perbaiki yang aman, dan tampilkan bukti pengujian.**

Tidak perlu menghafal slash command. Bila skill belum terdeteksi, minta AI membaca `SKILL.md` di lokasi instalasinya.

## Ingin memeriksa proyek tanpa AI coding?

```bash
python scripts/jrhagents.py start --project /path/to/your-project --task "audit proyek ini"
```

Hasilnya adalah **audit statis, rencana tindakan, dan laporan HTML + JSON** di folder `.jrhagents/` pada proyek tujuan. CLI tidak otomatis mengubah kode aplikasi atau menjalankan test/build milik proyek; opsi eksekusi harus disetujui secara eksplisit.

## Apa yang tersedia?

| Sudah berjalan | Belum disediakan otomatis |
| --- | --- |
| CLI lokal: doctor, audit, route, plan, start, verify, report | AI agent mandiri yang mengedit kode tanpa AI coding host |
| Installer Codex, Claude Code, Gemini CLI | Koneksi MCP / BYOK / API eksternal |
| Laporan offline HTML + JSON | Hosting SaaS atau deploy produksi |
| Dokumentasi interaktif, pencarian, generator perintah | 26 engine eksternal yang terpasang |

**Penting:** 26 kemampuan adalah **peta keterampilan dan alur kerja**; sepuluh proyek GitHub terkait adalah referensi desain, bukan dependensi yang dibundel atau integrasi siap pakai. Efektivitasnya bergantung pada tool dan izin nyata di AI coding yang kamu gunakan.

## Jalankan tes

```bash
python -m unittest discover -s tests -v
node --test tests/site.test.cjs
python -m http.server 8000 -d docs
```

Buka `http://localhost:8000` untuk melihat website dokumentasi. Node diperlukan untuk tes JavaScript saja, bukan untuk CLI utama. Pipeline GitHub Actions tercantum pada `.github/workflows/`.

MIT License · [Keamanan](SECURITY.md) · [Kontribusi](CONTRIBUTING.md) · [Atribusi pihak ketiga](THIRD_PARTY.md)

**Status:** GitHub repo tersedia. Situs GitHub Pages memiliki status publikasi terpisah; jangan menganggapnya aktif sebelum workflow deploy berhasil.
