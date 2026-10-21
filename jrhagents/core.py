"""Safe local inspection, plans, checks and release evidence."""
from __future__ import annotations
import json
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from .routing import route_request
from . import __version__

IGNORE_DIRS = {".git", ".hg", ".svn", "node_modules", ".next", ".nuxt", ".venv", "venv", "env", "dist", "build", "coverage", "__pycache__", ".pytest_cache", ".turbo", ".cache", "target", ".jrhagents"}
SCAN_EXTS = {".js", ".jsx", ".ts", ".tsx", ".py", ".go", ".rs", ".java", ".rb", ".php", ".json", ".yaml", ".yml", ".toml", ".env", ".sh", ".cjs", ".mjs"}
SENSITIVE_PATTERNS = {
    "private_key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
    "github_token": re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{30,}\b"),
    "aws_access_key": re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "openai_api_key": re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b"),
}
ROOT_MARKERS = ("package.json", "pyproject.toml", "requirements.txt", "Cargo.toml", "go.mod", "pom.xml", "composer.json")


def redact_text(value):
    """Prevent recognizable credentials from being saved in task plans or logs."""
    for code, pattern in SENSITIVE_PATTERNS.items():
        value = pattern.sub(f"[REDACTED:{code}]", value)
    return value

def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def project_dir(project):
    root = Path(project).expanduser().resolve()
    if not root.is_dir():
        raise ValueError(f"Direktori proyek tidak ditemukan: {root}")
    return root


def _cmd_exists(name):
    return shutil.which(name) is not None


def _git_data(root, args, timeout=5):
    if not _cmd_exists("git"):
        return None
    try:
        p = subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True, errors="replace", timeout=timeout, check=False)
        return p.stdout if p.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired):
        return None


def doctor(project="."):
    root = project_dir(project)
    tools = {x: _cmd_exists(x) for x in ("python", "git", "node", "npm", "pnpm", "yarn", "gh", "codex", "claude", "gemini")}
    git_root = _git_data(root, ["rev-parse", "--show-toplevel"])
    return {"version": __version__, "timestamp": utc_now(), "project": str(root),
            "git_repository": bool(git_root), "tools": tools,
            "markers": [x for x in ROOT_MARKERS if (root / x).is_file()],
            "project_context": (root / ".jrhagents" / "PROJECT.md").is_file(),
            "bundled_mcp_stdio": True, "live_mcp_verified": False, "live_mcp_client_connected": False, "live_provider_verified": False,
            "notes": ["Pemeriksaan lokal saja; tidak memvalidasi kunci, akun, koneksi API, atau MCP.", "Tidak ada data rahasia yang dibaca dari variabel lingkungan."]}


def initialize(project="."):
    root = project_dir(project)
    dest = root / ".jrhagents" / "PROJECT.md"
    if dest.parent.is_symlink(): raise ValueError("Folder .jrhagents symlink tidak diizinkan")
    if dest.exists() or dest.is_symlink():
        raise FileExistsError(f"Konteks sudah ada, tidak ditimpa: {dest}")
    dest.parent.mkdir(exist_ok=True)
    template = Path(__file__).resolve().parents[1] / "templates" / "PROJECT.md"
    dest.write_text(template.read_text(encoding="utf-8"), encoding="utf-8")
    return str(dest)


def _enumerate(root, max_files=2500):
    count = 0
    for current, dirs, names in os.walk(root, followlinks=False):
        parent = Path(current)
        if parent.name == "skills" and parent.parent.name in (".agents", ".claude", ".gemini"):
            dirs[:] = [d for d in dirs if d != "jrhagents"]
        dirs[:] = sorted(d for d in dirs if d not in IGNORE_DIRS and not (Path(current) / d).is_symlink())
        for name in sorted(names):
            p = Path(current) / name
            if p.is_symlink() or not p.is_file():
                continue
            yield p
            count += 1
            if count >= max_files:
                return


def _package_summary(root):
    p = root / "package.json"
    if not p.is_file() or p.is_symlink():
        return {}
    try:
        obj = json.loads(p.read_text(encoding="utf-8"))
        scripts = obj.get("scripts", {})
        if not isinstance(scripts, dict): scripts = {}
        return {"package_name": redact_text(str(obj.get("name", ""))), "scripts_available": sorted(redact_text(str(k)) for k in scripts)}
    except (ValueError, OSError, UnicodeError):
        return {"package_error": "package.json tidak dapat dibaca sebagai JSON valid"}


