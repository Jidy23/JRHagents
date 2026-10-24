# JRHagents — public plugin submission

Updated: 2026-10-24. **Build complete; publication NOT complete.**

## What exists

- **Public submission candidate:** `jrh-agents` version `1.2.0`. Source: this repository's current canonical `skills/jrhagents/` with 66 workflows.
- **Personal Plugin Creator release:** `jrh-agents` version `1.1.2`, `USER` scope, `PRIVATE`. This private version is not modified by the packaging workflow.
- Builder: `python tools/build_plugin_submission.py --verify`.
- Output: `dist/JRHagents-public-submission-v1.2.0.zip`.
- CI: [Build public plugin submission ZIP](https://github.com/Jidy23/JRHagents/actions/workflows/public-plugin.yml). Download the workflow's named artifact. GitHub wraps it in an outer ZIP; **extract it once** to get the actual uploadable `JRHagents-public-submission-v1.2.0.zip`.
- The standalone ZIP contains `plugin.json`, `skills/jrhagents/` including the 66-entry workflow index, `LICENSE`, and a 512x512 PNG icon based on the site's blue/star favicon.
- This is a skills-only package (no MCP server, apps, secrets, hook or OAuth). A plugin does not grant an AI extra tool permissions by installing this skill.

## Public listing (all four URLs)

| Field | Destination |
| --- | --- |
| Website | https://jidy23.github.io/JRHagents/ |
| Support | https://jidy23.github.io/JRHagents/support.html |
| Privacy | https://jidy23.github.io/JRHagents/privacy.html |
| Terms | https://jidy23.github.io/JRHagents/terms.html |

The GitHub CI packaging workflow verifies those pages over HTTPS and checks for JRHagents content. The public listing uses **Productivity**, display name **JRH agents**, and subtitle **Clarity for complex work**.

## Publisher-only steps remaining

1. Open the ChatGPT **Plugins** submission portal and choose **Upload new or existing plugin** → **Skills only**. Use the extracted uploadable ZIP, **not** the GitHub artifact's outer wrapper.
2. Select the intended organization and **verified individual/business developer identity**. The dashboard may override `developerName`; the source project's author name is not developer verification.
3. Review the imported description, icon, URLs, skill inventory, release notes, and any findings under **Metadata & Skills**. Resolve errors by fixing source and rebuilding rather than altering unrelated private versions.
4. Confirm region/country availability. Select only countries genuinely supported by the publisher, or explicitly choose all supported countries if desired.
5. Confirm policy statements and whether the optional donation QRIS on the separate project website affects the portal's commerce declarations; it does not unlock plugin features. Do not claim an unverified payment flow.
6. The developer must personally confirm the legal/policy attestations and click **Submit for review**.
7. When review reports **Approved**, select the approved version and click **Publish plugin**. Verify the actual public listing.

Skills-only plugins do not require MCP test cases, demo video, or reviewer app credentials. Review prompts are included in `plugin.json`.

Sources: [Official submission steps](https://developers.openai.com/plugins/deploy/submission), [errors](https://developers.openai.com/plugins/deploy/submission-errors), and [plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines).

**Status distinction:** GitHub Pages deployed ≠ ZIP built ≠ draft uploaded ≠ submitted ≠ approved ≠ published.
