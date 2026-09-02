import * as p from "@clack/prompts";
import chalk from "chalk";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { ActionTracker } from "../core/ActionTracker";
import { ToolExecutor } from "../core/ToolExecutor";
import { Overlay } from "../core/Overlay";
import { ApprovalFlow } from "../core/ApprovalFlow";
import { OpenRouterClient } from "../core/OpenRouterClient";
import { Agent } from "../core/Agent";
import {
  readFileTool,
  listDirectoryTool,
  writeFileTool,
  editFileTool,
  deleteFileTool,
} from "../tools/fileSystem";
import {
  analyzeCodebaseTool,
  searchCodebaseTool,
} from "../tools/codebaseAnalysis";
import { shellCommandTool } from "../tools/shell";

function loadEnv(): Record<string, string> {
  const envPath = join(process.cwd(), ".env");
  const env: Record<string, string> = {};

  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim();
          const value = trimmed.slice(eqIndex + 1).trim();
          env[key] = value;
        }
      }
    }
  }

  return env;
}

export async function wakeup(): Promise<void> {
  const env = loadEnv();
  const apiKey = env.OPENROUTER_API_KEY;
  const model = env.DEFAULT_MODEL || "anthropic/claude-3.5-sonnet";

  if (!apiKey) {
    console.log(
      chalk.red(
        "\n⚠️  OpenRouter API key not found. Run `coalition config` to set it up.\n"
      )
    );
    console.log(chalk.gray("Continuing in local mode (no AI)...\n"));
  }

  const actionTracker = new ActionTracker();
  const overlay = new Overlay();
  const toolExecutor = new ToolExecutor(overlay);
  const approvalFlow = new ApprovalFlow(overlay);
  const openRouter = apiKey
    ? new OpenRouterClient(apiKey, model)
    : null;

  // Register all tools
  toolExecutor.register(readFileTool);
  toolExecutor.register(listDirectoryTool);
  toolExecutor.register(writeFileTool);
  toolExecutor.register(editFileTool);
  toolExecutor.register(deleteFileTool);
  toolExecutor.register(analyzeCodebaseTool);
  toolExecutor.register(searchCodebaseTool);
  toolExecutor.register(shellCommandTool);

  console.log(
    chalk.gray(
      `Registered ${toolExecutor.getAllTools().length} tools: ${toolExecutor.getAllTools().map((t) => t.name).join(", ")}`
    )
  );

  if (openRouter) {
    console.log(chalk.gray(`Model: ${model}`));
  }

  console.log();

  const agent = openRouter
    ? new Agent(
        actionTracker,
        toolExecutor,
        overlay,
        approvalFlow,
        openRouter
      )
    : null;

  while (true) {
    const input = await p.text({
      message: chalk.cyan(">"),
    });

    if (p.isCancel(input)) {
      console.log(chalk.yellow("\nCoalition going back to sleep. Goodbye!"));
      break;
    }

    if (!input) continue;

    const command = input.trim().toLowerCase();

    if (command === "help") {
      console.log(chalk.cyan("\nAvailable commands:"));
      console.log("  help              - Show this help");
      console.log("  quit              - Exit Coalition");
      console.log("\nOr type any natural language request for the AI agent.\n");
      continue;
    }

    if (command === "quit" || command === "exit") {
      console.log(chalk.yellow("Coalition going back to sleep. Goodbye!"));
      break;
    }

    if (agent) {
      try {
        await agent.processUserInput(input);
      } catch (error) {
        console.log(
          chalk.red(
            `\nError: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    } else {
      // Local mode without AI
      await handleLocalCommand(input, actionTracker, toolExecutor, overlay, approvalFlow);
    }
  }
}

async function handleLocalCommand(
  input: string,
  actionTracker: ActionTracker,
  toolExecutor: ToolExecutor,
  overlay: Overlay,
  approvalFlow: ApprovalFlow
): Promise<void> {
  const task = actionTracker.createTask(input);
  actionTracker.updateStatus(task.id, "planning");

  const command = input.trim().toLowerCase();

  if (command.startsWith("read ") || command.startsWith("show ")) {
    const filePath = input.slice(5).trim();
    actionTracker.updateStatus(task.id, "in_progress");
    const result = await toolExecutor.execute("read_file", { path: filePath });
    console.log(result.success ? chalk.white(result.output) : chalk.red(result.output));
    actionTracker.updateStatus(task.id, "completed");
  } else if (command.startsWith("list ") || command === "list") {
    const dirPath = command === "list" ? "." : input.slice(5).trim();
    actionTracker.updateStatus(task.id, "in_progress");
    const result = await toolExecutor.execute("list_directory", { path: dirPath });
    console.log(result.success ? chalk.white(result.output) : chalk.red(result.output));
    actionTracker.updateStatus(task.id, "completed");
  } else if (command.startsWith("analyze ")) {
    const dirPath = input.slice(8).trim();
    actionTracker.updateStatus(task.id, "in_progress");
    const result = await toolExecutor.execute("analyze_codebase", { path: dirPath });
    console.log(result.success ? chalk.white(result.output) : chalk.red(result.output));
    actionTracker.updateStatus(task.id, "completed");
  } else if (command.startsWith("search ")) {
    const query = input.slice(7).trim();
    actionTracker.updateStatus(task.id, "in_progress");
    const result = await toolExecutor.execute("search_codebase", { query });
    console.log(result.success ? chalk.white(result.output) : chalk.red(result.output));
    actionTracker.updateStatus(task.id, "completed");
  } else {
    console.log(
      chalk.yellow(
        '[Local mode] AI integration requires OpenRouter API key. Run "coalition config" to set it up.'
      )
    );
    actionTracker.updateStatus(task.id, "completed");
  }
}
