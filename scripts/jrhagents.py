#!/usr/bin/env python3
"""JRHagents: dependency-free local project toolkit (Python 3.9+).
No remote calls. No autonomous edits. Project scripts run only on explicit opt-in.
"""
from __future__ import annotations
import argparse
import html
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "SKILL.md"
IGNORE = {".git",".jrhagents","node_modules",".venv","venv","dist","build","coverage","__pycache__",".next","vendor"}
CLIENTS = {"codex":".agents/skills/jrhagents","claude":".claude/skills/jrhagents","gemini":".gemini/skills/jrhagents"}
INTENTS = (
 ("diagram",("diagram","flowchart","arsitektur visual","mermaid")),
 ("research",("riset","research","trend","tren","referensi")),
 ("polish",("polish","ui","ux","design","desain","tampilan","responsif")),
 ("release",("deploy","release","rilis","publish","publikasi")),
 ("build",("buat","build","implement","fitur","coding")),
 ("audit",("audit","cek","periksa","review","error")),
)
STEPS = {
 "audit":["Inspect repository safely","Identify evidence-backed findings","Rank by severity","Report next fix"],
 "build":["Inspect current architecture","Define acceptance criteria","Implement smallest change with AI tools","Run relevant checks"],
 "polish":["Review existing design system","Improve spacing, contrast and layout","Preserve behavior","Check responsive and keyboard access"],
 "research":["Define question and timeframe","Collect attributable sources with available tools","Cross-check conflicting evidence","Summarize findings"],
 "diagram":["Map components and dependencies","Choose readable diagram notation","Validate names and relationships"],
 "release":["Review diff and dependencies","Run security and quality gates","Get explicit publishing approval","Verify deployment"],
}
def project_dir(path):
    p=Path(path).expanduser().resolve()
    if not p.is_dir(): raise ValueError("Folder proyek tidak ditemukan: "+str(p))
    return p

def route(task):
    text=task.lower()
    for intent,keys in INTENTS:
        if any(k in text for k in keys):return intent
    return "audit"

def doctor(project):
    p=project_dir(project)
    return {"status":"ok","project":str(p),"tools":{t:bool(shutil.which(t)) for t in ("git","node","npm","python","pytest")},
       "markers":[x for x in ("package.json","pyproject.toml","requirements.txt","Cargo.toml","go.mod") if (p/x).is_file()],
       "git_repo":(p/".git").exists(),"mcp_connected":None,"note":"CLI tidak dapat membuktikan koneksi MCP/API di aplikasi AI."}

def walk_safe(project,limit=1200):
    count=0
    for root,dirs,files in os.walk(project,followlinks=False):
        dirs[:]=sorted(d for d in dirs if d not in IGNORE and not (Path(root)/d).is_symlink())
        for fn in sorted(files):
            file=Path(root)/fn
            if file.is_symlink() or count>=limit:continue
            try:
                if not file.is_file():continue
            except OSError:continue
            count+=1
            yield file

def audit(project):
    p=project_dir(project)
    findings=[];inspected=0
    secretnames={".env",".env.local",".env.production","id_rsa","id_ed25519",".npmrc"}
    secretpattern=re.compile(r"(?i)(?:api[_-]?key|secret|password|access[_-]?token)\s*[:=]\s*['\"][^'\"]{6,}['\"]")
    for f in walk_safe(p):
        inspected+=1
        path=f.relative_to(p).as_posix()
        if f.name in secretnames:
            findings.append({"level":"warning","file":path,"reason":"Potential secret-bearing file; ensure not publicly tracked (values not read)."})
            continue
        try:
            if f.stat().st_size>128_000 or f.suffix.lower() not in {".py",".js",".jsx",".ts",".tsx",".json",".toml",".yml",".yaml",".md",".env",".html"}: continue
            if secretpattern.search(f.read_text(encoding="utf-8",errors="ignore")):
                findings.append({"level":"warning","file":path,"reason":"Potential credential assignment; value deliberately omitted."})
        except (OSError,UnicodeError): pass
    return {"project":str(p),"files_inspected":inspected,"findings":findings[:80],
            "limitations":"Heuristic static scan only; not a full security or functionality audit.",
            "status":"review" if findings else "no_indicators_found"}

