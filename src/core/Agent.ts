import chalk from "chalk";
import { ActionTracker } from "./ActionTracker";
import { ToolExecutor } from "./ToolExecutor";
import { Overlay } from "./Overlay";
import { ApprovalFlow } from "./ApprovalFlow";
import {
  OpenRouterClient,
  ChatMessage,
  ToolCall,
  ToolDefinitionForLLM,
  ChatCompletion,
} from "./OpenRouterClient";
import { OllamaClient } from "./OllamaClient";

export type LLMClient = OpenRouterClient | OllamaClient;

function isOllama(client: LLMClient): client is OllamaClient {
  return client instanceof OllamaClient;
}

const SYSTEM_PROMPT = `You are Coalition, a coding assistant. Be concise. Use tools when needed.`;

export class Agent {
  private actionTracker: ActionTracker;
  private toolExecutor: ToolExecutor;
  private overlay: Overlay;
  private approvalFlow: ApprovalFlow;
  private llm: LLMClient;
  private messages: ChatMessage[] = [];

  constructor(
    actionTracker: ActionTracker,
    toolExecutor: ToolExecutor,
    overlay: Overlay,
    approvalFlow: ApprovalFlow,
    llm: LLMClient
  ) {
    this.actionTracker = actionTracker;
    this.toolExecutor = toolExecutor;
    this.overlay = overlay;
    this.approvalFlow = approvalFlow;
    this.llm = llm;

    this.messages.push({ role: "system", content: SYSTEM_PROMPT });
  }

  async processUserInput(input: string): Promise<void> {
    const task = this.actionTracker.createTask(input);
    this.actionTracker.updateStatus(task.id, "planning");

    this.messages.push({ role: "user", content: input });

    console.log(chalk.gray(`[Task ${task.id.slice(0, 8)}] Processing...`));

    const tools = this.toolExecutor.getToolDefinitions();
    const llmTools = this.llm.formatToolDefinitions(tools);

    let maxIterations = 5;

    while (maxIterations > 0) {
      maxIterations--;

      process.stdout.write(chalk.gray("[Coalition] Thinking... "));

      // Use streaming for Ollama for faster perceived response
      let completion: ChatCompletion;
      if (isOllama(this.llm)) {
        completion = await this.llm.chatStream(this.messages, llmTools, {
          onToken: (token) => {
            process.stdout.write(chalk.cyan(token));
          },
        });
        process.stdout.write("\n");
      } else {
        completion = await this.llm.chat(this.messages, llmTools);
      }
      const choice = completion.choices[0];

      // Parse tool calls from native API or from text content
      let toolCalls = choice.message.tool_calls || [];
      if (toolCalls.length === 0 && choice.message.content) {
        toolCalls = this.parseTextToolCalls(choice.message.content);
      }

      if (toolCalls.length > 0) {
        if (task.status !== "in_progress") {
          this.actionTracker.updateStatus(task.id, "in_progress");
        }

        // Print content before tool calls (skip if it's just a JSON tool call)
        if (choice.message.content && toolCalls.length === 0) {
          console.log(chalk.cyan(`\nCoalition: ${choice.message.content}`));
        }
        this.messages.push({
          role: "assistant",
          content: null,
          tool_calls: toolCalls,
        });

        for (const toolCall of toolCalls) {
          await this.handleToolCall(task.id, toolCall);
        }
      } else {
        if (choice.message.content) {
          console.log(chalk.cyan(`\nCoalition: ${choice.message.content}`));
          this.messages.push({
            role: "assistant",
            content: choice.message.content,
          });
        }
        if (task.status !== "in_progress") {
          this.actionTracker.updateStatus(task.id, "in_progress");
        }
        break;
      }
    }

    this.actionTracker.updateStatus(task.id, "completed");
    console.log(chalk.green("\n[Task complete]"));
  }

  private parseTextToolCalls(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    // Match JSON tool call patterns like {"name": "...", "arguments": {...}}
    const regex = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[^}]*\})\s*\}/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      toolCalls.push({
        id: `text-${Date.now()}-${toolCalls.length}`,
        type: "function",
        function: {
          name: match[1],
          arguments: match[2],
        },
      });
    }
    return toolCalls;
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
