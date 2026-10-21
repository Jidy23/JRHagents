"""Easy-mode CLI for JRHagents. Python stdlib only."""
from __future__ import annotations
import argparse
import json
import sys
from . import __version__
from .core import doctor, initialize, audit, create_plan, verify, status, start
from .reporting import generate_report
from .installer import install, CLIENT_DIRS
from .mcp_config import generate as mcp_config
from .setup import setup as easy_setup, MCP_TARGETS
from .routing import route_request

QUICK = """JRHagents V19 — mulai mudah, tanpa fitur palsu.

1) Pasang paket (contoh setelah Python 3.9+ tersedia):
   python -m pip install "https://github.com/Jidy23/JRHagents/archive/refs/heads/main.zip"
   Catatan: gunakan lingkungan virtual (venv). Buka docs/INSTALL.md.

2) Pilih satu aplikasi AI coding:
   jrhagents setup --client codex --project .
   jrhagents setup --client claude --project .
   jrhagents setup --mode mcp --client cursor --project .
   Tambahkan --dry-run untuk melihat rencana tanpa menulis.

3) Jalankan fungsi lokal:
   jrhagents doctor --project .
   jrhagents audit --project .
   jrhagents plan "rapikan UI" --project .
   jrhagents report --project .

Browser Audit: https://jidy23.github.io/JRHagents/#coba
Batasan: MCP read-only, tidak memiliki model AI atau API cloud otomatis.
"""

def build_parser():
    parser = argparse.ArgumentParser(prog="jrhagents", description="JRHagents V19: skill toolkit lokal, aman dan sederhana", epilog="Jalankan 'help' untuk contoh paling mudah")
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
    p.add_argument("--client", choices=tuple(CLIENT_DIRS) + ("all",), required=True)
    p.add_argument("--scope", choices=("project", "user"), default="project")
    p.add_argument("--project", default=".")
    p.add_argument("--json", action="store_true")
    p.add_argument("--upgrade", action="store_true", help="Back up and replace an existing skill installation")
    p.add_argument("--dry-run", action="store_true", help="Show planned destination without writing")
    p = sub.add_parser("setup", help="Install Skill or safely merge MCP configuration")
    p.add_argument("--mode", choices=("skill", "mcp"), default="skill")
    p.add_argument("--client", default=None, help="AI client (codex, claude, gemini, cursor, etc.)")
    p.add_argument("--project", default=".")
    p.add_argument("--scope", choices=("project","user"), default="project")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--upgrade", action="store_true")
    p.add_argument("--json", action="store_true")
    p = sub.add_parser("mcp-config", help="Print MCP JSON for your client (no settings are modified)")
    p.add_argument("--client", choices=("generic","claude","cursor","vscode","copilot"), default="generic")
    p.add_argument("--project", default=".")
    sub.add_parser("mcp",help="Run JSON-RPC MCP stdio server on this terminal")
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
        elif args.command == "setup":
            client=args.client
            if client is None:
                if not sys.stdin.isatty():
                    raise ValueError('Choose a client with --client (example: jrhagents setup --client codex)')
                print("Pilih aplikasi AI: codex / claude / gemini / cursor / copilot / opencode / windsurf")
                client=input("Aplikasi [codex]: ").strip().lower() or 'codex'
            result = easy_setup(args.mode,client,args.project,args.scope,args.dry_run,args.upgrade)
        elif args.command == "install": result = install(args.client, args.scope, args.project, args.upgrade, args.dry_run)
        elif args.command == "mcp-config": result = mcp_config(args.client,args.project)
        elif args.command == "mcp":
            from .mcp import main as mcp_main
            return mcp_main([])
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
