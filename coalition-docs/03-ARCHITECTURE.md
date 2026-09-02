# Architecture — Coalition Agent Core

## High-level flow

```
User input (CLI/prompt)
        |
        v
   Action Tracker  <-------- tracks status of the task through its lifecycle
        |
        v
   Agent / LLM (via OpenRouter) --- decides what tool(s) to call
        |
        v
   Tool Executor  --------- routes to the correct tool implementation
        |
        v
   Overlay System --------- stages file changes virtually (no real disk writes yet)
        |
        v
   Approval Flow  --------- user reviews staged changes, approves or rejects
        |
        v
   Commit to disk (only on approval) / Discard (on rejection)
```

## 1. Action Tracker

Responsible for managing the state of a task from creation to completion.

Suggested states:
- `pending` — task received, not yet planned
- `planning` — LLM is deciding steps/tools
- `in_progress` — tool(s) executing
- `awaiting_approval` — changes staged, waiting on user
- `approved` / `rejected`
- `completed` / `failed`

Responsibilities:
- Create and store an action/task record (id, description, timestamps, status, associated tool calls).
- Update status as the task moves through the pipeline.
- Expose state to the CLI so it can render progress to the user.

## 2. Tool Executor

The bridge between the AI's decisions and real-world operations.

Responsibilities:
- Maintain a registry of available tools (see `04-TOOLS_SPEC.md`).
- Receive a tool call request from the LLM (tool name + arguments).
- Validate arguments against the tool's schema.
- Route destructive/file-system tool calls through the **Overlay** rather than executing directly.
- Route shell commands through a safety check (and ideally also require approval).
- Return tool execution results back to the agent loop for the LLM to reason over.

Design note: keep tool implementations decoupled from the executor itself (registry pattern) so new tools can be added without modifying the executor's core logic.

## 3. Overlay System

A virtual layer sitting between the agent's proposed file changes and the real file system.

Responsibilities:
- Intercept file write/edit/delete operations.
- Store proposed changes in-memory (or in a temp workspace) rather than applying them immediately.
- Generate a diff/preview of what would change (new file content vs. current file content).
- Only apply (flush) changes to the real disk once approval is granted.
- Discard staged changes cleanly on rejection, with no side effects.

This is the core safety mechanism of the whole agent — it should be built early and tested thoroughly, since the Tool Executor and Approval Flow both depend on it.

## 4. Approval Flow

Responsibilities:
- After the Overlay stages a change, present it to the user in the terminal (diff view, colored via Chalk).
- Use Clack's `select` prompt to let the user choose: Approve / Reject / Edit / View more detail.
- Use Clack's `isCancel` to gracefully handle the user cancelling out of a prompt (abort the pending action cleanly, no partial writes).
- On approval: instruct the Overlay to flush the change to disk.
- On rejection: discard the staged change and (optionally) let the agent re-plan.

## Data flow summary

- **Action Tracker** = the "what state is this task in" layer.
- **Tool Executor** = the "what capability is being invoked" layer.
- **Overlay** = the "nothing touches disk unreviewed" safety layer.
- **Approval Flow** = the "human in the loop" UX layer.

These four pieces together form the agent core and should be built in roughly that order, since each layer depends on the one before it.
