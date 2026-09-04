# Coalition

A terminal-native autonomous AI agent that helps you with software engineering tasks — fixing bugs, adding features, refactoring, and explaining code.

## How It Works

```
You (terminal) ──→ Coalition ──→ AI Model (Ollama/OpenRouter)
                     │
                ┌────┴────┐
                │  Tools  │
                └────┬────┘
                     │
              ┌──────┴──────┐
              │   Overlay   │ ← Stages changes before writing
              └──────┬──────┘
                     │
              ┌──────┴──────┐
              │  Approval   │ ← You approve/reject changes
              └─────────────┘
```

## Commands

| Command | Description |
|---------|-------------|
| `coalition wakeup` | Start interactive AI session |
| `coalition run <task>` | Run a single task (one-shot) |
| `coalition config` | Configure API keys and model |
| `coalition status` | Show backend health and tools |
| `coalition history` | View past tasks |

## Setup

```bash
npm install
npm run build
coalition config
coalition wakeup
```

## Backends

**Primary:** Ollama (local, private, free)
**Fallback:** OpenRouter (cloud, requires API key)

## Project Structure

```
src/
├── cli/           # CLI commands
├── core/          # Agent, Overlay, ToolExecutor, LLM clients
├── tools/         # File, shell, analysis, web tools
└── utils/         # Banner, config loader
```
