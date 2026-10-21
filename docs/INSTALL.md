# 3 steps to JRHagents — Windows, macOS, Linux

## Step 1 — Get the source and install Python package

Download and extract https://github.com/Jidy23/JRHagents/archive/refs/heads/main.zip, open a terminal in the extracted directory, and run:

```bash
python -m pip install .
```

On Windows use `py -m pip install .` when the `python` command is unavailable. Python 3.9+ is required. For isolated installs, a virtual environment or pipx is recommended.

## Step 2 — Install a skill into your project

```bash
jrhagents install --client codex --project /path/to/project
```

Replace `codex` with `claude`, `gemini`, `cursor`, `copilot`, `opencode` or `windsurf`. Run `jrhagents install --client all --project PATH` to create all seven skill locations. This is optional: use just the platform you need.

If a skill already exists, installation will refuse to overwrite it. `--dry-run` previews, and `--upgrade` makes a timestamped backup and replaces it. `--scope user` installs for one account (not supported with `--client all`). Restart the client or reload skills as documented by its vendor.

## Step 3 — Use a plain-language request

> JRHagents, audit this project, prioritize real issues, and show verification evidence.

## MCP separately (optional)

```bash
jrhagents mcp-config --client claude --project /path/to/project
```

See [MCP](MCP.md) for connecting an actual read-only MCP server. For portable plugin format see [Platforms](PLATFORMS.md).

## When things fail

- `jrhagents: command not found` → use `python -m jrhagents install ...` in the Python environment used for installation.
- `No module named jrhagents` → ensure `python -m pip install .` succeeded in the same environment.
- Existing skill → `--dry-run` and then `--upgrade` to preserve old files.
- Untrusted project → never enable project-defined build/test commands before reviewing their content.
- GitHub Pages not working → check repository Settings → Pages → Build and deployment → GitHub Actions. Docs website cannot force GitHub Pages to be enabled via source code.
