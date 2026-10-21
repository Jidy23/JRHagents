# Software engineering playbook

1. Discover repository, stack, scripts, tests, current branch, and working tree; **do not overwrite unrelated changes**.
2. Write executable acceptance criteria tied to user-visible behavior, including errors/loading/empty states.
3. Prefer minimal diff; preserve conventions; avoid dependencies unless benefit is justified.
4. Check edge cases: invalid input, stale network, auth, concurrency, accessibility, offline, performance, and mobile where applicable.
5. Run the cheapest relevant verification first (syntax/unit), then build/integration, then UI smoke if tools exist. Do not report tests that never ran.
6. For failing tests: identify root cause, fix source not assertions unless test is wrong. Re-test affected behavior.
7. External/deploy/security-sensitive writes require user approval and verified access. Record exact changed paths, commit if actually created.

## Completion matrix

| Claim | Minimal evidence |
|---|---|
| Build passes | build command output / exit code |
| Function works | test or observed behavior with expected vs actual |
| UI mobile compatible | measured viewport screenshots or responsive tests |
| API connected | real response from intended endpoint with authorization |
| Production ready | performance, security, rollback and operations checks—not only a green build |

Avoid saying "100% error-free" or "all features done" based on limited tests. When chat-only, offer code/procedure but label execution **NOT RUN**.
