# JRHagents Unified Host Runtime

`createJRHHost` composes explicit adapters into one execution surface. A host
can combine GitHub, Cloudflare, Supabase, and MCP adapters in one workflow.

Security properties:

- only adapters passed by the host are available;
- optional `allowedSkills` narrows the surface further;
- duplicate skill IDs are rejected;
- high-risk skills must declare approval;
- missing handlers fail closed;
- approval is checked against the exact workflow step ID;
- credentials remain inside their adapter and never enter the plan.

The host runtime does not discover or connect services by itself. The host
application owns adapter construction, authentication, lifecycle, and audit
storage.
