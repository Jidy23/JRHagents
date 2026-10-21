# JRHagents Pages V24 — mobile-first, no shell confusion

This release changes the **web guide only**. The canonical `skills/jrhagents/SKILL.md` and its 26-practice reference map are unchanged.

## Fixed for first-time users

- Default route is **Chatbot biasa** (ChatGPT, Claude web, Gemini web or other). Copying now returns the **complete** canonical instructions, not a short snippet.
- The `npx` installer is only visible after selecting **AI Coding**. No API endpoint, API key, or fake cloud connector is requested.
- The FAQ explains why an API-based `create_skill` screen is not the same as installing an instruction-only Agent Skill.
- Mobile site uses four content tabs, a persistent bottom navigator, and compact step details. No infinite scrolling through all content categories.
- Visual layer is pure CSS with motion-reduction support. No Three.js, CDN, telemetry or background downloads.

## Verified behavior

- Standalone Python unit tests check HTML integrity, accessibility attributes, full prompt synchronization and single canonical skill.
- Node tests check 26 practices, chat/coding routing, meaningful task prompts, and filter results.
- Optional Chromium/Playwright test verifies 320/360/390/768/1024/1440 px, no horizontal overflow, full clipboard content, markdown download, categories, navigation and theme.

## What JRHagents does not do

- The website does not install software in the user's device or execute AI tasks remotely.
- Copying instructions does not add permissions or tools to a chatbot.
- Native Agent Skills installation depends on each platform's support.
