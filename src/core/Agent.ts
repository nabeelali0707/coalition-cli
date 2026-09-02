import chalk from "chalk";
import { ActionTracker } from "./ActionTracker";
import { ToolExecutor } from "./ToolExecutor";
import { Overlay } from "./Overlay";
import { ApprovalFlow } from "./ApprovalFlow";
import {
  OpenRouterClient,
  ChatMessage,
  ToolCall,
} from "./OpenRouterClient";

const SYSTEM_PROMPT = `You are Coalition, an autonomous terminal AI agent. You help users with software engineering tasks: fixing bugs, adding functionality, refactoring, and explaining code.

You have access to the following tools to interact with the local file system and environment:
- read_file: Read file contents
- list_directory: List files in a directory
- write_file: Create or overwrite a file (requires user approval)
- edit_file: Edit a file by replacing content (requires user approval)
- delete_file: Delete a file (requires user approval)
- run_shell_command: Execute a shell command (requires user approval)
- analyze_codebase: Analyze project structure
- search_codebase: Search for patterns in files

IMPORTANT SAFETY RULES:
1. All file writes, edits, and deletes go through an approval flow - the user must approve before changes are applied.
2. All shell commands require user approval before execution.
3. Always explain what you're doing and why before requesting approvals.
4. Prefer reading files first to understand the codebase before making changes.
5. Be concise in your responses.`;

export class Agent {
  private actionTracker: ActionTracker;
  private toolExecutor: ToolExecutor;
  private overlay: Overlay;
  private approvalFlow: ApprovalFlow;
  private openRouter: OpenRouterClient;
  private messages: ChatMessage[] = [];

  constructor(
    actionTracker: ActionTracker,
    toolExecutor: ToolExecutor,
    overlay: Overlay,
    approvalFlow: ApprovalFlow,
    openRouter: OpenRouterClient
  ) {
    this.actionTracker = actionTracker;
    this.toolExecutor = toolExecutor;
    this.overlay = overlay;
    this.approvalFlow = approvalFlow;
    this.openRouter = openRouter;

    this.messages.push({ role: "system", content: SYSTEM_PROMPT });
  }

  async processUserInput(input: string): Promise<void> {
    const task = this.actionTracker.createTask(input);
    this.actionTracker.updateStatus(task.id, "planning");

    this.messages.push({ role: "user", content: input });

    console.log(chalk.gray(`[Task ${task.id.slice(0, 8)}] Processing...`));

    const tools = this.toolExecutor.getToolDefinitions();
    const llmTools = this.openRouter.formatToolDefinitions(tools);

    let maxIterations = 10;

    while (maxIterations > 0) {
      maxIterations--;

      console.log(chalk.gray("[Coalition] Thinking..."));

      const completion = await this.openRouter.chat(this.messages, llmTools);
      const choice = completion.choices[0];

      if (choice.message.content) {
        console.log(chalk.cyan(`\nCoalition: ${choice.message.content}`));
        this.messages.push({
          role: "assistant",
          content: choice.message.content,
        });
      }

      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        this.actionTracker.updateStatus(task.id, "in_progress");

        this.messages.push({
          role: "assistant",
          content: null,
          tool_calls: choice.message.tool_calls,
        });

        for (const toolCall of choice.message.tool_calls) {
          await this.handleToolCall(task.id, toolCall);
        }
      } else {
        break;
      }
    }

    this.actionTracker.updateStatus(task.id, "completed");
    console.log(chalk.green("\n[Task complete]"));
  }

  private async handleToolCall(taskId: string, toolCall: ToolCall): Promise<void> {
    const { name, arguments: argsStr } = toolCall.function;
    let args: Record<string, unknown>;

    try {
      args = JSON.parse(argsStr);
    } catch {
      this.messages.push({
        role: "tool",
        content: `Error parsing tool arguments: ${argsStr}`,
        tool_call_id: toolCall.id,
      });
      return;
    }

    console.log(chalk.gray(`  → ${name}(${JSON.stringify(args)})`));

    this.actionTracker.addToolCall(taskId, name, args);

    const tool = this.toolExecutor.getTool(name);
    if (!tool) {
      const errorMsg = `Unknown tool: ${name}`;
      console.log(chalk.red(`  ✗ ${errorMsg}`));
      this.messages.push({
        role: "tool",
        content: errorMsg,
        tool_call_id: toolCall.id,
      });
      return;
    }

    if (tool.requiresApproval) {
      const result = await this.toolExecutor.execute(name, args);

      if (result.success && result.changeId) {
        const change = this.overlay.getChange(result.changeId);
        if (change) {
          console.log(
            chalk.yellow(`  ⏳ Awaiting approval for ${name}...`)
          );
          const approved =
            await this.approvalFlow.presentChanges([change]);

          if (approved) {
            this.messages.push({
              role: "tool",
              content: `Tool ${name} executed successfully. Changes approved and applied.`,
              tool_call_id: toolCall.id,
            });
          } else {
            this.messages.push({
              role: "tool",
              content: `Tool ${name} was rejected by the user. Changes were discarded.`,
              tool_call_id: toolCall.id,
            });
          }
        }
      } else {
        console.log(chalk.red(`  ✗ ${result.output}`));
        this.messages.push({
          role: "tool",
          content: result.output,
          tool_call_id: toolCall.id,
        });
      }
    } else {
      const result = await this.toolExecutor.execute(name, args);
      console.log(
        result.success
          ? chalk.gray(`  ✓ ${name} completed`)
          : chalk.red(`  ✗ ${name} failed`)
      );
      this.messages.push({
        role: "tool",
        content: result.output,
        tool_call_id: toolCall.id,
      });
    }
  }
}
