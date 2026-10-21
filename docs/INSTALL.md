# Installation and first run

Requirements: Python 3.9+ for the local CLI. Git, Node and API keys are optional.

1. Download the public repository ZIP from https://github.com/Jidy23/JRHagents/archive/refs/heads/main.zip and extract.
2. From the extracted folder, run `python scripts/jrhagents.py doctor` (Windows: `py`).
3. Install once for your AI client, selecting **user scope** (works without a project path):

   - Codex: `python scripts/jrhagents.py install --client codex --scope user`
   - Claude Code: `python scripts/jrhagents.py install --client claude --scope user`
   - Gemini CLI: `python scripts/jrhagents.py install --client gemini --scope user`

4. Restart your AI client, then ask: “JRHagents, audit proyek ini dan beri langkah berikutnya.”

**Project-specific install:** run from the extracted JRHagents folder with `--project /absolute/path/to/your/project` instead of `--scope user`.

**Without terminal:** point your AI coding client at `SKILL.md`. Whether it is automatically discovered depends on the client.

**Important:** installer refuses to overwrite an existing installation. It does not install external tools or connect MCP/API providers. The CLI never executes the project test scripts unless `verify --run-tests` or `verify --run-build` is explicitly used.
