# Coalition — Autonomous Terminal AI Agent

**Coalition** is a terminal-native autonomous AI agent that bridges LLM reasoning with real local file system and shell operations, using a staged "Overlay" system and an explicit human-approval flow so nothing touches disk without review.

## Features

- 🤖 **AI-Powered Agent** — Natural language interface via OpenRouter (model-agnostic)
- 🛡️ **Safety First** — All file changes staged in a virtual Overlay before disk writes
- ✅ **Human Approval** — Review and approve/reject AI-suggested changes
- 📁 **File Operations** — Read, write, edit, delete files with approval flow
- 🔍 **Codebase Analysis** — Analyze project structure and search across files
- 🐚 **Shell Execution** — Run shell commands with safety checks
- 🌐 **Web Scraping** — Fetch and crawl web content via FireCrawl

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/nabeelali0707/coalition-cli.git
cd coalition-cli

# Install dependencies
npm install

# Build the project
npm run build
```

### Configuration

```bash
# Set up your API keys
coalition config
```

Or create a `.env` file:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
DEFAULT_MODEL=anthropic/claude-3.5-sonnet
```

### Usage

```bash
# Boot the agent into an interactive session
coalition wakeup

# Configure settings
coalition config
```

## Interactive Commands

Once in the interactive session (`coalition wakeup`):

| Command | Description |
|---------|-------------|
| `help` | Show available commands |
| `quit` | Exit Coalition |

Or simply type any natural language request and the AI agent will help you!

## Architecture

```
User input (CLI/prompt)
        ↓
   Action Tracker  ← tracks task lifecycle
        ↓
   Agent / LLM (via OpenRouter)  ← decides what tools to call
        ↓
   Tool Executor  ← routes to correct tool
        ↓
   Overlay System  ← stages file changes virtually
        ↓
   Approval Flow  ← user reviews staged changes
        ↓
   Commit to disk / Discard
```

## Tools

| Tool | Approval Required | Description |
|------|-------------------|-------------|
| `read_file` | No | Read file contents |
| `list_directory` | No | List directory contents |
| `write_file` | **Yes** | Create or overwrite a file |
| `edit_file` | **Yes** | Edit a file by replacing content |
| `delete_file` | **Yes** | Delete a file |
| `run_shell_command` | **Yes** | Execute a shell command |
| `analyze_codebase` | No | Analyze project structure |
| `search_codebase` | No | Search for patterns in files |
| `scrape_url` | No | Scrape a web URL |
| `crawl_site` | No | Crawl multiple pages |

## Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js
- **CLI:** Commander.js
- **Interactive Prompts:** @clack/prompts
- **Terminal Styling:** Chalk + Figlet
- **LLM Provider:** OpenRouter (model-agnostic)
- **Web Scraping:** FireCrawl

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck
```

## License

MIT
