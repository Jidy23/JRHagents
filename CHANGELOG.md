## Unreleased — evidence and optional project memory

- Added opt-in local project memory, evidence summaries, reviewed improvement
  proposals, a bounded agent-configuration auditor, and a source-checkout
  quality command. These tools are separate from the portable Skill package.
- Fail closed for string high-risk values in the Python runtime and preserve
  failure/paused events when exception objects permit it.
- Require plan ID and fingerprint for structured JavaScript approvals and
  snapshot validated plans; the trusted host-only step-ID shortcut remains.
- Avoid exposing handler error messages in audit events, and protect
  idempotent runs from in-process mutation and repeated execution after a
  failed cache write; cross-process guarantees remain host responsibilities.
- Exercise all JavaScript adapter tests in CI and synchronize the portable
  Skill guidance with the copied chat prompt.

## V35 — Support navbar, QR reliability & audit
- Moved optional support to a single heart button right next to the language toggle, removed large Help/footer card.
- Built compact accessible QRIS dialog with recipient disclosure, save image and GitHub contribution option.
- Losslessly optimized QRIS from 220,630 bytes to 984 bytes; local payload decoded the same as the operator-supplied QR.
- Fixed 768px header overflow and validated six browser widths.
- Added 66-item evidence-based product audit roadmap in `docs/AUDIT-ROADMAP-66.md`.
- Fixed Python support asset regression gate and added keyboard/language/mobile tests.

## V33 — Compact global Skill experience
- 66 real scoped workflows, 11 fields, bilingual searchable capability grid.
- Four-page tabbed lightweight docs, app-aware onboarding and full masked-preview copy.
- Keyboard access, motion preferences and mobile layout tests; no invented APIs.
- 9 stepwise product improvements in docs/V33-RELEASE.md.

## V23 — Premium Pages & Easy Onboarding (2026-10-22)

- Rebuilt GitHub Pages with a zero-dependency responsive UI and lightweight CSS 3D illustration.
- Added installer guidance for AI coding or chat-only use, clipboard actions, prompt-builder and 26-capability search.
- Added accessible mobile navigation, theme toggle, FAQ and reduced-motion support.
- Added static-site regression tests and Node.js syntax gate in GitHub Actions.
- Kept **one canonical Agent Skill** unchanged; the website is documentation, not an AI execution service.

# Changelog

## V22 — Universal Skill (2026-10-22)

- Rebuilt JRHagents as **one native Agent Skill** with progressive reference loading.
- Added 26 grounded, explicitly labeled capabilities: original ten ideas as inspiration only.
- Added chat-only fallback, 9 specialist playbooks, safety and evidence gates, portable handoff and real templates.
- Simplified website to an installation guide; removed mock AI controls, MCP/plugin/service promises.
- Added no-dependency validation tests and a strictly opt-in, read-only project scanner.
- Kept MIT licensing and preserved earlier versions in Git history.

## V24 — Mobile-first, no-shell onboarding

- Rebuild Pages as a compact four-tab interface with mobile bottom navigation; one content pane visible at a time.
- Chat-first setup path: ChatGPT/Claude/Gemini users copy the **full canonical universal prompt**, with no terminal or API request.
- Retain `npx skills add ...` **only** when the user deliberately chooses AI coding / Terminal.
- Add 26 searchable capability practices, nine useful prompt templates, copy/download actions, and actionable troubleshooting.
- Refine responsive spacing, keyboard tab behavior, color theme, reduced-motion support, and lightweight CSS 3D visuals.
- Add static site integrity checks and Node.js unit tests for platform routing; keep one canonical native SKILL.md.
