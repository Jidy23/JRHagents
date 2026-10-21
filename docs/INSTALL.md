# Pasang JRHagents, tanpa bingung

## Jalur A — AI coding yang mendukung Agent Skills

Persiapan: kamu sudah punya AI coding yang kompatibel, **Node.js**, dan internet. Buka terminal dan jalankan:

```bash
npx skills add Jidy23/JRHagents --skill jrhagents
```

Ikuti petunjuk memilih aplikasi AI dan cakupan pemasangan. Untuk melihat pilihan dahulu tanpa memasang:

```bash
npx skills add Jidy23/JRHagents --list
```

Untuk periksa pembaruan skill: `npx skills check`. Untuk memasang global: `npx skills add Jidy23/JRHagents --skill jrhagents -g`.

**Tidak perlu Python, server MCP, API key JRHagents, atau unduh ZIP manual untuk Skill.** Instalasi menyalin instruksi dan referensi. AI coding tetap memerlukan akun/model dan izin kerja sendiri.

## Jalur B — Gemini CLI tanpa skills CLI

Jika versi Gemini CLI-mu mendukung instalasi skill dari repo:

```bash
gemini skills install https://github.com/Jidy23/JRHagents
```

Lalu lihat daftar skills dengan `/skills`. Perilaku bisa berubah per versi. Jangan memasang dua salinan `jrhagents` di lokasi yang saling menimpa.

## Jalur C — AI chat biasa (ChatGPT web, Claude web, atau layanan lain)

Buka [UNIVERSAL_PROMPT.md](../UNIVERSAL_PROMPT.md). Salin isi instruksi ke fitur custom instructions/prompt (jika tersedia) atau kirim ke percakapan sebelum tugas. **Ini bukan instalasi native** dan tidak menambahkan kemampuan tool. Pada produk yang mendukung unggah Skill, ikuti petunjuk resmi produk untuk mengunggah folder/arsip yang sesuai.

## Verifikasi yang jujur

1. Tanyakan: `JRHagents, buat tiga langkah audit proyek ini. Sebutkan tool apa yang benar-benar tersedia.`
2. Jika skill terdeteksi, AI harus menyebut akses aktual, bukan mengklaim sudah membuka file yang belum diberikan.
3. Berikan satu berkas contoh dan minta review. Jika host dapat mengakses file, minta bukti baris; jika chat-only, tempel bagian terkait.

Jika `npx` tidak ditemukan, pasang Node.js dari https://nodejs.org/ lalu buka terminal baru. Jika skill tidak muncul, periksa versi aplikasi AI dan lokasi install yang ditawarkan CLI. Jangan gunakan perintah yang dimaksudkan untuk platform lain tanpa mengecek dukungannya.

## Akses dan biaya

Kode Skill open-source MIT. Layanan AI tempat Skill dipakai dapat memiliki biaya, model, limit, dan kebijakan sendiri. Tidak ada backend JRHagents cloud yang dihubungkan oleh langkah di atas.