def audit(project="."):
    root = project_dir(project)
    files = list(_enumerate(root))
    rels = {p.relative_to(root).as_posix() for p in files}
    git_status = _git_data(root, ["status", "--porcelain", "--untracked-files=no"])
    tracked_env = []
    tracked = _git_data(root, ["ls-files", "-z"])
    if tracked is not None:
        for item in tracked.split("\x00"):
            name = Path(item).name
            if name == ".env" or name.startswith(".env.") and not name.endswith((".example", ".sample", ".template")):
                tracked_env.append(item)
    findings = []
    for path in files:
        if path.suffix.lower() not in SCAN_EXTS or path.name.endswith((".lock", ".min.js")):
            continue
        relative = path.relative_to(root).as_posix()
        if any(k in {part.lower() for part in path.relative_to(root).parts} for k in ("fixtures", "examples", "vendor", "testdata")):
            continue
        try:
            if path.stat().st_size > 512 * 1024:
                continue
            # Do not scan .env values; flag tracked env filenames separately instead.
            if path.name == ".env" or path.name.startswith(".env."):
                continue
            with path.open("r", encoding="utf-8", errors="replace") as handle:
                for idx, line in enumerate(handle, 1):
                    for code, pattern in SENSITIVE_PATTERNS.items():
                        if pattern.search(line):
                            findings.append({"severity": "high", "code": code, "file": relative, "line": idx, "detail": "Pola kredensial terdeteksi; nilai disembunyikan"})
                    if len(findings) >= 100:
                        break
        except OSError:
            continue
        if len(findings) >= 100:
            break
    for item in tracked_env[:30]:
        findings.append({"severity": "high", "code": "tracked_env_file", "file": item, "detail": "Berkas lingkungan berpotensi sensitif terlacak oleh Git"})
    tests_found = any("test" in p.name.lower() for p in files if p.suffix in (".py", ".ts", ".tsx", ".js", ".jsx")) or "tests" in [x.name for x in root.iterdir() if x.is_dir()]
    lockfiles = [x for x in ("package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb", "bun.lock", "poetry.lock", "uv.lock", "Cargo.lock") if (root / x).exists()]
    observations = []
    if not tests_found: observations.append("Tidak ditemukan indikasi berkas pengujian; belum berarti proyek tidak mempunyai tes")
    if not any(x in rels for x in ("README.md", "README.txt", "readme.md")): observations.append("README belum ditemukan pada root")
    if (root / "package.json").is_file() and not lockfiles: observations.append("Proyek JavaScript belum memiliki lockfile yang terdeteksi")
    if git_status is None: observations.append("Status Git tidak tersedia atau proyek belum memakai Git")
    result = {"version": __version__, "generated_at": utc_now(), "project": str(root),
              "source": "bounded local filesystem inspection", "files_inspected": len(files), "truncated_at_limit": len(files) >= 2500,
              "framework_markers": [x for x in ROOT_MARKERS if x in rels], "lockfiles": lockfiles,
              "package": _package_summary(root), "tests_detected": tests_found,
              "git_modified_tracked_files": None if git_status is None else len([x for x in git_status.splitlines() if x.strip()]),
              "findings": findings, "observations": observations,
              "limitations": ["Inspeksi heuristik, bukan audit keamanan menyeluruh", "Folder hasil build, vendor dan berkas besar dikecualikan", "Tidak mengeksekusi kode proyek atau mengakses jaringan"]}
    return result


def create_plan(request, project=".", save=False):
    root = project_dir(project)
    route = route_request(request)
    plan = {"version": __version__, "created_at": utc_now(), "project": str(root),
            "request": redact_text(request), "intent": route["intent"], "related_intents": route["related_intents"],
            "capabilities": route["capabilities"], "confidence": route["confidence"],
            "steps": [{"index": i + 1, "title": title, "status": "pending"} for i, title in enumerate(route["steps"])],
            "permissions": {"read_only_initially": True, "ask_before": ["deployment", "public_post", "deletion", "paid_api_calls", "irreversible_changes"]},
            "evidence": [], "important": "Rencana belum berarti AI telah menjalankan pekerjaannya."}
    if save:
        ctx = root / ".jrhagents"
        if ctx.is_symlink(): raise ValueError("Folder .jrhagents symlink tidak diizinkan")
        ctx.mkdir(exist_ok=True)
        target = ctx / "plan.json"
        if target.is_symlink(): raise ValueError("Tidak menulis melalui symlink")
        target.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
        plan["saved_to"] = str(target)
    return plan


def _run_command(command, root, timeout):
    t0 = time.monotonic()
    try:
        completed = subprocess.run(command, cwd=root, timeout=timeout, capture_output=True, check=False)
        # Intentionally never return stdout/stderr: arbitrary scripts might print credentials.
        return {"status": "passed" if completed.returncode == 0 else "failed",
                "exit_code": completed.returncode, "duration_seconds": round(time.monotonic() - t0, 2), "command": command,
                "output": "Disembunyikan untuk mencegah kebocoran informasi sensitif"}
    except subprocess.TimeoutExpired:
        return {"status": "failed", "error": "timeout", "duration_seconds": round(time.monotonic() - t0, 2), "command": command}
    except OSError as exc:
        return {"status": "failed", "error": exc.__class__.__name__, "command": command}


