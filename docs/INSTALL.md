# Cara memakai JRHagents — pilih aplikasi AI dulu

**JRHagents adalah satu Agent Skill berisi instruksi kerja, bukan API.** Tidak membutuhkan alamat server publik, endpoint, ataupun API key JRHagents.

Buka [panduan interaktif](https://jidy23.github.io/JRHagents/#mulai), pilih tempat kamu memakai AI, dan ikuti instruksi yang cocok.

## A. ChatGPT, Claude web, Gemini web atau chatbot tanpa Terminal

1. Pilih **Chatbot biasa** pada website.
2. Tekan **Salin instruksi lengkap**. Ini adalah isi instruksi universal dari [`UNIVERSAL_PROMPT.md`](../UNIVERSAL_PROMPT.md), bukan contoh singkat.
3. Tempel ke percakapan atau fitur custom instructions yang benar-benar disediakan aplikasimu, lalu kirim tugas yang ingin dikerjakan.

**Tidak perlu API, Python, Node.js, ZIP atau `npx`.** Jika sebuah aplikasi menunjukkan `create_skill` yang meminta **Base URL API, endpoint, API key**, itu adalah fitur pembuatan *alat/API integration*, bukan pemasangan instruksi JRHagents. Jangan mengisi URL palsu; gunakan metode pesan atau instruksi manual.

Chatbot tidak mendapatkan akses GitHub, browser, file, atau terminal baru dari instruksi saja. Jika platform memiliki fitur skill native tersendiri, gunakan dokumentasinya untuk instalasi yang sesuai.

## B. Codex, Claude Code, Cursor, Gemini CLI dan AI coding lain yang mendukung Agent Skills

Jika kamu **punya Terminal komputer**, Node.js dan koneksi internet, jalankan:

```sh
npx skills add Jidy23/JRHagents --skill jrhagents
```

Installer akan memandu pilihan aplikasi yang didukung. Setelah terpasang, buka AI coding dan beri tugas biasa, misalnya: `JRHagents, audit kode ini. Laporkan bagian yang benar-benar diperiksa.`

**Jangan tempel perintah `npx` ke aplikasi yang tidak punya Terminal.** Jika tidak punya shell, kembali ke cara A. Tidak semua versi aplikasi AI coding mendukung native Agent Skills.

## Contoh instruksi

- `JRHagents, perbaiki UI mobile website saya, jaga fungsi yang sudah bekerja, lalu laporkan tes yang benar-benar dijalankan.`
- `JRHagents, teliti data ini dan jelaskan keterbatasan analisisnya.`
- `JRHagents, bantu membuat proposal usaha sederhana dan pilih satu langkah validasi.`

Instruksi di atas diproses oleh **AI yang kamu gunakan**, bukan oleh GitHub Pages. Skill open source gratis (MIT); platform AI dapat memiliki biaya dan batasannya sendiri.

## Jika terjadi masalah

- **“App ini gak punya shell”** → pilih Chatbot biasa; jangan jalankan `npx`.
- **“create_skill butuh API URL”** → gunakan instruksi manual, bukan pembuatan API skill.
- **“npx not found”** → Node.js belum tersedia pada Terminal komputer. [Panduan Node.js](https://nodejs.org/en/download).
- **Skill tidak ditemukan AI coding** → periksa versi/dukungan native Skill dan lokasi pemasangan.
- **Salin otomatis gagal** → tekan “Lihat instruksi penuh”, pilih teks, lalu salin manual.

[Status kompatibilitas](COMPATIBILITY.md) · [Sumber GitHub](https://github.com/Jidy23/JRHagents) · [Laporkan kendala](https://github.com/Jidy23/JRHagents/issues)
