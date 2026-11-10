/**
 * MCP surface: initialize, tools/list, tools/call (inspect/verify/list), stdio.
 * @module test/server.spec
 */

import { PassThrough } from 'node:stream'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { handleRpc, runServer, TOOLS } from '../src/server.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = path.join(here, 'fixtures', 'valid-sealed.rep.json')

interface TextResult {
  readonly content: Array<{ readonly type: string; readonly text: string }>
  readonly isError: boolean
}

function textOf(value: unknown): string {
  const result = value as { result: TextResult }
  return result.result.content[0]?.text ?? ''
}

describe('MCP handlers', () => {
  it('initializes and lists the three read-only tools', async () => {
    const init = await handleRpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } }) as {
      result: { serverInfo: { name: string }; capabilities: { tools: unknown } }
    }
    expect(init.result.serverInfo.name).toBe('dsh-rep-mcp')
    expect(init.result.capabilities.tools).toBeDefined()

    const list = await handleRpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) as { result: { tools: Array<{ name: string }> } }
    expect(list.result.tools.map(tool => tool.name)).toEqual(['rep_verify', 'rep_inspect', 'rep_list'])
    expect(TOOLS).toHaveLength(3)
  })

  it('inspects a sealed fixture', async () => {
    const response = await handleRpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'rep_inspect', arguments: { path: FIXTURE } } })
    const parsed = JSON.parse(textOf(response)) as { recordId: string; claims: number; manifest: { manifestId: string } }
    expect(parsed.recordId).toBe('rec-fixture-sealed')
    expect(parsed.claims).toBe(3)
    expect(parsed.manifest.manifestId).toBeTruthy()
  })

  it('verifies the seal of a sealed fixture', async () => {
    const response = await handleRpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'rep_verify', arguments: { path: FIXTURE } } })
    const result = (response as { result: TextResult }).result
    const parsed = JSON.parse(result.content[0]!.text) as { ok: boolean; manifestSeal: { ok: boolean } | null }
    expect(parsed.ok).toBe(true)
    expect(parsed.manifestSeal?.ok).toBe(true)
    expect(result.isError).toBe(false)
  })

  it('lists records and reports unknown methods/tools', async () => {
    const list = await handleRpc({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'rep_list', arguments: { dir: path.dirname(FIXTURE) } } })
    const parsed = JSON.parse(textOf(list)) as { count: number }
    expect(parsed.count).toBeGreaterThanOrEqual(1)

    const unknownMethod = await handleRpc({ jsonrpc: '2.0', id: 6, method: 'nope' }) as { error: { code: number } }
    expect(unknownMethod.error.code).toBe(-32601)

    const unknownTool = await handleRpc({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'nope', arguments: {} } })
    expect((unknownTool as { result: TextResult }).result.isError).toBe(true)
  })

  it('runs the newline-delimited stdio loop', async () => {
    const input = new PassThrough()
    const output = new PassThrough()
    let buffer = ''
    output.on('data', chunk => { buffer += String(chunk) })
    const done = runServer({ input, output })
    input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })}\n`)
    input.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`)
    input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' })}\n`)
    input.end()
    await done
    const responses = buffer.trim().split('\n').map(line => JSON.parse(line) as { id: number })
    expect(responses.map(response => response.id)).toEqual([1, 2])
  })
})
