# Local quality workflow

The source checkout includes a small, optional quality workflow. Run it only
in a trusted checkout: it executes this project's Python and JavaScript tests.
It does not install a model, run browser tests, test live integrations, or
perform a comprehensive security audit.

```bash
python tools/verify_project.py
python tools/verify_project.py --json
```

The command runs the Python unit suite, checks generated catalog consistency,
runs the JavaScript test suite if Node.js is available, and separately checks
the syntax of `app.js`, `catalog.js`, and `universal.js`. Each outcome is based
on its actual process exit code. If
Node.js or a required executable is missing, the relevant check is `NOT RUN`.
The aggregate is `FAILED` if any check fails, `NOT RUN` if any is missing,
and `PASSED` only when all listed checks pass. Exit codes are 1, 2, and 0
respectively. Process output is intentionally not recorded; run the individual
commands from `AGENTS.md` when you need diagnostic output.

For failed or missing checks, the command displays an improvement proposal
based on the observed status. It does not apply that proposal or change a
workflow. The Python API can also record an explicit review of the exact
proposal; see [LEARNING.md](LEARNING.md).

An operator may opt in to save a status-only summary to an existing trusted
directory. The path and project key are chosen by the operator:

```bash
python tools/verify_project.py --memory-file /path/to/private/quality.sqlite3 --project my-project --confirm-non-sensitive
```

The saved summary contains only check names and statuses, not test output.
The local SQLite file is not encrypted. A real host must obtain consent,
protect the file, and treat recalled entries as untrusted context. See
[PROJECT_MEMORY.md](PROJECT_MEMORY.md) for retrieval, deletion, and limits.

Separately, `python tools/agent_config_audit.py --path .` performs a limited
read-only configuration scan; see [AGENT_CONFIG_AUDIT.md](AGENT_CONFIG_AUDIT.md).
`no_configs` does not mean the environment is secure. The auditor does not run
automatically during the quality workflow.

These modules and commands are available from the repository checkout. The
standalone Skill and plugin packages contain only the portable Skill; they do
not include the optional Python runtime or these tools.
