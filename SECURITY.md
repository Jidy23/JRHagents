# Security policy

JRHagents is an instruction package, not a privileged security service. It runs under the **host AI's actual tools and permissions**, which users should review before enabling project writes or connecting accounts.

- Never put passwords, access tokens, SSH keys, private data or service credentials in a GitHub issue.
- Treat downloaded prompts/skills as code-like instructions. Review `SKILL.md` before adding it to your AI workflow.
- The optional scanner is read-only, bounded, and avoids reading secret-file contents. A clean scan is **not** security certification.
- Report concerns through a private GitHub security advisory where available; otherwise open an issue with no sensitive exploit details and request a private contact route.
- Use least privilege. Never auto-approve destructive actions merely because the skill recommends a workflow.
