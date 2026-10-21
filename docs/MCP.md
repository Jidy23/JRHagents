# MCP stdio server (local, read-only)

Install the Python package from the checked-out source first:

```bash
python -m pip install .
python -m jrhagents.mcp --project .
```

**The second command is a server, not a normal terminal chat**. It waits for JSON-RPC messages on standard input.
Tools: `jrh_doctor`, `jrh_audit`, `jrh_route`, `jrh_plan`, `jrh_status`. All are bounded and read-only. Tools only access the selected local project. No credentials, network access, file writes, build commands or autonomous coding.

Generate a config snippet matching your installed interpreter, instead of guessing a Python location:

```bash
jrhagents mcp-config --client claude --project /absolute/project/path
jrhagents mcp-config --client vscode --project /absolute/project/path
```

Copy the returned JSON into your **existing** client's MCP configuration, merging under `mcpServers` (Claude Desktop/Cursor/generic) or `servers` (VS Code). Do not overwrite other registered servers. Different client versions may require adjustments; refer to their official MCP settings docs. The `mcp.json` inside this repo is for Agent Plugins 1.0 and assumes a working `python` with JRHagents installed.

## Test handshake locally

```bash
python -m unittest tests.test_mcp -v
```

MCP transport is JSON-RPC 2.0 over line-delimited UTF-8 stdio. There is no HTTP or SSE endpoint, no network permissions and no background daemon.
