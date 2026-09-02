# Build Roadmap — Coalition MVP

Suggested order of implementation for a coding agent picking this up. Each milestone should be independently testable before moving to the next.

## Milestone 1 — Project Initialization
- Init TypeScript + Node.js project (`package.json`, `tsconfig.json`).
- Add Commander.js, wire up a base CLI entry point (`coalition --help`).
- Add Chalk + Figlet, get a styled banner rendering.
- Add `.env` handling (dotenv) for API keys.

## Milestone 2 — CLI Interaction Layer
- Implement `coalition wakeup` command skeleton.
- Add Clack (`select`, `isCancel`) for a basic interactive prompt loop (no AI yet — just echo input).
- Confirm cancel/abort handling works cleanly.

## Milestone 3 — Agent Core Foundations
- Build the **Action Tracker** (in-memory state machine for tasks).
- Build the **Tool Executor** skeleton with a tool registry (no real tools yet, just the routing mechanism).
- Write tests confirming state transitions and tool routing work in isolation.

## Milestone 4 — Overlay System
- Build the virtual **Overlay**: stage writes/edits/deletes in memory, generate diffs, flush-on-approval / discard-on-reject.
- This is the highest-risk, highest-importance component — test thoroughly before connecting it to real tools.

## Milestone 5 — File System & Shell Tools
- Implement `read_file`, `list_directory`, `write_file`, `edit_file`, `delete_file` (writes routed through Overlay).
- Implement `run_shell_command` with approval gating.
- Wire the **Approval Flow** UI (Clack `select` + Chalk-colored diff preview) into the Overlay's approve/reject path.

## Milestone 6 — AI Integration (OpenRouter)
- Add OpenRouter client, config for API key + default model.
- Implement the agent loop: user request → LLM call (with tool definitions) → tool call → result → LLM continues → final response.
- Confirm the LLM can call file tools end-to-end through the full approval flow.

## Milestone 7 — Codebase Analysis Tools
- Implement `analyze_codebase` and `search_codebase`.
- Use these to give the LLM better context before proposing file changes.

## Milestone 8 — Web Scraping (FireCrawl)
- Integrate FireCrawl client.
- Implement `scrape_url` and `crawl_site` tools.
- Confirm the agent can pull external data into its reasoning/responses.

## Milestone 9 — Polish & MVP Wrap-up
- `coalition config` command for managing API keys/model.
- `coalition history` command backed by the Action Tracker.
- Consistent color/status conventions across all CLI output.
- README + usage docs for end users (separate from this planning doc set).

## Post-MVP (future expansion, not in initial scope)
- Plan Mode (multi-step task planning/visualization before execution).
- Voice control input.
- Additional external integrations beyond FireCrawl.
- Persistent history/database instead of in-memory Action Tracker.
