# Coalition — Autonomous Terminal AI Agent

Coalition is a terminal-native AI agent that executes software engineering tasks using natural language. It bridges LLM reasoning with real file system and shell operations, using a staged Overlay system so nothing touches disk without human review.

## How It Works

```
User input (CLI)
      ↓
  Action Tracker     → Tracks task lifecycle (pending → planning → completed)
      ↓
  Agent (LLM)        → Decides which tools to call via OpenRouter
      ↓
  Tool Executor      → Routes to the correct tool
      ↓
  Overlay System     → Stages file changes in memory (no disk writes yet)
      ↓
  Approval Flow      → User reviews, approves, or rejects changes
      ↓
  Commit / Discard   → Changes applied only on approval
```

## Project Structure

```
src/
├── core/
│   ├── ActionTracker.ts      # Task state machine
│   ├── Agent.ts              # AI agent loop (LLM ↔ tools)
│   ├── Overlay.ts            # Virtual file change staging
│   ├── ToolExecutor.ts       # Tool registry & routing
│   ├── ApprovalFlow.ts       # User approval UI
│   ├── OpenRouterClient.ts   # LLM API client
│   └── FireCrawlClient.ts    # Web scraping client
├── tools/
│   ├── fileSystem.ts         # Read, write, edit, delete files
│   ├── shell.ts              # Shell command execution
│   ├── codebaseAnalysis.ts   # Analyze & search codebase
│   └── webScraping.ts        # Scrape & crawl web pages
├── cli/
│   ├── wakeup.ts             # Interactive session
│   ├── run.ts                # One-shot task mode
│   ├── config.ts             # API key management
│   └── history.ts            # Task history viewer
└── utils/
    └── banner.ts             # CLI banner & branding
```

## Commands

| Command | Description |
|---------|-------------|
| `coalition wakeup` | Start an interactive AI session |
| `coalition run <task>` | Run a single task non-interactively |
| `coalition config` | Set API keys and model settings |
| `coalition history` | View past tasks |

## Setup

```bash
git clone https://github.com/nabeelali0707/coalition-cli.git
cd coalition-cli
npm install
npm run build
npm link
```

Get your free API key at [openrouter.ai](https://openrouter.ai), then:

```bash
coalition config
coalition wakeup
```

## License

MIT
