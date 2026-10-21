# 5 Easy Commands

## Start in one command
`python scripts/jrhagents.py start --project /path/to/project --task "audit dan rapikan UI"`

## Diagnose without changing files
`python scripts/jrhagents.py doctor --project /path/to/project`

## Prioritize an idea
`python scripts/jrhagents.py plan "bikin fitur kalender yang cepat dan responsif" --project /path/to/project`

## Verify safely
`python scripts/jrhagents.py verify --project /path/to/project` (static only)

## Generate offline visual report
`python scripts/jrhagents.py report --project /path/to/project`

Note: Commands live in the skill folder; install is available for Codex, Claude Code and Gemini CLI. The AI host interprets natural-language tasks, while the scripts run limited verified local functions.
