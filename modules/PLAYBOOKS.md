# Modular Playbooks

## Audit
- Baca struktur proyek dan hasil `audit`; jangan menyimpulkan dari nama file saja.
- Kategorikan temuan: blocker, keamanan, regresi, kegunaan, enhancement.
- Catat jalur berkas dan hasil uji reproduksi; audit lokal bukan pengganti SAST/DAST.

## Build
- Perjelas acceptance criteria; pilih perubahan minimal.
- Cek dependensi, perubahan Git, izin akses, serta kompatibilitas.
- Implementasi → test → verifikasi; jangan mengklaim API/mock benar-benar live tanpa bukti.

## UI Polish
- Periksa navigasi, warna, kontras, responsive typography, spacing, motion dan fokus keyboard.
- Hormati reduced motion, semantic markup dan kebutuhan perangkat kecil.
- Gunakan screenshot/browser test bila tools tersedia. Tanpanya tandai NOT_RUN.

## Research
- Tentukan rentang tanggal dan sumber utama.
- Bedakan bukti, opini, dan inferensi; semua klaim yang bergantung web harus disitasi.
- Jangan mengarang tren atau jumlah pengguna.

## Integrations & BYOK
- Gunakan API key hanya dari penyimpanan rahasia yang aman; jangan baca atau tampilkan nilainya.
- Adaptor harus menyatakan tipe autentikasi, izin, batas biaya, batas waktu, cara rollback dan sumber bukti.
- MCP/penghubung harus diperiksa dari tools nyata sebelum digunakan, tidak dikarang.

## Release
- Status Git, tes, build, masalah keamanan, rollback dan izin deploy harus jelas.
- Selalu minta persetujuan pengguna untuk rilis produksi.
- Status otomatis bukan jaminan kesiapan produksi; tampilkan QA manual yang belum diuji.
