// Post-build step: tsc writes lib/bin.js with the default file mode (0o644),
// which loses the executable bit the `bin` entry needs when the package is
// invoked directly from a checkout. npm/npx fix this on install; this makes a
// clean local build behave the same. Windows has no POSIX execute bit, so the
// chmod is a no-op there (and the package gate skips the check on win32).
import { chmodSync, existsSync } from 'node:fs'

const target = new URL('../lib/bin.js', import.meta.url)
if (existsSync(target)) {
  try {
    chmodSync(target, 0o755)
  } catch {
    // Windows: nothing to do.
  }
}
