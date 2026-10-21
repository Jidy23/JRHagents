# V22 local verification

**Date:** 2026-10-22

- Python `unittest` checks: 23 passed in the local working environment.
- Optional read-only scanner: executed against this source tree; did not write user project files.
- Static documentation UI: Chromium smoke tested at 320, 390, 768 and 1440 px; AI coding vs. chatbot tab toggles worked without JS errors or horizontal overflow.
- GitHub direct-install (`npx skills add ...`): installation command confirmed against the `skills` CLI documentation but **not executed** due no network access in the container.
- Deployment: **NOT YET VERIFIED** in this local report. GitHub Actions and Pages must be checked after pushing this commit.
- Other AI platforms: **NOT RUN**; this project provides instructions, not a claim that every runtime has loaded it.

Note: The optional scanner is heuristic, not a comprehensive security or code-quality audit.
