# CLI Spec — Coalition

## Branding

- Agent/CLI name: **Coalition**
- On startup, render an ASCII banner using **Figlet** (e.g. `figlet("Coalition")`), styled with **Chalk**.
- Use consistent color conventions throughout the CLI, e.g.:
  - Green — success / approved
  - Yellow — pending / awaiting approval
  - Red — errors / rejected / destructive actions
  - Cyan/Blue — informational / agent "thinking" output

## Commands (via Commander.js)

### `coalition wakeup`

- Boots the agent into an interactive session.
- Shows the Figlet banner.
- Initializes: Action Tracker, Tool Executor (with tool registry), Overlay, OpenRouter client.
- Drops the user into an interactive prompt loop (via Clack) where they can type natural-language requests.

### Additional commands (suggested for MVP, can expand later)

- `coalition config` — set/view configuration (OpenRouter API key, FireCrawl API key, default model).
- `coalition run "<task>"` — one-shot mode: run a single task non-interactively (still respects approval flow unless a `--yes`/auto-approve flag is passed for scripted use).
- `coalition history` — view past actions/tasks and their outcomes (from the Action Tracker).

## Interactive experience (via Clack)

- `select` — used for:
  - Approval prompts (Approve / Reject / View diff / Edit).
  - Model selection when multiple OpenRouter models are configured.
- `isCancel` — used to detect when the user cancels out of any prompt (e.g. Ctrl+C or Esc) and gracefully abort the current action without leaving partial state (no orphaned Overlay changes, Action Tracker marked as `rejected`/`cancelled`).

## Example interaction flow

```
$ coalition wakeup

  ______  ____  ___    __    ____________________  _   __
 / ____/ / __ \/   |  / /   /  _/_  __/  _/ __ \/ | / /
/ /     / / / / /| | / /    / /  / /  / // / / /  |/ /
/ /___ / /_/ / ___ |/ /____/ /  / / _/ // /_/ / /|  /
\____/ \____/_/  |_/_____/___/ /_/ /___/\____/_/ |_/

Coalition is awake. What do you need done?

> refactor the auth middleware to use async/await

[Coalition] Planning...
[Coalition] Proposed changes to src/middleware/auth.ts

--- diff preview (via Chalk-colored output) ---

? What would you like to do?
❯ Approve
  Reject
  View full diff
  Cancel

[Coalition] Changes applied. Task complete.
```

## Config/env

- `.env` (or `coalition config`) should hold:
  - `OPENROUTER_API_KEY`
  - `FIRECRAWL_API_KEY`
  - `DEFAULT_MODEL` (OpenRouter model slug)
