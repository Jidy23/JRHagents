#!/usr/bin/env python3
"""Opt-in read-only heuristic audit. No network; no third-party dependencies."""
import argparse
import json
import os
import re
from pathlib import Path

SKIP_DIRS={'.git','.venv','venv','node_modules','dist','build','.next','.nuxt','__pycache__','.cache','.idea','.tox','coverage'}
SKIP_FILES={'.env','.npmrc','.pypirc','.netrc','id_rsa','id_ed25519','credentials.json','secrets.json','service-account.json'}
TEXT_EXT={'.js','.jsx','.ts','.tsx','.py','.html','.css','.scss','.json','.yaml','.yml','.md','.toml','.sh','.sql','.vue','.svelte'}
PATS=(('open TODO/FIXME',re.compile(r'\b(?:TODO|FIXME)\b',re.I),'info'),('leftover debugger',re.compile(r'\bdebugger\s*;?'),'medium'),('possibly unsafe eval()',re.compile(r'\beval\s*\('),'medium'))
SECRET_PATTERN=re.compile(r'(?i)(?:api[_-]?key|secret|access[_-]?token|password)\s*[:=]\s*[\'\"]?[^\s\'\",]{8,}')

def scan(root,max_files=150,max_bytes=1048576):
    base=Path(root).expanduser().resolve()
    if not base.is_dir():raise ValueError('Project folder does not exist or is not a directory')
    if not 1<=max_files<=1000:raise ValueError('--max-files must be between 1 and 1000')
    results=[];scanned=0;skipped=0;total_bytes=0;limited=False
    for here,dirs,files in os.walk(base,topdown=True,followlinks=False):
        dirs[:]=sorted(d for d in dirs if d not in SKIP_DIRS and not (Path(here)/d).is_symlink() and not d.startswith('.jrh'))
        for name in sorted(files):
            path=Path(here)/name
            if path.is_symlink() or name in SKIP_FILES or name.startswith('.env') or path.suffix.lower() not in TEXT_EXT:
                skipped+=1;continue
            if scanned>=max_files or total_bytes>=max_bytes:
                limited=True;break
            try:
                size=path.stat().st_size
                if size>128*1024 or total_bytes+size>max_bytes:
                    skipped+=1;continue
                content=path.read_text(encoding='utf-8',errors='replace')
            except (OSError,UnicodeError):skipped+=1;continue
            total_bytes+=size;scanned+=1
            rel=path.relative_to(base).as_posix()
            for line_no,line in enumerate(content.splitlines(),1):
                if len(results)>=60:break
                # NEVER output lines/content/values: findings have label, location, severity only.
                for label,pattern,severity in PATS:
                    if pattern.search(line):results.append({'kind':label,'file':rel,'line':line_no,'severity':severity})
                if SECRET_PATTERN.search(line):results.append({'kind':'possible credential assignment (value hidden)','file':rel,'line':line_no,'severity':'high'})
        if limited:break
    return {'status':'scanned','mode':'read-only heuristic','files_scanned':scanned,'files_skipped':skipped,
            'bytes_read':total_bytes,'truncated':limited,'findings':results[:60],
            'warning':'This is not an exhaustive security audit. No source lines or secret values are printed.'}

def main():
    p=argparse.ArgumentParser(description='JRHagents optional read-only local project scan')
    p.add_argument('--path',default='.',help='Project directory')
    p.add_argument('--max-files',type=int,default=150,help='1–1000 (default 150)')
    p.add_argument('--max-bytes',type=int,default=1048576,help='Total input bytes (default 1 MiB)')
    a=p.parse_args()
    if a.max_bytes<1024 or a.max_bytes>10485760:p.error('--max-bytes must be 1024..10485760')
    try:r=scan(a.path,a.max_files,a.max_bytes)
    except ValueError as e:p.error(str(e))
    print(json.dumps(r,indent=2,ensure_ascii=False))
if __name__=='__main__':main()
