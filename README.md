# JRHagents

**AI coding lebih terarah, tanpa instalasi ribet.** Satu sumber open-source untuk Skill, alat MCP lokal, dan Plugin Claude Code. Website berbahasa Indonesia membantu pemula memilih jalur yang cocok.

[**Buka panduan visual**](https://jidy23.github.io/JRHagents/#install) · [Coba Audit Cepat tanpa instalasi](https://jidy23.github.io/JRHagents/#coba) · [Dokumentasi lengkap](docs/INSTALL.md) · [Laporkan masalah](https://github.com/Jidy23/JRHagents/issues)

## Paling mudah — pasang Skill langsung dari GitHub

Punya Node.js dan AI coding yang mendukung Agent Skills? Jalankan:

```bash
npx skills add Jidy23/JRHagents --skill jrhagents
```

Installer akan meminta pilihan AI coding dan lokasi pemasangan. Untuk instalasi global ke Codex, misalnya:

```bash
npx skills add Jidy23/JRHagents --skill jrhagents -a codex -g
```

Setelah itu, dalam AI coding tulis:

> JRHagents, audit proyek ini, jelaskan tiga masalah terpenting, dan tunjukkan buktinya. Jangan mengubah file sebelum saya menyetujui.

**Apa yang dipasang?** Instruksi Skill, *bukan* model AI baru, penyedia API, atau aplikasi yang memerlukan akun tambahan. Skill menggunakan kemampuan nyata yang disediakan AI coding milik pengguna. Instalasi memerlukan internet dan runtime Node.js untuk `npx`.

## Pilihan lain, hanya jika dibutuhkan

| Ingin apa? | Cara | Prasyarat |
| --- | --- | --- |
| Audit beberapa file tanpa instalasi | [Audit Cepat](https://jidy23.github.io/JRHagents/#coba) | Browser modern |
| Skill untuk AI coding lain | `npx skills add Jidy23/JRHagents --skill jrhagents` | Node.js + klien Skills |
| Plugin Claude Code | `/plugin marketplace add Jidy23/JRHagents` lalu `/plugin install jrhagents@jrhagents` | Claude Code kompatibel |
| 5 alat MCP baca proyek | [Panduan MCP lokal](docs/INSTALL.md#kalau-butuh-5-tool-lokal-mcp-opsional) | Python 3.9+ + klien MCP |

Plugin dan MCP tidak perlu dipasang jika kamu hanya ingin Skill. ZIP di halaman Releases atau unduhan lama hanyalah opsi cadangan.

## Yang memang berfungsi

- **Audit Cepat browser:** memeriksa berkas kode secara lokal, menunjukkan indikasi masalah dan nomor baris, menyimpan hasil sebagai JSON. Tidak memproses data di server.
- **CLI Python:** `doctor`, `audit`, `plan`, `report`, `verify`. Dapat dipasang dari GitHub secara otomatis untuk pengguna yang membutuhkan tool lokal.
- **Skill:** alur kerja audit, riset, desain, rekayasa kode, dan verifikasi yang digunakan oleh AI coding yang kompatibel.
- **MCP stdio:** lima alat baca proyek (`jrh_doctor`, `jrh_audit`, `jrh_route`, `jrh_plan`, `jrh_status`).
- **Claude Plugin:** manifest marketplace dan paket instruksi, perlu aktivasi dan verifikasi dalam Claude Code.

**Yang belum ada:** server MCP HTTPS publik, model AI mandiri, otomatisasi cloud lintas akun, dan integrasi hidup ke sepuluh repositori sumber inspirasi. Angka “26 kemampuan” memuat fitur lokal, panduan skill, dan prinsip desain; tidak semuanya API eksekusi.

## Pengembangan

```bash
python -m pip install -e .
python -m unittest discover -s tests -v
node --test tests/*.test.cjs
node --check docs/assets/app.js
# Opsional (Chromium + Playwright):
python tests/browser_smoke.py
```

Repo ini memiliki MIT License. Lihat [kontribusi](CONTRIBUTING.md), [keamanan](SECURITY.md), dan [sumber ide](THIRD_PARTY.md). Jangan menjalankan tool pada repositori tidak tepercaya tanpa membaca kode serta izin yang diperlukan.
