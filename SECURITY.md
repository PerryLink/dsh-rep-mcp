# Security

## Scope

`dsh-rep-mcp` is a read-only MCP server over stdio. It exposes three tools —
`rep_verify`, `rep_inspect` and `rep_list` — and nothing else.

- **Read-only.** The three tools open `.rep.json` records and, for `rep_verify`,
  an optional `objects/` directory for snapshot byte checks. There is no write,
  rename or delete path in the package.
- **No network.** The process opens no sockets; all protocol traffic is
  newline-delimited JSON-RPC 2.0 on stdin/stdout.
- **No credentials.** The package reads no environment secrets and logs no file
  contents. Tool results carry the record's own fields (ids, counts, verdicts)
  and, for listing, file names.
- **Untrusted input is data.** A malformed record, unreadable path or non-JSON
  file is reported as an MCP tool error (`isError: true`); it never crashes the
  server or executes record content.

The caller chooses every path. Run the server with the same filesystem
permissions you would give any local read-only tool.

## Supported versions

The latest published `0.1.x` release receives security fixes.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting (Security → Advisories) on
<https://github.com/PerryLink/dsh-rep-mcp>, or open a minimal issue asking for a
private channel if advisories are unavailable. Do not include credentials,
personal data or unpublished manuscripts in a public issue.
