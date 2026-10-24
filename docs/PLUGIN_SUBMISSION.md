# JRHagents — public plugin submission preparation

Status: **preparation in progress; not submitted for review or public**.
Updated: 2026-10-24.

## Verified source and scope

- Existing personal plugin: `jrh-agents`, version `1.1.2`, scope `USER`, discoverability `PRIVATE`.
- Source website: `https://jidy23.github.io/JRHagents/`.
- Package type: skills-only. It provides reusable research, writing, software, design, data and review workflows.
- It **does not** provide an AI model, an MCP server, credentials, social media connections, background agents, or additional platform tool access.
- Keep the existing personal plugin intact. Prepare a separate public submission ZIP from its exact release sources, not a copy of the website.

## Submission listing URLs

Set these in `plugin.json` at `extensions.com.openai.interface`:

| Field | URL |
| --- | --- |
| `websiteURL` | `https://jidy23.github.io/JRHagents/` |
| `supportURL` | `https://jidy23.github.io/JRHagents/support.html` |
| `privacyPolicyURL` | `https://jidy23.github.io/JRHagents/privacy.html` |
| `termsOfServiceURL` | `https://jidy23.github.io/JRHagents/terms.html` |

Files are included in `docs/`, but links are **not publicly live until this branch is merged and GitHub Pages deploys**. Verify all four HTTPS destinations and actual page content from an unauthenticated browser before submitting; a successful build alone is not sufficient.

## Suggested listing

- Display name: **JRH agents**
- Subtitle: **Clarity for complex work**
- Category: **Productivity**
- Developer display name: select the **verified individual or business identity** in the actual submission portal. Do not treat the package's `author.name` as verification.
- Long description: preserve the truthful wording from the current plugin release.
- Brand colors/icons: preserve the original PNG assets and manifest references.
- Release notes: **Prepared JRHagents skills-only package for public review with support, privacy and terms links. No new model, MCP connection, or account permission is added.**

### Example user prompts for package review

Use natural prompts reflecting actual workflow capabilities:

1. “JRHagents, review the UX of this landing page and give me an actionable prioritized checklist.”
2. “JRHagents, structure a quantitative research plan and separate assumptions from verified evidence.”
3. “JRHagents, inspect the uploaded code and point out what has been tested versus what still needs validation.”
4. “JRHagents, help compare business options using only the figures I supply, and label missing data.”

Add these to `extensions.com.openai.review.prompts` in the submission manifest. Skills-only packages do not require app/MCP positive-negative test cases, app-demo video, or reviewer app credentials.

## Remaining steps requiring publisher action

1. Verify the intended publisher's individual/business identity in the portal.
2. Confirm country/region targeting (or explicitly choose all currently supported regions).
3. Review whether optional QRIS appreciation shown on the **website** requires a particular commerce declaration in the current portal. It does not unlock plugin functions. Do not guess the portal answer.
4. Approve legal/policy attestations and confirm the submitted privacy and terms statements are accurate.
5. Export a complete public ZIP of the existing source with original asset files, updated listing URLs, release notes and prompts. Validate the ZIP itself, including both manifest files and file references.
6. Upload the ZIP as a separate submission draft, inspect imported metadata, complete applicable scans/review checks, then submit for review.
7. Only after approval: publish the approved release and verify its listing/discoverability.

A GitHub pull request or a personal `PRIVATE` release **does not** automatically publish the plugin in ChatGPT.
