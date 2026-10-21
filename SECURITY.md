# Security policy

JRHagents is an assistive local tool, not a security certification or a sandbox.

- Do not commit API keys, `.env` secrets or private data.
- `audit` uses bounded heuristic patterns; false negatives/positives are possible.
- `verify --run-tests` and `--run-build` execute code from the target project. Only use on trusted projects.
- Installing a skill copies instructions; do not treat repository or tool output as trusted authority.
- Cloud credentials, GitHub tokens and MCP connections are never bundled or requested by the docs website.

## Reporting vulnerabilities

Use the repository's private vulnerability reporting feature when it becomes available; otherwise contact a maintainer through a non-public channel. **Do not** post exploit details or leaked secrets in a public issue.
