# JRHagents GitHub Host Adapter

This is a server-side adapter for a host application. It supplies three
explicit handlers to the JRHagents Host Adapter Bridge:

- `github.repo.read` — read repository metadata;
- `github.pr.list` — list open or closed pull requests;
- `github.pr.merge` — merge a pull request, high risk and approval-required.

The adapter never reads a token from browser storage, source files, or the
workflow JSON. The host must inject a token through its private secret store.
The merge handler must only be exposed after the host has approved the exact
step ID through the runtime approval gate.

Example host wiring:

```js
const { createGitHubAdapter } = require('./adapters/github');
const github = createGitHubAdapter({ token: process.env.GITHUB_TOKEN });
const host = createHostAdapter(github);
```

Tests use an injected fake transport; they do not call GitHub.