def plan(task,project):
    p=project_dir(project)
    intent=route(task)
    return {"project":str(p),"task":task,"intent":intent,"steps":STEPS[intent],
            "scope":"Plan only; actual source edits require an AI client with editor access."}

def store(project,name,data):
    p=project_dir(project)/".jrhagents";p.mkdir(exist_ok=True)
    target=p/name;target.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8")
    return str(target)

def initialize(project):
    p=project_dir(project)/".jrhagents";p.mkdir(exist_ok=True)
    f=p/"PROJECT.md"
    if f.exists():return {"status":"already_exists","path":str(f)}
    f.write_text("# Project context\n\n## Goal\n\n## Constraints\n\n## Definition of done\n\n## Decisions\n",encoding="utf-8")
    return {"status":"created","path":str(f)}

def install(client,project,scope):
    if client not in CLIENTS:raise ValueError("Client harus codex, claude, atau gemini")
    base=project_dir(project) if scope=="project" else Path.home().resolve()
    dest=base/CLIENTS[client]
    if dest.exists() or dest.is_symlink():raise FileExistsError("Skill sudah ada; tidak akan ditimpa: "+str(dest))
    check=dest.parent
    while check!=base and check!=check.parent:
        if check.is_symlink():raise ValueError("Symlink pada jalur instalasi tidak diizinkan")
        check=check.parent
    dest.mkdir(parents=True)
    try:
        if not SKILL.is_file():raise OSError("SKILL.md tidak ditemukan")
        shutil.copy2(SKILL,dest/"SKILL.md")
        for folder in ("modules",):
            source=ROOT/folder
            if source.is_dir():shutil.copytree(source,dest/folder,ignore=shutil.ignore_patterns("__pycache__","*.pyc"))
    except BaseException:
        shutil.rmtree(dest)
        raise
    return {"installed_at":str(dest),"restart_client":True,"scope":scope,"client":client}

def verify(project,run_tests=False,run_build=False,timeout=90):
    p=project_dir(project)
    checks=[{"name":"Static audit","status":"PASSED","details":audit(p)}]
    cmds=[]
    pkg=p/"package.json"
    scripts={}
    if pkg.is_file():
        try:scripts=json.loads(pkg.read_text(encoding="utf-8")).get("scripts",{})
        except (OSError,ValueError):pass
    if run_tests:
        if (p/"pytest.ini").is_file() or (p/"pyproject.toml").is_file() or (p/"tests").is_dir():
            cmds.append(("Tests",["python","-m","unittest","discover","-s","tests","-v"]))
        elif "test" in scripts:cmds.append(("Tests",["npm","test","--","--runInBand"]))
        else:checks.append({"name":"Tests","status":"NOT_RUN","reason":"No supported test runner detected"})
    else:checks.append({"name":"Tests","status":"NOT_RUN","reason":"Requires --run-tests"})
    if run_build:
        if "build" in scripts:cmds.append(("Build",["npm","run","build"]))
        else:checks.append({"name":"Build","status":"NOT_RUN","reason":"No build script detected"})
    else:checks.append({"name":"Build","status":"NOT_RUN","reason":"Requires --run-build"})
    for name,cmd in cmds:
        try:
            r=subprocess.run(cmd,cwd=p,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,
                text=True,timeout=max(1,min(timeout,600)),check=False)
            checks.append({"name":name,"status":"PASSED" if r.returncode==0 else "FAILED",
                           "exit_code":r.returncode,"output_tail":r.stdout[-1000:]})
        except (OSError,subprocess.TimeoutExpired) as ex:
            checks.append({"name":name,"status":"FAILED","error":type(ex).__name__})
    return {"project":str(p),"status":"FAILED" if any(c["status"]=="FAILED" for c in checks) else "COMPLETED",
            "checks":checks,"warning":"User project scripts execute arbitrary code; opt-in only."}

