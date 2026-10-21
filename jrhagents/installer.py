"""Non-destructive portable skill installer, including pip wheel installations."""
from __future__ import annotations
import shutil
import time
from pathlib import Path

from . import __version__

CLIENT_DIRS = {
    "codex": (".agents/skills/jrhagents", ".agents/skills/jrhagents"),
    "claude": (".claude/skills/jrhagents", ".claude/skills/jrhagents"),
    "gemini": (".gemini/skills/jrhagents", ".gemini/skills/jrhagents"),
    "cursor": (".cursor/skills/jrhagents", ".cursor/skills/jrhagents"),
    "copilot": (".github/skills/jrhagents", ".copilot/skills/jrhagents"),
    "opencode": (".opencode/skills/jrhagents", ".config/opencode/skills/jrhagents"),
    "windsurf": (".windsurf/skills/jrhagents", ".codeium/windsurf/skills/jrhagents"),
}
PACKAGE_SKILL = Path(__file__).resolve().parent / "skill"

def destination(client, scope="project", project="."):
    if client not in CLIENT_DIRS:
        raise ValueError("Unsupported client: " + str(client))
    if scope not in ("project", "user"):
        raise ValueError("Scope must be 'project' or 'user'")
    base = Path(project).expanduser().resolve() if scope == "project" else Path.home().resolve()
    if not base.is_dir():
        raise ValueError("Target project directory does not exist")
    return base / CLIENT_DIRS[client][0 if scope == "project" else 1]

def install(client, scope="project", project=".", upgrade=False, dry_run=False):
    if client == "all":
        targets = list(CLIENT_DIRS)
        if scope == "user":
            raise ValueError("For safety, install --client all requires --scope project")
        if not upgrade and not dry_run:
            existing = [k for k in targets if destination(k, scope, project).exists()]
            if existing:
                raise FileExistsError("Already installed: " + ", ".join(existing) + "; use --upgrade to back up existing skills")
        return {"targets": [install(k,scope,project,upgrade,dry_run) for k in targets]}

    dest = destination(client,scope,project)
    base = Path(project).expanduser().resolve() if scope == "project" else Path.home().resolve()
    node = dest.parent
    while node != base and node != node.parent:
        if node.is_symlink(): raise ValueError("Refusing symlinked installation path")
        node = node.parent
    if dest.is_symlink(): raise ValueError("Refusing to replace a symlink")
    if not PACKAGE_SKILL.is_dir() or not (PACKAGE_SKILL/"SKILL.md").is_file():
        raise OSError("Bundled SKILL.md unavailable; reinstall JRHagents")
    exists = dest.exists()
    if exists and not upgrade and not dry_run:
        raise FileExistsError("Skill already installed: " + str(dest) + "; use --upgrade to keep a backup")
    result={"client":client,"scope":scope,"path":str(dest),"installed_at":str(dest),"exists":exists,"version":__version__}
    if dry_run:
        result["action"]="would_backup_and_replace" if exists and upgrade else "would_install" if not exists else "already_installed"
        return result
    dest.parent.mkdir(parents=True,exist_ok=True)
    backup=None
    if exists:
        backup = dest.with_name(dest.name + ".backup-" + time.strftime("%Y%m%d-%H%M%S"))
        idx=1
        while backup.exists():
            backup=dest.with_name(dest.name+".backup-"+time.strftime("%Y%m%d-%H%M%S")+f"-{idx}")
            idx+=1
        dest.rename(backup)
    try:
        shutil.copytree(PACKAGE_SKILL,dest,symlinks=False)
    except BaseException:
        if dest.exists(): shutil.rmtree(dest)
        if backup is not None: backup.rename(dest)
        raise
    result["action"]="upgraded" if backup else "installed"
    if backup: result["backup_at"]=str(backup)
    return result
