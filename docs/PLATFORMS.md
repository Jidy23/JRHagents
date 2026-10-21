# Compatibility matrix (verified formats ≠ verified clients)

| Target | Distribution | Default project directory | Scope |
| --- | --- | --- | --- |
| Codex | SKILL.md | `.agents/skills/jrhagents` | Project or user |
| Claude Code | SKILL.md | `.claude/skills/jrhagents` | Project or user |
| Gemini CLI | SKILL.md | `.gemini/skills/jrhagents` | Project or user |
| Cursor | SKILL.md | `.cursor/skills/jrhagents` | Project or user (version-dependent) |
| GitHub Copilot | SKILL.md | `.github/skills/jrhagents` | Project or user |
| OpenCode | SKILL.md | `.opencode/skills/jrhagents` | Project or user |
| Windsurf | SKILL.md | `.windsurf/skills/jrhagents` | Project or user (version-dependent) |
| Compatible Agent Plugins clients | `plugin.json` / `skills/` / `mcp.json` | Repository root | Client-specific |
| MCP clients | JSON-RPC stdio | Custom settings | Client-specific |
| ChatGPT custom Plugins | **Not supported by this package** | N/A | Requires ChatGPT-specific publishing process |
| Mobile Android / iOS | Docs only | N/A | Running local Python requires separate compatible environment |

Installer paths are automatically tested; native client discovery and runtime availability depend on client versions. We do not claim this has been installed on every AI platform.

Security: `install --upgrade` creates a non-destructive timestamped backup. Installer never sends data over the network.
