# Project Overview — Coalition

## What it is

Coalition is a terminal-native autonomous AI agent. It runs as a CLI tool, accepts natural-language instructions, plans and executes actions against the local file system and shell, and scrapes the web when needed — all mediated by a safety layer that stages changes and asks for human approval before committing them to disk.

It is inspired by the OpenClaw project and is being built as an MVP first, with room to expand (voice control, custom integrations, more tools) afterward.

## Goals for the MVP

1. A working CLI (`coalition`) that can be installed and run locally.
2. A `wakeup` command that boots the agent into an interactive session.
3. An agent core that can:
   - Track the state of a task/action from request → plan → execution → completion.
   - Safely execute tools (read/write/delete files, run shell commands, analyze a codebase).
   - Stage all file changes in a virtual **Overlay** before anything touches the real disk.
   - Present an **approval flow** so the user reviews and accepts/rejects AI-suggested changes.
4. LLM access via **OpenRouter**, so the agent isn't locked to a single model provider.
5. Basic **web scraping** capability via **FireCrawl** for tasks that need external/live data.
6. A clean, colorful terminal UI (Chalk) with a branded startup banner (Figlet).

## Non-goals (for MVP — future expansion)

- Voice control
- Multi-agent orchestration
- Persistent long-term memory/database
- GUI/desktop app
- Plugin marketplace

These are explicitly deferred to a post-MVP phase.

## Guiding principles

- **Safety first:** nothing is written, deleted, or executed on the real file system without going through the Overlay + approval flow.
- **Model-agnostic:** the agent shouldn't be hard-wired to one LLM; OpenRouter gives flexibility to swap models.
- **Terminal-native UX:** the agent should feel good to use directly in a terminal — clear prompts, color-coded output, minimal friction.
- **Extensible tools:** the Tool Executor should make it easy to add new tools later (voice, more integrations) without re-architecting the core.
