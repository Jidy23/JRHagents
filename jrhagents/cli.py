"""Easy-mode CLI for JRHagents. Python stdlib only."""
from __future__ import annotations
import argparse
import json
import sys
from . import __version__
from .core import doctor, initialize, audit, create_plan, verify, status, start
from .reporting import generate_report
from .installer import install
from .routing import route_request

QUICK = """JRHagents V16 — satu skill, bahasa biasa.

Mulai cepat:
  python scripts/jrhagents.py start --task "audit dan rapikan UI"
  python scripts/jrhagents.py doctor
  python scripts/jrhagents.py init
  python scripts/jrhagents.py audit
  python scripts/jrhagents.py plan "rapikan UI dan perbaiki error" --save
  python scripts/jrhagents.py verify --save
  python scripts/jrhagents.py report

Pasang ke klien AI (project saat ini):
  python scripts/jrhagents.py install --client codex
  python scripts/jrhagents.py install --client claude
  python scripts/jrhagents.py install --client gemini

Tulis ke AI: "JRHagents, audit proyek ini dan perbaiki masalah utama."
Cakupan nyata: audit lokal, router, rencana, laporan, installer, uji opt-in.
Tidak termasuk: eksekusi AI otonom, live MCP, akses cloud, atau API tanpa konfigurasi.
"""

def build_parser():
    parser = argparse.ArgumentParser(prog="jrhagents", description="JRHagents V16: skill toolkit lokal, aman dan sederhana", epilog="Jalankan 'help' untuk contoh paling mudah")
    parser.add_argument("--version", action="version", version=f"JRHagents {__version__}")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("help", help="Petunjuk singkat dan contoh")
    for cmd in ("start", "doctor", "init", "audit", "verify", "status", "report"):
        p = sub.add_parser(cmd)
        p.add_argument("--project", default=".", help="Folder proyek (default: saat ini)")
        if cmd == "start":
            p.add_argument("--task", default="audit proyek ini", help="Instruksi bebas untuk rencana otomatis")
        if cmd in ("start", "doctor", "audit", "verify", "status", "report"):
            p.add_argument("--json", action="store_true", help="Hasil JSON yang dapat diolah mesin")
        if cmd == "verify":
            p.add_argument("--run-tests", action="store_true", help="Eksekusi tes proyek (dapat menjalankan kode proyek)")
            p.add_argument("--run-build", action="store_true", help="Eksekusi build proyek (dapat menjalankan kode proyek)")
            p.add_argument("--timeout", type=int, default=90, help="Batas waktu tiap perintah, detik")
            p.add_argument("--save", action="store_true", help="Simpan bukti ke .jrhagents/last-verify.json")
    p = sub.add_parser("plan", help="Buat alur kerja dari instruksi bahasa biasa")
    p.add_argument("request", nargs="+", help="Instruksi natural, misalnya: rapikan UI")
    p.add_argument("--project", default=".")
    p.add_argument("--json", action="store_true")
    p.add_argument("--save", action="store_true")
    p = sub.add_parser("route", help="Klasifikasi instruksi tanpa mengakses jaringan")
    p.add_argument("request", nargs="+")
    p.add_argument("--json", action="store_true")
    p = sub.add_parser("install", help="Pasang skill ke proyek atau folder personal")
    p.add_argument("--client", choices=("codex", "claude", "gemini"), required=True)
    p.add_argument("--scope", choices=("project", "user"), default="project")
    p.add_argument("--project", default=".")
    p.add_argument("--json", action="store_true")
    return parser


def run(argv=None):
    args = build_parser().parse_args(argv)
    try:
        if args.command == "help":
            print(QUICK)
            return 0
        elif args.command == "start": result = start(args.project, task=args.task)
        elif args.command == "doctor": result = doctor(args.project)
        elif args.command == "init": result = {"created_at": initialize(args.project)}
        elif args.command == "audit": result = audit(args.project)
        elif args.command == "plan": result = create_plan(" ".join(args.request), args.project, save=args.save)
        elif args.command == "route": result = route_request(" ".join(args.request))
        elif args.command == "verify": result = verify(args.project, args.run_tests, args.run_build, args.timeout, args.save)
        elif args.command == "report": result = generate_report(args.project)
        elif args.command == "status": result = status(args.project)
        elif args.command == "install": result = install(args.client, args.scope, args.project)
        else:
            return 2
        if getattr(args, "json", False):
            print(json.dumps(result, ensure_ascii=False, indent=2))
        elif args.command == "audit":
            print(f"Audit selesai: {result['files_inspected']} berkas diperiksa, {len(result['findings'])} temuan indikatif")
            print("Penanda:", ", ".join(result["framework_markers"]) or "tidak terdeteksi")
            print("Gunakan --json untuk temuan dan batasan selengkapnya")
        elif args.command == "plan":
            print("Tugas:", result["request"])
            print("Alur:", result["intent"], "| kemampuan:", ", ".join(map(str, result["capabilities"])))
            for step in result["steps"]: print(f"  {step['index']}. {step['title']}")
            if "saved_to" in result: print("Tersimpan:", result["saved_to"])
        elif args.command == "verify":
            print("Status:", result["status"])
            for item in result["checks"]: print(" -", item["status"].upper(), item["name"])
        else: print(json.dumps(result, ensure_ascii=False, indent=2))
        return 1 if args.command == "verify" and result["status"] == "failed" else 0
    except (ValueError, FileExistsError, OSError, PermissionError) as exc:
        print(f"JRHagents error: {exc}", file=sys.stderr)
        return 2


def main():
    sys.exit(run())

if __name__ == "__main__":
    main()
