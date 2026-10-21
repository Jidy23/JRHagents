# JRHagents Premium Pages — verification guide

Website is a real static documentation interface (`docs/index.html`), not a screenshot or an AI runtime.

## What is implemented
- Responsive navigation and keyboard-accessible search (`Ctrl`/`Cmd` + `K`, `Escape`).
- Step-by-step onboarding for Windows, macOS and Linux/WSL.
- Mode-aware instructions for Skill, MCP, and Agent Plugin, with copy buttons.
- Real CLI examples (`doctor`, `audit`, `plan`, `mcp-config`) and AI coding prompts clearly distinguished.
- Searchable 26-capability map with grounded statuses, category filters, and expansion.
- Theme switcher, functional FAQ accordions, responsive layouts, reduced-motion support.

## Repeatable checks
```sh
node --check docs/assets/app.js
node --check docs/assets/site-model.js
node --test tests/site.test.cjs tests/pages-v18.test.cjs
python -m unittest discover -s tests -v
```

Browser smoke (optional Playwright + Chromium, not installed by the project):
```sh
python tests/browser_smoke.py
```
This browser script injects local markup/assets for verification where direct file URLs are blocked. It checks 1440, 768, 390, and 320 px; mode & OS switching; example filters; capability search; search dialog; mobile menu; theme toggle; JS errors; and horizontal overflow.

The website cannot itself install tools, enable GitHub Pages, run coding agents, or attach API keys. Plugin/MCP steps require a compatible AI client and separate local setup. Do not interpret copy-button success as installed integration.
