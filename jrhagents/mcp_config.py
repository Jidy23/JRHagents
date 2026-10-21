"""Copyable MCP JSON snippets; never edits application settings."""
import json
import sys
from pathlib import Path

def generate(client="generic", project="."):
    allowed={"generic","claude","cursor","vscode","copilot"}
    if client not in allowed: raise ValueError("Unknown MCP client")
    root=Path(project).expanduser().resolve()
    if not root.is_dir(): raise ValueError("Project folder not found")
    executable=sys.executable
    spec={"command":executable,"args":["-m","jrhagents.mcp","--project",str(root)]}
    if client in {"vscode","copilot"}:
        spec["type"]="stdio"
        return {"servers":{"jrhagents":spec}}
    return {"mcpServers":{"jrhagents":spec}}
