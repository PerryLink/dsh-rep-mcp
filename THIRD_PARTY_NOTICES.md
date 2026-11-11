# Third-party notices

## Runtime code

This package bundles no third-party source code.

Its single runtime dependency is
[`@perrylink/dsh-research-core`](https://github.com/PerryLink/dsh-research-core)
`0.1.1` (Apache-2.0) — a package from the same family, used for the shared REP
v1 verifier. That package has no runtime dependencies of its own.

`@deepseek-ai/cordis` and `@deepseek-ai/schemastery` are peer dependencies
provided by the host runtime; they are not bundled in this package's tarball.

## Development-only tooling

TypeScript, Vitest and `@types/node` are development dependencies. They are not
bundled and are not part of the published tarball.

## License

`dsh-rep-mcp` is licensed under Apache-2.0. See [LICENSE](LICENSE).
