"""Deterministic task routing. No AI or network access required."""
from __future__ import annotations
import re

ROUTES = {
    "audit": {
        "keywords": ("audit", "cek", "periksa", "review", "bedah", "inspect", "error", "bug", "masalah", "diagnos", "security", "keamanan", "analisis repo"),
        "capabilities": [1, 2, 12, 14, 19, 20, 23],
        "steps": ["Kenali struktur dan risiko proyek", "Audit konfigurasi, kualitas dan keamanan secara read-only", "Urutkan temuan berdasar dampak dan bukti", "Tentukan satu prioritas perbaikan"],
    },
    "build": {
        "keywords": ("bangun", "buat", "bikin", "implement", "fitur", "coding", "kode", "develop", "aplikasi", "website", "webapp", "api", "build", "integrasi"),
        "capabilities": [2, 11, 12, 14, 15, 18, 19, 20, 21, 23],
        "steps": ["Tentukan hasil yang bisa diuji", "Periksa kode dan antarmuka terkait", "Implementasi perubahan terkecil yang menyelesaikan kebutuhan", "Jalankan pengujian relevan dan laporkan buktinya"],
    },
    "polish": {
        "keywords": ("ui", "ux", "desain", "design", "tampilan", "rapikan", "polish", "responsive", "responsif", "animasi", "typography", "warna", "layout", "frontend"),
        "capabilities": [3, 6, 7, 16, 17, 19, 23],
        "steps": ["Petakan komponen dan gaya desain yang ada", "Rancang perbaikan visual tanpa mengubah perilaku bisnis", "Implementasi bertahap dan cek aksesibilitas", "Verifikasi breakpoint, interaksi dan regresi"],
    },
    "research": {
        "keywords": ("riset", "research", "cari referensi", "tren", "trend", "sumber", "jurnal", "market", "kompetitor", "literature", "data terbaru"),
        "capabilities": [4, 8, 23, 24],
        "steps": ["Rumuskan pertanyaan dan rentang waktu", "Cari bukti dari sumber yang tersedia dan terpercaya", "Periksa kebaruan, bias dan kontradiksi", "Susun hasil dengan tautan dan keterbatasan"],
    },
    "release": {
        "keywords": ("rilis", "release", "deploy", "production", "produksi", "publish", "launch", "ship", "siap live"),
        "capabilities": [18, 19, 20, 21, 23, 26],
        "steps": ["Audit perubahan, pengujian dan konfigurasi", "Periksa keamanan, aksesibilitas dan risiko rollback", "Minta persetujuan sebelum deploy atau publikasi", "Laporkan bukti verifikasi dan status kelayakan"],
    },
    "diagram": {
        "keywords": ("diagram", "arsitektur", "architecture", "flowchart", "alur sistem", "mindmap", "sequence diagram"),
        "capabilities": [10, 12, 23],
        "steps": ["Identifikasi komponen dan hubungan sistem", "Buat diagram Mermaid/teks yang dapat diedit", "Cocokkan diagram dengan implementasi aktual", "Cantumkan asumsi dan batasannya"],
    },
}

def route_request(request: str) -> dict:
    if not request or not request.strip():
        raise ValueError("Instruksi tidak boleh kosong")
    value = request.lower()
    tokens = set(re.findall(r"[\w]+", value, flags=re.UNICODE))
    scores = {}
    for name, spec in ROUTES.items():
        score = 0
        for keyword in spec["keywords"]:
            if " " in keyword:
                if keyword in value:
                    score += 3
            elif keyword in tokens:
                score += 3
            elif keyword.endswith("s") and keyword[:-1] in tokens:
                score += 1
        scores[name] = score
    # Diagram-specific requests should not be routed as code implementation.
    if scores["diagram"] > 0 and any(x in tokens for x in ("diagram", "arsitektur", "flowchart", "mindmap")):
        scores["diagram"] += 6
    # Building a new website supersedes visual polish even if UI is mentioned.
    if scores["build"] > 0 and scores["diagram"] == 0 and any(x in tokens for x in ("bikin", "bangun", "buat", "implement", "build")):
        scores["build"] += 3
    ranked = sorted(scores, key=lambda x: (-scores[x], list(ROUTES).index(x)))
    winner = ranked[0] if scores[ranked[0]] else "audit"
    extra = [r for r in ranked[1:] if scores[r] >= 3 and scores[r] >= scores[winner] - 3]
    relevant = [winner] + extra[:2]
    chosen = []
    for item in relevant:
        for cap in ROUTES[item]["capabilities"]:
            if cap not in chosen:
                chosen.append(cap)
    return {"intent": winner, "related_intents": extra[:2], "capabilities": chosen,
            "steps": ROUTES[winner]["steps"], "confidence": "heuristic", "scores": scores}
