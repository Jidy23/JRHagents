# JRHagents Web Adapter

This is a dependency-free local review console for the runtime JSON contract.
It validates a plan, displays its steps, and executes only the safe local
`echo` handler. Unknown skills are blocked because a browser page must not
pretend to have GitHub, Cloudflare, filesystem, browser, or model access.

Open `index.html` directly in a browser. For a real integration, replace the
local handler registry with an authenticated host adapter and preserve the
approval boundary from `runtime/`.