def report(project):
    p=project_dir(project)
    data={"generated":datetime.now(timezone.utc).isoformat(),"doctor":doctor(p),"audit":audit(p)}
    location=store(p,"report.json",data)
    issues=data["audit"]["findings"]
    rows="".join("<li><b>"+html.escape(x["file"])+"</b> — "+html.escape(x["reason"])+"</li>" for x in issues)
    title="No indicators found" if not issues else str(len(issues))+" item(s) to review"
    doc="""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>JRHagents report</title><style>body{font:16px/1.7 system-ui;background:#0e1829;color:#f5f8ff;max-width:800px;margin:6vh auto;padding:20px}
header,section{background:#18263b;border:1px solid #2c3c56;padding:24px;border-radius:16px;margin:16px 0}h1{letter-spacing:-.04em}
p,small{color:#9cb0cd}code{word-break:break-all}li{margin:12px 0}</style>
<header><small>JRHagents · Local audit</small><h1>"""+html.escape(title)+"""</h1><p>Static checks only. This is not a penetration test, browser test or deployment verification.</p></header>
<section><h2>Project</h2><code>"""+html.escape(str(p))+"""</code><p>Files inspected: """+str(data["audit"]["files_inspected"])+"""</p></section>
<section><h2>Findings</h2><ul>"""+rows+"""</ul></section></html>"""
    dest=p/".jrhagents"/"report.html"
    dest.write_text(doc,encoding="utf-8")
    return {"json":location,"html":str(dest),"findings":len(issues)}

def main(argv=None):
    parser=argparse.ArgumentParser(description="JRHagents local-first skill toolkit")
    sub=parser.add_subparsers(dest="command",required=True)
    sub.add_parser("help")
    for cmd in ("doctor","audit","init","report","status","verify","start"):
        x=sub.add_parser(cmd);x.add_argument("--project",default=".")
        if cmd=="start":x.add_argument("--task",default="audit proyek")
        if cmd=="verify":
            x.add_argument("--run-tests",action="store_true");x.add_argument("--run-build",action="store_true")
            x.add_argument("--timeout",type=int,default=90);x.add_argument("--save",action="store_true")
    for cmd in ("route","plan"):
        x=sub.add_parser(cmd);x.add_argument("request",nargs="+")
        if cmd=="plan":x.add_argument("--project",default=".");x.add_argument("--save",action="store_true")
    x=sub.add_parser("install");x.add_argument("--client",choices=tuple(CLIENTS),required=True)
    x.add_argument("--scope",choices=("project","user"),default="project");x.add_argument("--project",default=".")
    args=parser.parse_args(argv)
    try:
        if args.command=="help":
            print("JRHagents: start, doctor, audit, init, route, plan, verify, report, status, install.")
            print('Example: python scripts/jrhagents.py start --project . --task "audit UI"')
            return 0
        if args.command=="doctor":result=doctor(args.project)
        elif args.command=="audit":result=audit(args.project)
        elif args.command=="init":result=initialize(args.project)
        elif args.command=="route":result={"intent":route(" ".join(args.request))}
        elif args.command=="plan":
            result=plan(" ".join(args.request),args.project)
            if args.save:result["saved_to"]=store(args.project,"plan.json",result)
        elif args.command=="verify":
            result=verify(args.project,args.run_tests,args.run_build,args.timeout)
            if args.save:result["saved_to"]=store(args.project,"verify.json",result)
        elif args.command=="report":result=report(args.project)
        elif args.command=="status":
            p=project_dir(args.project)
            result={"initialized":(p/".jrhagents"/"PROJECT.md").exists(),
                "report_available":(p/".jrhagents"/"report.html").exists()}
        elif args.command=="install":result=install(args.client,args.project,args.scope)
        elif args.command=="start":
            result={"init":initialize(args.project),"plan":plan(args.task,args.project),
                    "report":report(args.project)}
        print(json.dumps(result,ensure_ascii=False,indent=2))
        return 1 if args.command=="verify" and result["status"]=="FAILED" else 0
    except (ValueError,FileExistsError,OSError) as ex:
        print("JRHagents: "+str(ex),file=sys.stderr);return 2

if __name__=="__main__":sys.exit(main())
