# Menghubungkan MCP JRHagents

MCP adalah cara aplikasi AI yang kompatibel memanggil alat yang kamu izinkan. JRHagents memiliki **5 tool nyata yang hanya membaca data proyek**: `jrh_doctor`, `jrh_audit`, `jrh_route`, `jrh_plan`, dan `jrh_status`.

## Cara termudah: setup otomatis

Setelah menginstal paket Python [sesuai panduan](INSTALL.md), buka terminal **di folder proyek**. Contoh untuk Cursor:

```bash
./.jrh-venv/bin/python -m jrhagents setup --mode mcp --client cursor --project .
```

Windows: gunakan `.\.jrh-venv\Scripts\python.exe`.

Opsi client: `claude`, `cursor`, `gemini`, `copilot`, `vscode`. JRHagents akan membuat/menambah pengaturan sesuai format client, mempertahankan pengaturan lain, melakukan backup bila berkas sebelumnya ada, dan tidak mengganti entri `jrhagents` yang berbeda.

Periksa dulu tanpa menulis:

```bash
./.jrh-venv/bin/python -m jrhagents setup --mode mcp --client cursor --project . --dry-run
```

Restart aplikasi dan lihat apakah server JRHagents muncul. Jika tidak, cek log dan pengaturan MCP aplikasi terkait.

## Alternatif manual

```bash
./.jrh-venv/bin/python -m jrhagents mcp-config --client claude --project .
```

Salin JSON yang dihasilkan ke pengaturan klien yang sesuai. Untuk Codex dan platform lain yang memiliki format selain JSON, ikuti panduan MCP resmi platform tersebut. Jangan menempel JSON ke file konfigurasi tanpa memastikan struktur benar.

**Keamanan:** alat MCP tidak menjalankan kode proyek, tidak memodifikasi file, dan tidak mengirim data ke layanan eksternal. Server tetap berjalan dengan izin file akun komputer pengguna dan hanya diberi satu root proyek. Jangan hubungkan MCP dari repositori yang tidak kamu percayai.
