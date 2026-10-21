"""Guided JRHagents setup. Writes only to explicitly chosen project or home scope.

Setup is deliberately separate from AI clients: skill file installation is supported
for listed clients, while MCP files are merged only on known configurations.
"""
from __future__ import annotations
import json
import os
import shutil
import sys
import time
from pathlib import Path

from .installer import CLIENT_DIRS, install

MCP_TARGETS = {
    'claude': ('.mcp.json', 'mcpServers'),
    'cursor': ('.cursor/mcp.json', 'mcpServers'),
    'gemini': ('.gemini/settings.json', 'mcpServers'),
    'copilot': ('.vscode/mcp.json', 'servers'),
    'vscode': ('.vscode/mcp.json', 'servers'),
}
MODES = ('skill', 'mcp')


def _assert_no_symlink(path: Path, root: Path):
    part = path
    while part != root and part != part.parent:
        if part.is_symlink():
            raise ValueError('Refusing symlinked configuration path: '+str(part))
        part = part.parent


def mcp_destination(client, project):
    if client not in MCP_TARGETS:
        raise ValueError('MCP auto-setup supports: '+', '.join(MCP_TARGETS)+'. For other clients see docs/MCP.md')
    root = Path(project).expanduser().resolve()
    if not root.is_dir():
        raise ValueError('Project folder does not exist: '+str(root))
    dest = root / MCP_TARGETS[client][0]
    _assert_no_symlink(dest,root)
    return dest


def mcp_setup(client, project='.', dry_run=False):
    root=Path(project).expanduser().resolve()
    dest=mcp_destination(client,root)
    group=MCP_TARGETS[client][1]
    spec={'command':sys.executable,'args':['-m','jrhagents.mcp','--project',str(root)]}
    result={'mode':'mcp','client':client,'path':str(dest),'server':'jrhagents',
            'action':'would_install' if dry_run else 'installed',
            'restart_required':True}
    if dry_run:
        return result
    existing={}
    if dest.exists():
        if not dest.is_file(): raise ValueError('MCP target is not a file')
        try:
            existing=json.loads(dest.read_text(encoding='utf-8'))
        except (UnicodeError,json.JSONDecodeError) as exc:
            raise ValueError('Existing MCP configuration is invalid JSON; nothing changed') from exc
        if not isinstance(existing,dict):
            raise ValueError('Existing MCP configuration must contain a JSON object')
    nodes=existing.get(group,{})
    if not isinstance(nodes,dict):
        raise ValueError('Existing '+group+' is not an object')
    if 'jrhagents' in nodes:
        # refuse changing a custom server, even if it points to an older install
        if nodes['jrhagents'] != ({**spec,'type':'stdio'} if group=='servers' else spec):
            raise FileExistsError('Existing jrhagents MCP entry differs. Review configuration manually; no changes made.')
        result['action']='already_installed'
        return result
    dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.exists():
        backup=dest.with_name(dest.name+'.jrh-backup-'+time.strftime('%Y%m%d-%H%M%S'))
        counter=1
        while backup.exists():
            backup=dest.with_name(dest.name+'.jrh-backup-'+time.strftime('%Y%m%d-%H%M%S')+f'-{counter}')
            counter+=1
        shutil.copy2(dest,backup)
        result['backup_at']=str(backup)
    nodes['jrhagents']={**spec,'type':'stdio'} if group=='servers' else spec
    existing[group]=nodes
    tmp=dest.with_name(dest.name+'.jrh-tmp')
    try:
        with tmp.open('x',encoding='utf-8') as f:
            json.dump(existing,f,indent=2,ensure_ascii=False)
            f.write('\n')
        os.replace(tmp,dest)
    finally:
        if tmp.exists(): tmp.unlink()
    return result


def setup(mode='skill',client='codex',project='.',scope='project',dry_run=False,upgrade=False):
    if mode not in MODES: raise ValueError('Mode must be skill or mcp')
    if mode=='mcp':
        if scope!='project': raise ValueError('MCP setup uses project scope only')
        return mcp_setup(client,project,dry_run)
    if client not in CLIENT_DIRS and client!='all':
        raise ValueError('Unsupported skill client: '+client)
    return install(client,scope,project,upgrade,dry_run)
