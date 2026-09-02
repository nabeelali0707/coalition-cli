# Coalition — Autonomous Terminal AI Agent

**Coalition** is a terminal-based autonomous AI agent, inspired by the OpenClaw project. It bridges LLM reasoning with real local file system and shell operations, using a staged "Overlay" system and an explicit human-approval flow so nothing touches disk without review.

This folder contains the planning docs for building the MVP. Hand these to a coding agent (or use them yourself) as the spec to start implementation.

## Docs in this package

| File | Purpose |
|---|---|
| `01-PROJECT_OVERVIEW.md` | What Coalition is, goals, and MVP scope |
| `02-TECH_STACK.md` | Full technology stack and why each piece was chosen |
| `03-ARCHITECTURE.md` | Core architecture: Action Tracker, Tool Executor, Overlay system, approval flow |
| `04-TOOLS_SPEC.md` | Agent tools to implement (file ops, shell exec, codebase analysis, web scraping) |
| `05-CLI_SPEC.md` | CLI commands, interactive prompts, terminal UI/branding |
| `06-BUILD_ROADMAP.md` | Suggested build order / milestones for the coding agent |

## Quick facts

- **Name:** Coalition
- **Language/Runtime:** TypeScript + Node.js
- **LLM Provider:** OpenRouter (model-agnostic)
- **Core safety pattern:** Overlay (staged changes) + Approval Flow before disk writes
- **Inspired by:** OpenClaw
