## V21 — Real interactive task examples
- Replaced copy-only task picker with five working task planners.
- Added input validation, five actionable checklist steps, copyable instructions, and downloadable Markdown.
- Connected the Audit task to the existing real in-browser sample audit.
- Added JavaScript regression tests, browser checks, and versioned site assets to reduce stale caching.
- Plans are explicitly labeled NOT EXECUTED. No AI cloud or code modification is simulated.

# JRHagents V19 — usable web tools & guided setup

- Browser-only bounded static audit with real file selection and JSON report.
- OS-aware GitHub source install wizard.
- New CLI setup command safely installs Skill or merges MCP configurations.
- 33 documented improvements and improved privacy, accessible UX, browser smoke testing.

# Changelog

## 17.0.0 — Portable integrations
- Read-only MCP stdio server with five tools and JSON-RPC handling.
- Seven AI coding skill installation targets, safe upgrades, dry-run and project-only all-client install.
- Package installation via pip, with bundled portable skill resources.
- Agent Plugins 1.0 manifest and skill/MCP structure.
- Updated interactive docs, platform matrix and Pages preflight.
- Cross-OS Python CI, JavaScript tests and integration tests.

## V18 — premium beginner-first GitHub Pages
- Rebuilt docs landing page around plain Indonesian and 3 clear first-use steps.
- Added functional search, mode-specific installer, OS selector, real examples, capability filters, FAQs, responsive menu, and theme persistence.
- Kept claims grounded: no fictional `jrh run` commands, no simulated integrations portrayed as real.
- Added browser smoke and static site checks; reviewed desktop/tablet/mobile layouts.

## V20 — Direct GitHub Install & Beginner-First Onboarding
- Skill default now installs directly using the direct GitHub path `npx skills add https://github.com/Jidy23/JRHagents/tree/main/skills/jrhagents` (avoids root-SKILL shadowing) with verified agent identifiers; no Python or manual ZIP.
- Claude Code plugin can be installed through the GitHub marketplace command flow rather than manual plugin ZIP.
- MCP remains a clearly separate, optional local Python setup; unsupported clients do not show fake commands.
- GitHub Pages guides nontechnical users to choose their AI coding app, installation method, and per-user or per-project scope.
- Added a task example selector, prerequisite help links, 6 new installer regression tests, and browser interaction checks.
- Updated README/install/platform documentation. No claim of a hosted remote MCP server.
