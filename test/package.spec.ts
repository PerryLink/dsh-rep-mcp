/**
 * Package contract: version, bin, dependency pin.
 * @module test/package.spec
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { VERSION } from '../src/version.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('package contract', () => {
  it('single-sources the version and declares the bin', async () => {
    const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as {
      version: string
      bin?: Record<string, string>
      dependencies?: Record<string, string>
    }
    expect(VERSION).toBe(pkg.version)
    expect(pkg.bin?.['dsh-rep-mcp']).toBe('./lib/bin.js')
    expect(pkg.dependencies?.['@perrylink/dsh-research-core']).toBeDefined()
  })
})
