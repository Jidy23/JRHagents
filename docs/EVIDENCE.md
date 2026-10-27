# Verification summaries

The optional `runtime.evidence` module summarizes results supplied by the host.
It does not run commands, inspect a browser, verify that a source is authentic,
or persist the results. The host must actually perform each check and decide
which sources and observations to trust. A completed workflow by itself is
not proof that tests passed.

Hosts list the checks needed for a task and provide results for the ones that
were performed. Every absent check becomes `NOT RUN`. The aggregate is
`FAILED` if any required check failed, `NOT RUN` if a check is missing or
skipped, and `PASSED` only if every required check passed. An empty checklist
is `NOT RUN`. Duplicate or unexpected results are rejected.

```python
from runtime.evidence import CheckResult, summarize_checks

# `test_process` is a completed process supplied by the host; this module
# never launches it. `returncode` is the observed integer exit code.
test_result = CheckResult.from_exit_code(
    "unit tests", test_process.returncode, source="local unit test process"
)

# Supply an observation only after actually performing the check. For checks
# not performed, an explicit reason can be recorded instead.
browser = CheckResult.not_run("browser smoke", reason="Browser unavailable")
report = summarize_checks(["unit tests", "browser smoke"], [test_result, browser])
print(report.to_dict())
```

`CheckResult.from_observation(name, passed, source=..., detail=...)` records a
host-observed check, such as a reviewed UI or API response. Exit code zero is
`PASSED`; any other exit code is `FAILED`. Results have bounded names, source
references, and details. They do not carry raw command output. Hosts must
avoid including credentials, sensitive data, or untrusted log content in those
fields and must store reports securely if they choose to persist them.

This module works with existing `RunManager` handlers: a handler can return
observed check data in its output, and the host can convert that output into a
`CheckResult`. Merely importing this module does not add shell, browser, CI,
network, database, or storage capabilities.
