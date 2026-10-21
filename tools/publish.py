#!/usr/bin/env python3
"""Opt-in GitHub repository bootstrapper. Requires a user's own authenticated gh CLI.

Dry-run by default. No GitHub tokens are read by this script.
"""
from __future__ import annotations
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REPO='Jidy23/JRHagents'

def invoke(args, timeout=60):
    return subprocess.run(args, cwd=ROOT, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, text=True, timeout=timeout)

def main(argv=None):
    parser=argparse.ArgumentParser(description='Prepare an explicitly approved public GitHub repo')
    parser.add_argument('--confirm-public', help=f'To publish, supply exact name: {REPO}')
    args=parser.parse_args(argv)
    print('Source:', ROOT)
    print('Target:', REPO, '(PUBLIC)')
    print('This operation publishes repository files, not the user project under audit.')
    if args.confirm_public is None:
        print('DRY RUN: no files changed or uploaded. For authorized publication:')
        print('python tools/publish.py --confirm-public '+REPO)
        return 0
    if args.confirm_public != REPO:
        print('Refused: publication confirmation must match repository name exactly.',file=sys.stderr)
        return 2
    for tool in ('git','gh'):
        if not shutil.which(tool):
            print('Missing CLI:',tool,'— install and authenticate locally first.',file=sys.stderr)
            return 2
    if (ROOT/'.git').exists():
        print('Refused: already a Git repository; use your normal reviewed git workflow.',file=sys.stderr)
        return 2
    if invoke(['gh','auth','status']).returncode != 0:
        print('GitHub CLI not authenticated. Run gh auth login first.',file=sys.stderr)
        return 2
    if invoke(['gh','repo','view',REPO]).returncode == 0:
        print('Refused: repository already exists. Never overwrite it.',file=sys.stderr)
        return 2
    for key in ('user.name','user.email'):
        if invoke(['git','config','--get',key]).returncode != 0:
            print('Missing git identity:',key,file=sys.stderr)
            return 2
    risks=[p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file() and (p.name=='.env' or p.name.startswith('.env.') and not p.name.endswith(('.example','.template','.sample')))]
    if risks:
        print('Refused: environment files present; review and remove before publishing.',file=sys.stderr)
        return 2
    commands=[['git','init','-b','main'],['git','add','.'],['git','commit','-m','Initial public release: JRHagents V16']]
    for cmd in commands:
        result=invoke(cmd)
        if result.returncode:
            print('Stopped: local Git preparation failed:',cmd[1],file=sys.stderr)
            return 1
    result=invoke(['gh','repo','create',REPO,'--public','--source','.','--remote','origin','--push'],timeout=120)
    if result.returncode:
        print('GitHub publication failed; local Git commit remains. Review gh CLI output locally.',file=sys.stderr)
        return 1
    print('Published successfully. Verify visibility and GitHub Pages settings on the repository.')
    print('https://github.com/'+REPO)
    return 0

if __name__ == '__main__':
    sys.exit(main())
