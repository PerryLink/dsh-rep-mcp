// Post-build package gate.
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
const fail = message => {
  console.error(`verify-package: ${message}`)
  process.exit(1)
}

for (const file of ['lib/index.js', 'lib/index.d.ts', 'lib/bin.js', 'README.md', 'README-zh.md', 'CHANGELOG.md', 'LICENSE']) {
  if (!existsSync(path.join(root, file))) fail(`missing ${file} (run pnpm run build)`)
}
if (pkg.bin?.['dsh-rep-mcp'] !== './lib/bin.js') fail('package.json#bin must point at ./lib/bin.js')
if (!existsSync(path.join(root, 'lib/bin.js'))) fail('lib/bin.js missing')
// Windows has no POSIX execute bit: npm/npx launch the bin through node, so the
// bit is meaningless there. Everywhere else the build/postbuild must set it.
if (process.platform !== 'win32' && (statSync(path.join(root, 'lib/bin.js')).mode & 0o111) === 0) {
  fail('lib/bin.js is not executable')
}
if (pkg.dependencies?.['@perrylink/dsh-research-core'] === undefined) fail('the REP core dependency is required')
const bin = readFileSync(path.join(root, 'lib/bin.js'), 'utf8')
if (!bin.startsWith('#!/usr/bin/env node')) fail('lib/bin.js lost its shebang')
const server = readFileSync(path.join(root, 'src/server.ts'), 'utf8')
for (const tool of ['rep_verify', 'rep_inspect', 'rep_list']) {
  if (!server.includes(tool)) fail(`src/server.ts is missing ${tool}`)
}
console.log('verify-package: ok (bin executable, three read-only tools present)')
