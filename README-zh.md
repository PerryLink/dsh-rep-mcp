# dsh-rep-mcp

**面向 REP v1 记录的 stdio MCP 服务器：校验密封、检查 claim、列出已密封报告。**

*任何 MCP 客户端都能在没有完整 harness 的情况下检查 `.rep.json` —— 复用 `dsh-rep-verify` CLI 同一个 `verifyRecordFile`，暴露为三个只读工具。*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24.9-brightgreen.svg)]()

[English](README.md) · 简体中文

---

## 工具

| 工具 | 输入 | 输出 |
|---|---|---|
| `rep_verify` | `path`，可选 `objectsDir` | 密封比对、文件哈希、快照校验、锚点引文校验、问题列表 |
| `rep_inspect` | `path` | 记录 id、各项计数、manifest 摘要、每条 claim 的 verdict |
| `rep_list` | `dir`（默认 `.`） | `*.rep.json` 列表（上限 200）及 id/计数 |

三个工具全部只读：不联网、不写盘。

## 运行

```sh
# 源码
node lib/bin.js

# npm（发布后）
npx -y dsh-rep-mcp
```

传输为 MCP over stdio：一行一条 JSON-RPC 消息。

## 在 DSH 里使用

DSH 的 MCP 面板接受任意 stdio server：

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

然后让 agent 对刚生成的报告调用 `rep_verify`。同一个 server 也能用在任何其它 MCP 客户端里。

## 示例

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"rep_verify","arguments":{"path":"report.rep.json","objectsDir":".research-rep/objects"}}}
```

不带 `objectsDir` 时仍校验 manifest 密封与锚点引文；快照字节会标为未检查。

## 它不做什么

- **不写入、不密封、不修复。** 只校验并报告。
- **不联网。** 不访问 Crossref/Zotero，无遥测。
- **不做语义判断。** claim 支持性由 `dsh-claim-check` 负责；这里只报告记录里写了什么。
- **不是 DSH 插件行。** 它是标准 MCP server，通过 MCP 面板接入。

## 开发

```sh
npm install
npm run typecheck
npm test
npm run build
npm run verify:package
```

测试直接驱动 handler，也覆盖换行分隔的 stdio 循环；fixture 是 `dsh-research-core` 的已密封记录。

## 许可

Apache-2.0，见 [LICENSE](LICENSE)。
