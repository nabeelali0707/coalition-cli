import * as p from "@clack/prompts";
import chalk from "chalk";
import { ActionTracker } from "../core/ActionTracker";
import { ToolExecutor } from "../core/ToolExecutor";
import { Overlay } from "../core/Overlay";
import { ApprovalFlow } from "../core/ApprovalFlow";
import {
  readFileTool,
  listDirectoryTool,
  writeFileTool,
  editFileTool,
  deleteFileTool,
} from "../tools/fileSystem";
import { analyzeCodebaseTool, searchCodebaseTool } from "../tools/codebaseAnalysis";
import { shellCommandTool } from "../tools/shell";

export async function wakeup(): Promise<void> {
  const actionTracker = new ActionTracker();
  const overlay = new Overlay();
  const toolExecutor = new ToolExecutor(overlay);
  const approvalFlow = new ApprovalFlow(overlay);

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

  while (true) {
    const input = await p.text({
      message: chalk.cyan(">"),
    });

    if (p.isCancel(input)) {
      console.log(chalk.yellow("\nCoalition going back to sleep. Goodbye!"));
      break;
    }

    if (!input) continue;

    const task = actionTracker.createTask(input);
    actionTracker.updateStatus(task.id, "planning");

    console.log(chalk.gray(`[Task ${task.id.slice(0, 8)}] Received: "${input}"`));
    console.log(chalk.gray("[Coalition] Processing..."));

    // Simple local command detection (will be replaced by LLM integration)
    const command = input.trim().toLowerCase();

    if (command.startsWith("read ") || command.startsWith("show ")) {
      const filePath = input.slice(command.startsWith("read ") ? 5 : 5).trim();
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
    } else if (command.startsWith("write ")) {
      actionTracker.updateStatus(task.id, "in_progress");
      const result = await toolExecutor.execute("write_file", {
        path: input.slice(6).trim(),
        content: "(new file content)",
      });
      if (result.success && result.changeId) {
        actionTracker.updateStatus(task.id, "awaiting_approval");
        const change = overlay.getChange(result.changeId);
        if (change) {
          const approved = await approvalFlow.presentChanges([change]);
          actionTracker.updateStatus(task.id, approved ? "completed" : "rejected");
        }
      } else {
        console.log(chalk.red(result.output));
        actionTracker.updateStatus(task.id, "failed");
      }
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
    } else if (command === "help") {
      console.log(chalk.cyan("\nAvailable commands:"));
      console.log("  read <path>       - Read a file");
      console.log("  list [path]       - List directory contents");
      console.log("  write <path>      - Stage a file write");
      console.log("  analyze <path>    - Analyze codebase structure");
      console.log("  search <query>    - Search across files");
      console.log("  shell <command>   - Run a shell command");
      console.log("  help              - Show this help");
      console.log("  quit              - Exit Coalition\n");
      actionTracker.updateStatus(task.id, "completed");
    } else if (command === "quit" || command === "exit") {
      console.log(chalk.yellow("Coalition going back to sleep. Goodbye!"));
      break;
    } else {
      console.log(
        chalk.yellow(
          '[Coalition] AI integration not yet implemented. Type "help" for available commands.'
        )
      );
      actionTracker.updateStatus(task.id, "completed");
    }
  }
}
