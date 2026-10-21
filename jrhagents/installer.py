"""Non-destructive local skill installer. Never executes third-party installers."""
from __future__ import annotations
import shutil
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
DIRECTORIES = ("jrhagents", "scripts", "modules", "docs", "templates", "examples", "tests")
FILES = ("SKILL.md", "README.md", "CHANGELOG.md", "LICENSE", "pyproject.toml")
CLIENT_DIRS = {"codex": Path(".agents/skills/jrhagents"),
               "claude": Path(".claude/skills/jrhagents"),
               "gemini": Path(".gemini/skills/jrhagents")}

def destination(client, scope="project", project="."):
    if client not in CLIENT_DIRS: raise ValueError("Client harus codex, claude, atau gemini")
    if scope not in ("project", "user"): raise ValueError("Scope harus project atau user")
    base = Path(project).expanduser().resolve() if scope == "project" else Path.home()
    if not base.is_dir(): raise ValueError("Direktori tujuan tidak ditemukan")
    return base / CLIENT_DIRS[client]

def install(client, scope="project", project="."):
    dest = destination(client, scope, project)
    base = Path(project).expanduser().resolve() if scope == "project" else Path.home()
    check = dest.parent
    while check != base and check != check.parent:
        if check.is_symlink(): raise ValueError("Instalasi lewat folder symlink tidak diizinkan")
        check = check.parent
    if dest.exists() or dest.is_symlink():
        raise FileExistsError(f"Skill sudah terpasang atau path terpakai, tidak ditimpa: {dest}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        dest.mkdir()
        for name in FILES:
            src = PACKAGE_ROOT / name
            if src.is_file(): shutil.copy2(src, dest / name)
        for directory in DIRECTORIES:
            src = PACKAGE_ROOT / directory
            if src.is_dir():
                shutil.copytree(src, dest / directory, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", ".DS_Store"))
        if not (dest / "SKILL.md").exists(): raise OSError("SKILL.md tidak ditemukan di paket")
    except BaseException:
        if dest.is_dir() and not dest.is_symlink(): shutil.rmtree(dest)
        raise
    return {"installed_at": str(dest), "client": client, "scope": scope,
            "instruction": "Mulai ulang / reload skill pada klien AI sebelum penggunaan"}
