#!/usr/bin/env node
/**
 * `dsh-rep-mcp` executable: MCP over stdio.
 * @module dsh-rep-mcp/bin
 */

import { runServer } from './server.ts'

await runServer({
  input: process.stdin,
  output: process.stdout,
  error: message => process.stderr.write(`${message}\n`),
})
