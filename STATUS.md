# Current improvement milestone

Date: 2026-10-24. Base: `main` at `bda3f2833279e2b7704d61b4907a63aa8111884c`.

## Scope

Make the existing 66-workflow skill easier to route, inspect, and verify while keeping the website lightweight and its claims accurate.

## Decisions

- Keep one canonical Skill and `data/capabilities.json` as its workflow source.
- Generate a machine-readable index with minimum and optional host capabilities. Optional tools are suggestions only; authorization and task risk are decided at execution time.
- Add academic guidance for research and quantitative theses.
- Expose tool expectations in the existing capability detail panel.

## Evidence and follow-up

Baseline: 38 Python tests passed before changes. Updated local checks: 40 Python tests passed, 7 JavaScript tests passed, catalog generation check passed, and app.js syntax passed. GitHub CI is a separate gate to check on the PR head SHA. Browser visual inspection and live GitHub Pages smoke test remain separate release gates.

Continuation: the start screen now accepts a local-only goal and constraints, offers five task examples, and starts without an implicit workflow selection. A deterministic offline Skill archive builder and release checklist were added. On this continuation, 42 Python tests, 8 JavaScript tests, catalog consistency, app.js syntax, and diff whitespace checks passed locally. Check CI on the updated PR head before merging.
