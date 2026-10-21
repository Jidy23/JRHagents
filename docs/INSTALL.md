# Cara memasang JRHagents (Python 3.9+)

1. Unduh [ZIP resmi](https://github.com/Jidy23/JRHagents/archive/refs/heads/main.zip), ekstrak, lalu masuk ke folder JRHagents lewat terminal.
2. Jalankan **satu** perintah berikut untuk memasang skill secara personal sehingga dapat digunakan kembali di beberapa proyek:

| Klien | Perintah |
|---|---|
| Codex | `python scripts/jrhagents.py install --client codex --scope user` |
| Claude Code | `python scripts/jrhagents.py install --client claude --scope user` |
| Gemini CLI | `python scripts/jrhagents.py install --client gemini --scope user` |

3. Muat ulang klien AI dan ketik: **"JRHagents, audit proyek ini dan tunjukkan hasilnya."**

Windows: coba `py` bila `python` tidak dikenal.

### Instalasi untuk satu proyek saja

Ganti `--scope user` dengan `--project "/lokasi/proyek"`; misalnya:

```bash
python scripts/jrhagents.py install --client codex --project "/lokasi/proyek"
```

Saat memasang ke proyek, skill ditambahkan di `.agents/skills/jrhagents` (Codex), `.claude/skills/jrhagents` (Claude) atau `.gemini/skills/jrhagents` (Gemini). Folder yang sudah ada tidak ditimpa. Klien AI perlu memiliki dukungan pembacaan skill; bila tidak terdeteksi, arahkan klien untuk membaca `SKILL.md`.

### Tanpa AI coding

Jalankan `python scripts/jrhagents.py start --project "/lokasi/proyek" --task "audit dan rapikan UI"` untuk menghasilkan audit, rencana dan laporan offline. Perintah tidak otomatis memperbaiki kode. Cek keterangan perintah dengan `python scripts/jrhagents.py help`.

**Keamanan:** installer tidak menginstal repo pihak ketiga, tidak membaca API key, tidak menghubungkan MCP, dan tidak mengaktifkan skrip test/build proyek tanpa izin eksplisit.

[Panduan interaktif](index.html)
