# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-10

### Added

- stdio MCP server (`dsh-rep-mcp`) with three read-only tools:
  `rep_verify` (manifest seal, snapshots, anchors), `rep_inspect` (counts and
  claim verdicts) and `rep_list` (directory scan, cap 200).
- Newline-delimited JSON-RPC transport with initialize/ping/tools-list/call.
- Tests for the handlers, the stdio loop and the package contract.
