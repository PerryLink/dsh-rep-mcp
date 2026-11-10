# dsh-rep-mcp

**A stdio MCP server for REP v1 records: verify the seal, inspect claims, list sealed reports.**

*Any MCP client can now check a `.rep.json` file without running the whole harness — the same `verifyRecordFile` the `dsh-rep-verify` CLI uses, exposed as three read-only tools.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24.9-brightgreen.svg)]()

English · [简体中文](README-zh.md)

---

## Tools

| Tool | Input | Output |
|---|---|---|
| `rep_verify` | `path`, optional `objectsDir` | manifest seal, file hash, snapshot checks, anchor quote checks, issues |
| `rep_inspect` | `path` | record id, counts, manifest summary, every claim's verdict |
| `rep_list` | `dir` (default `.`) | `*.rep.json` files (cap 200) with id/counts |

All three are read-only. There is no network access and no write path.

## Run it

```sh
# from a checkout
node lib/bin.js

# or from npm (after publish)
npx -y dsh-rep-mcp
```

The transport is MCP over stdio: one JSON-RPC message per line.

## Use it from DSH

DSH's MCP panel accepts any stdio server. Add:

```json
{
  "mcpServers": {
    "rep": {
      "command": "npx",
      "args": ["-y", "dsh-rep-mcp"]
    }
  }
}
```

Then ask the agent to `rep_verify` the report it just produced. The same server
works in any other MCP client (editor, desktop app, CI wrapper).

## Example

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"rep_verify","arguments":{"path":"report.rep.json","objectsDir":".research-rep/objects"}}}
```

`rep_verify` without `objectsDir` still checks the manifest seal and anchor
quotes; snapshot bytes are reported as not checked.

## What it does not do

- **No writing, sealing or repairing.** It verifies and reports.
- **No network.** No Crossref, no Zotero, no telemetry.
- **No semantic checking.** Claim support is `dsh-claim-check`; this server reports what the record says.
- **No DSH plugin row.** It is a standard MCP server; DSH consumes it through the MCP panel.

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
npm run verify:package
```

Tests drive the handler directly and also exercise the newline-delimited stdio
loop; the fixture is a sealed REP record from `dsh-research-core`.

## License

Apache-2.0. See [LICENSE](LICENSE).
