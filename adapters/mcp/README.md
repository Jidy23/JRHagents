# JRHagents MCP Adapter

MCP client boundary for the JRHagents host.

- `server/discover` negotiates server capabilities;
- `tools/list` discovers tool metadata;
- `tools/call` is blocked unless the tool is explicitly marked safe or the
  exact invocation receives approval;
- every request carries JSON-RPC 2.0 metadata and a unique request ID;
- the transport is injected by the host, so this package does not create
  network, stdio, OAuth, or process connections by itself.

This follows MCP's host/client/server model and JSON-RPC tool operations. The
host must still own transport authentication, server lifecycle, user consent,
and audit persistence.
