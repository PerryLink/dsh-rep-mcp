/**
 * `dsh-rep-mcp` — MCP server for REP v1 research records.
 * @module dsh-rep-mcp
 */

export { runServer, handleRpc, TOOLS } from './server.ts'
export type { McpTool, RpcRequest } from './server.ts'
export { VERSION } from './version.ts'
