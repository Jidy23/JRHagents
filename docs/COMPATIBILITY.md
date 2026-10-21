# Kompatibilitas yang dapat dipertanggungjawabkan

| Jenis AI | Contoh | Cara memakai | Batasan |
|---|---|---|---|
| Chatbot tanpa shell | ChatGPT web, Claude web, Gemini web, chatbot lain | Salin instruksi lengkap dari website dan tempel ke chat/custom instructions | Bukan instalasi Skill native; tidak mendapat API, memori atau akses tool baru |
| Agent Skills native | Codex, Claude Code, Gemini CLI, Cursor, Copilot (versi kompatibel) | `npx skills add Jidy23/JRHagents --skill jrhagents` dari terminal komputer | Node.js dan dukungan runtime diperlukan; perilaku berbeda antar versi |
| Agent buatan sendiri | Loader Agent Skills kustom | Baca `skills/jrhagents/SKILL.md` dan referensi yang diperlukan | Developer harus membangun loader, integrasi, izin, penyimpanan dan eksekusi sendiri |

Tidak ada satu metode instalasi yang berlaku untuk **setiap** layanan AI di dunia. Skill bekerja sebatas kemampuan dan izin nyata dari layanan yang membacanya. Jika suatu UI meminta Base URL, endpoint dan API key, itu bukan prasyarat JRHagents untuk penggunaan manual.

Referensi: https://agentskills.io/specification · https://github.com/vercel-labs/skills
