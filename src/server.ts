/**
 * Minimal MCP server over stdio (newline-delimited JSON-RPC 2.0).
 *
 * Three read-only tools: verify a REP record (seal, snapshots, anchors),
 * inspect its claims/evidence, and list sealed records in a directory. It has
 * no network access and no write path.
 *
 * @module dsh-rep-mcp/server
 */

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { createInterface } from 'node:readline'
import { verifyRecordFile } from '@perrylink/dsh-research-core'
import { VERSION } from './version.ts'

/** One JSON-RPC request. */
export interface RpcRequest {
  readonly jsonrpc: '2.0'
  readonly id?: string | number | null
  readonly method: string
  readonly params?: unknown
}

/** A tool definition. */
export interface McpTool {
  readonly name: string
  readonly description: string
  readonly inputSchema: Record<string, unknown>
}

/** Tool list. */
export const TOOLS: readonly McpTool[] = [
  {
    name: 'rep_verify',
    description: 'Verify a REP v1 record: manifest seal, snapshot hashes and anchor quotes. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to a .rep.json record.' },
        objectsDir: { type: 'string', description: 'Optional objects/ directory for snapshot byte verification.' },
      },
      required: ['path'],
    },
  },
  {
    name: 'rep_inspect',
    description: 'Summarize a REP v1 record: ids, counts, claim verdicts and manifest summary. Read-only.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Path to a .rep.json record.' } },
      required: ['path'],
    },
  },
  {
    name: 'rep_list',
    description: 'List *.rep.json records in one directory (cap 200), newest name order. Read-only.',
    inputSchema: {
      type: 'object',
      properties: { dir: { type: 'string', description: 'Directory to scan (default ".").' } },
    },
  },
]

interface CallResult {
  readonly content: Array<{ readonly type: 'text'; readonly text: string }>
  readonly isError: boolean
}

function text(value: string, isError = false): CallResult {
  return { content: [{ type: 'text', text: value }], isError }
}

function objectOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function countOf(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

async function inspect(file: string): Promise<CallResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    return text(`rep_inspect failed: ${error instanceof Error ? error.message : String(error)}`, true)
  }
  const record = objectOf(parsed)
  if (record === undefined) return text('rep_inspect failed: record is not an object', true)
  const claims = Array.isArray(record.claims) ? record.claims : []
  const verdicts = claims.map(claim => {
    const entry = objectOf(claim) ?? {}
    return { claimId: entry.claimId ?? null, verdict: entry.verdict ?? 'unverified', text: typeof entry.text === 'string' ? entry.text.slice(0, 160) : null }
  })
  const manifest = objectOf(record.manifest)
  return text(JSON.stringify({
    recordId: record.recordId ?? null,
    createdAt: record.createdAt ?? null,
    schemaVersion: record.schemaVersion ?? null,
    evidence: countOf(record.evidence),
    claims: claims.length,
    snapshots: countOf(record.snapshots),
    artifacts: countOf(record.artifacts),
    auditEvents: countOf(record.audit),
    manifest: manifest === undefined ? null : { manifestId: manifest.manifestId ?? null, generatedAt: manifest.generatedAt ?? null, integrity: manifest.integrity ?? null, evidence: countOf(manifest.evidence), claims: countOf(manifest.claims) },
    verdicts,
  }, null, 2), false)
}

async function verify(file: string, objectsDir: string | undefined): Promise<CallResult> {
  const result = await verifyRecordFile(file, objectsDir === undefined ? {} : { objectsDir })
  const summary = {
    ok: result.ok,
    recordId: result.recordId ?? null,
    fileHash: result.fileHash,
    manifestSeal: result.manifestSeal ?? null,
    snapshots: result.snapshots,
    anchors: result.anchors,
    issues: result.issues,
  }
  return text(JSON.stringify(summary, null, 2), !result.ok)
}

async function list(dir: string): Promise<CallResult> {
  let entries: string[]
  try {
    entries = (await readdir(dir)).filter(name => name.endsWith('.rep.json')).sort()
  } catch (error) {
    return text(`rep_list failed: ${error instanceof Error ? error.message : String(error)}`, true)
  }
  const cap = entries.slice(0, 200)
  const items: Array<Record<string, unknown>> = []
  for (const name of cap) {
    const file = path.join(dir, name)
    try {
      const record = objectOf(JSON.parse(await readFile(file, 'utf8')))
      items.push({ file, recordId: record?.recordId ?? null, createdAt: record?.createdAt ?? null, claims: countOf(record?.claims), evidence: countOf(record?.evidence) })
    } catch {
      items.push({ file, error: 'not valid JSON' })
    }
  }
  return text(JSON.stringify({ dir, count: items.length, truncated: entries.length > cap.length, items }, null, 2), false)
}

async function callTool(name: string, args: Record<string, unknown>): Promise<CallResult> {
  switch (name) {
    case 'rep_verify': {
      const file = args.path
      if (typeof file !== 'string' || file === '') return text('rep_verify: path is required', true)
      const objectsDir = typeof args.objectsDir === 'string' && args.objectsDir !== '' ? args.objectsDir : undefined
      return verify(file, objectsDir)
    }
    case 'rep_inspect': {
      const file = args.path
      if (typeof file !== 'string' || file === '') return text('rep_inspect: path is required', true)
      return inspect(file)
    }
    case 'rep_list':
      return list(typeof args.dir === 'string' && args.dir !== '' ? args.dir : '.')
    default:
      return text(`unknown tool: ${name}`, true)
  }
}

/**
 * Handle one JSON-RPC message.
 * @param message - parsed request/notification.
 * @returns the response, or undefined for notifications.
 */
export async function handleRpc(message: RpcRequest): Promise<object | undefined> {
  const id = message.id ?? null
  if (message.method.startsWith('notifications/')) return undefined
  switch (message.method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: objectOf(message.params)?.protocolVersion ?? '2024-11-05',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'dsh-rep-mcp', version: VERSION },
        },
      }
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} }
    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: TOOLS } }
    case 'tools/call': {
      const params = objectOf(message.params) ?? {}
      const name = typeof params.name === 'string' ? params.name : ''
      const args = objectOf(params.arguments) ?? {}
      const result = await callTool(name, args)
      return { jsonrpc: '2.0', id, result }
    }
    default:
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${message.method}` } }
  }
}

/**
 * Run the stdio loop until EOF.
 * @param options - input/output streams and an error sink.
 */
export async function runServer(options: {
  input: NodeJS.ReadableStream
  output: NodeJS.WritableStream
  error?: (message: string) => void
}): Promise<void> {
  const lines = createInterface({ input: options.input, crlfDelay: Infinity })
  for await (const line of lines) {
    if (line.trim() === '') continue
    let message: RpcRequest
    try {
      message = JSON.parse(line) as RpcRequest
    } catch (error) {
      options.output.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: `parse error: ${(error as Error).message}` } })}\n`)
      continue
    }
    try {
      const response = await handleRpc(message)
      if (response !== undefined) options.output.write(`${JSON.stringify(response)}\n`)
    } catch (error) {
      const id = message.id ?? null
      options.output.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32603, message: error instanceof Error ? error.message : String(error) } })}\n`)
    }
  }
}
