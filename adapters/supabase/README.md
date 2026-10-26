# JRHagents Supabase Host Adapter

Server-side REST adapter for allowlisted Supabase tables.

- `supabase.table.select` is read-only and limited to an explicit table list;
- `supabase.table.insert` is high-risk and approval-required;
- `supabase.table.update` is high-risk, approval-required, and requires an
  equality filter so an accidental unfiltered update cannot run.

The host injects the project URL, key, and table allowlist. Never expose a
secret/service-role key in the browser. Supabase Data API access still depends
on grants and Row Level Security; this adapter does not bypass them.

The adapter deliberately does not expose arbitrary SQL, delete, auth-admin,
or unrestricted RPC operations. Add those only as separately reviewed,
allowlisted handlers.
