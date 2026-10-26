# JRHagents Cloudflare Host Adapter

Server-side Cloudflare Pages adapter for the JRHagents host bridge.

Read operations:

- account metadata;
- Pages project list/details;
- Pages deployment list.

Approval-required operations:

- create a Pages deployment from a Git branch;
- retry a deployment;
- roll back a deployment.

The host injects a scoped Cloudflare API token and account ID. The browser,
workflow JSON, and portable Skill never receive the token. The deployment
endpoints follow Cloudflare's Pages API; create deployment uses multipart form
data for the Git branch, as required by the official API documentation.
