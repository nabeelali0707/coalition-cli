# Agent Tools Spec — Coalition

Tools are the concrete capabilities exposed to the LLM through the Tool Executor. Each tool should have: a name, a description (for the LLM), a JSON-schema-like argument definition, and an implementation function.

## 1. File System Tools

All destructive/writing operations go through the **Overlay** (never write directly to disk).

- `read_file(path)` — read and return file contents. Safe, no approval needed.
- `list_directory(path)` — list files/folders. Safe, no approval needed.
- `write_file(path, content)` — stage a new/overwritten file via Overlay. Requires approval.
- `edit_file(path, changes)` — stage a modification (e.g. patch/diff-style edit) via Overlay. Requires approval.
- `delete_file(path)` — stage a deletion via Overlay. Requires approval.

## 2. Shell Command Execution

- `run_shell_command(command, cwd?)` — execute a shell command.
  - Should be treated as high-risk: require approval before running, same as file writes.
  - Capture stdout/stderr and return to the agent.
  - Consider a denylist/allowlist for especially dangerous commands (e.g. `rm -rf /`) as an extra guardrail on top of the approval flow.

## 3. Codebase Analysis

- `analyze_codebase(path)` — walk a directory, summarize structure (languages used, file counts, entry points, dependency manifests like `package.json`).
  - Useful for giving the LLM context before it proposes changes.
  - Safe/read-only, no approval needed.
- `search_codebase(query, path?)` — grep-style search across files for a term/pattern.
  - Safe/read-only.

## 4. Web Scraping (FireCrawl)

- `scrape_url(url)` — fetch and return cleaned page content via FireCrawl.
- `crawl_site(url, options?)` — crawl multiple pages from a starting URL via FireCrawl, for broader research tasks.
  - Read-only from the agent's perspective (no local file system risk), but still return through the normal tool-result flow so the LLM can use the data.

## Approval requirements summary

| Tool | Approval required? |
|---|---|
| `read_file` | No |
| `list_directory` | No |
| `write_file` | **Yes** |
| `edit_file` | **Yes** |
| `delete_file` | **Yes** |
| `run_shell_command` | **Yes** |
| `analyze_codebase` | No |
| `search_codebase` | No |
| `scrape_url` / `crawl_site` | No (read-only, external) |

## Tool registry shape (suggested)

```ts
interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema; // for LLM function-calling via OpenRouter
  requiresApproval: boolean;
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
}
```

New tools (future: voice control, custom integrations) should be addable by registering a new `ToolDefinition` — no changes to the Tool Executor core required.