def verify(project=".", run_tests=False, run_build=False, timeout=90, save=False):
    root = project_dir(project)
    if not 1 <= timeout <= 600: raise ValueError("Timeout harus 1–600 detik")
    audit_result = audit(root)
    checks = [{"name": "Filesystem audit", "status": "passed", "detail": f"{audit_result['files_inspected']} berkas ditemukan"}]
    if any(x["severity"] == "high" for x in audit_result["findings"]):
        checks.append({"name": "Potential credentials", "status": "failed", "detail": f"{len(audit_result['findings'])} temuan perlu diverifikasi"})
    else:
        checks.append({"name": "Potential credentials", "status": "passed", "detail": "Tidak ditemukan pola berisiko pada cakupan scan; bukan jaminan aman"})
    scripts = audit_result.get("package", {}).get("scripts_available", [])
    runner = "npm"
    if (root / "pnpm-lock.yaml").exists() and _cmd_exists("pnpm"): runner = "pnpm"
    elif (root / "yarn.lock").exists() and _cmd_exists("yarn"): runner = "yarn"
    if run_tests:
        if "test" in scripts and _cmd_exists(runner):
            checks.append({"name": "Project tests", **_run_command([runner, "run", "test"], root, timeout)})
        elif (root / "tests").is_dir() and any((root / "tests").rglob("test_*.py")):
            checks.append({"name": "Project tests", **_run_command([sys.executable, "-m", "unittest", "discover", "-s", "tests"], root, timeout)})
        else:
            checks.append({"name": "Project tests", "status": "not_run", "detail": "Runner atau skrip tes yang didukung tidak ditemukan"})
    else:
        checks.append({"name": "Project tests", "status": "not_run", "detail": "Perlu opsi eksplisit --run-tests; menjalankan kode proyek mungkin berisiko"})
    if run_build:
        if "build" in scripts and _cmd_exists(runner):
            checks.append({"name": "Project build", **_run_command([runner, "run", "build"], root, timeout)})
        else:
            checks.append({"name": "Project build", "status": "not_run", "detail": "Skrip build dan runner tidak tersedia"})
    else:
        checks.append({"name": "Project build", "status": "not_run", "detail": "Perlu opsi eksplisit --run-build"})
    failed = any(c["status"] == "failed" for c in checks)
    incomplete = any(c["status"] == "not_run" for c in checks)
    result = {"version": __version__, "generated_at": utc_now(), "project": str(root),
              "status": "failed" if failed else "partial" if incomplete else "passed", "checks": checks,
              "automated_checks_passed": (not failed and not incomplete and bool(run_tests) and bool(run_build)),
              "release_ready": False,
              "release_caveat": "Verifikasi terbatas; belum mencakup uji manual, aksesibilitas, produksi dan integrasi eksternal.",
              "external_deployment_performed": False}
    if save:
        out = root / ".jrhagents"
        if out.is_symlink(): raise ValueError("Folder .jrhagents symlink tidak diizinkan")
        out.mkdir(exist_ok=True)
        target = out / "last-verify.json"
        if target.is_symlink(): raise ValueError("Tidak menulis melalui symlink")
        target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        result["saved_to"] = str(target)
    return result


def status(project="."):
    root = project_dir(project)
    location = root / ".jrhagents"
    result = {"project": str(root), "initialized": (location / "PROJECT.md").exists(),
              "plan_saved": (location / "plan.json").exists(), "verification_saved": (location / "last-verify.json").exists(),
              "verification_status": None, "next_action": "Jalankan 'init' lalu 'audit'"}
    if result["verification_saved"] and not location.is_symlink() and not (location / "last-verify.json").is_symlink():
        try:
            obj = json.loads((location / "last-verify.json").read_text(encoding="utf-8"))
            result["verification_status"] = obj.get("status", "unknown")
            result["next_action"] = "Tinjau pemeriksaan yang gagal / belum dijalankan"
        except (ValueError, OSError):
            result["verification_status"] = "unreadable"
    elif result["initialized"]:
        result["next_action"] = "Jalankan 'audit' dan 'verify'"
    return result


def start(project=".", task="audit proyek ini"):
    """One-command local onboarding; never runs project tests or deployment."""
    root = project_dir(project)
    ctx = root / ".jrhagents"
    if ctx.is_symlink():
        raise ValueError("Folder .jrhagents symlink tidak diizinkan")
    created = False
    if not (ctx / "PROJECT.md").exists():
        initialize(root)
        created = True
    plan = create_plan(task, root, save=True)
    verification = verify(root, save=True)
    from .reporting import generate_report
    report = generate_report(root)
    return {"status": "partial", "task": redact_text(task), "project_context_created": created,
            "intent": plan["intent"], "capabilities": plan["capabilities"],
            "audit_findings": report["finding_count"], "verification_status": verification["status"],
            "report_html": report["html"], "report_json": report["json"],
            "next_action": "Buka HTML report, lalu minta AI menangani temuan prioritas",
            "note": "Ini onboarding dan analisis statis, bukan implementasi otomatis."}
