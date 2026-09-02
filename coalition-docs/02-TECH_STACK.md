# Tech Stack — Coalition

## Core

| Layer | Choice | Notes |
|---|---|---|
| Language | **TypeScript** | Type-safe development across the whole agent |
| Runtime | **Node.js** | Backend environment the CLI and agent run on |

## CLI & Interaction

| Purpose | Choice | Notes |
|---|---|---|
| Command framework | **Commander.js** | Defines terminal commands, e.g. `wakeup` |
| Interactive prompts | **Clack** | Specifically `select` and `isCancel` for interactive flows (model selection, approval prompts, cancel handling) |

## Styling & Terminal UI

| Purpose | Choice | Notes |
|---|---|---|
| Terminal color/formatting | **Chalk** | Colors and styles CLI output (status messages, diffs, warnings) |
| Terminal branding/banner | **Figlet** | Renders the "Coalition" ASCII banner on startup |

## AI Integration

| Purpose | Choice | Notes |
|---|---|---|
| LLM provider | **OpenRouter** | Primary provider; gives access to multiple underlying models without locking into one vendor |

## Web Scraping / External Data

| Purpose | Choice | Notes |
|---|---|---|
| Web scraping | **FireCrawl** | Used for scraping and interacting with web data as an agent tool |

## File System Control

| Purpose | Choice | Notes |
|---|---|---|
| File operations | Custom utilities | Read/write/delete/modify local files |
| Change staging | Custom **Overlay** system | Virtual layer that holds pending file changes before they're applied to real disk — enables preview/approval before commit |

## Suggested package list (starting point)

```
typescript
ts-node (or tsx)
@types/node
commander
@clack/prompts
chalk
figlet
@types/figlet
dotenv        # for OpenRouter API key + FireCrawl API key management
```

> Note: exact package names for OpenRouter/FireCrawl SDKs should be confirmed at implementation time — they can be called via plain `fetch`/HTTP requests if no official SDK is preferred.
