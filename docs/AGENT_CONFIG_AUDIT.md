# Optional agent configuration audit

`tools/agent_config_audit.py` checks a small, fixed set of local agent
configuration files for selected risky patterns. It is opt-in, read-only,
offline, and uses only Python's standard library. It never executes hooks,
MCP servers, project code, or shell commands. It does not install AgentShield
or grant extra access to an AI host.

```bash
python tools/agent_config_audit.py --path .
```

The JSON output includes file names from the fixed allowlist, rule names,
severity, and short guidance. It does not print configuration values,
commands, server names, secret values, or operating-system error text.
Detection is heuristic: findings can be false positives and a clean report
does not establish security. Review findings with knowledge of your host.

Recognized paths only:

- `.mcp.json`
- `.claude/settings.json` and `.claude/settings.local.json`
- `.cursor/mcp.json` and `.cursor/hooks.json`
- `.vscode/mcp.json`
- `.codex/config.toml`

The checks cover possible embedded credential values, selected broad or
bypassed permission settings, disabled approvals or sandbox settings, network
downloads piped to a shell, apparently unpinned `npx` packages, hook commands,
and non-local HTTP endpoints in supported JSON configuration. An explicit
package version does not mean a package is safe. JSON is parsed as data; TOML
uses limited single-line string checks for portability to Python 3.9. Other
formats, multiline TOML, and other paths are not fully analyzed. `.env` and
arbitrary project files are never opened.

`status` is `complete` only when every discovered allowlisted file was read
and processed within the tool's limits; it does **not** mean the configuration
is safe. `no_configs` means none of the allowlisted files was found.
`incomplete` identifies fixed paths skipped or not analyzed, for example due
to symlinks, invalid JSON, file size, or permissions. A symlink used as the
project root is rejected; symlinks and Windows reparse points encountered
within the selected paths are skipped. Each file is limited to 128 KiB and
JSON traversal is limited to 10,000 values. Avoid concurrently changing the
project while auditing; portable path checks cannot eliminate every race on
all operating systems.

The default exit status is 0 for `complete` or `no_configs`, 2 for invalid
input or an incomplete scan. To make a **complete** scan exit 1 when a
high-severity finding is present, use:

```bash
python tools/agent_config_audit.py --path . --fail-on-high
```

An incomplete scan exits 2 even when high-severity findings were also found.
The auditor does not modify files or automatically fix anything.
