import chalk from "chalk";
import {
  ChatMessage,
  ToolCall,
  ToolDefinitionForLLM,
  ChatCompletion,
} from "./OpenRouterClient";

export class OllamaClient {
  private model: string;
  private baseUrl: string;
  private supportsTools: boolean | null = null;

  constructor(model: string = "qwen2.5-coder:7b", baseUrl: string = "http://localhost:11434") {
    this.model = model;
    this.baseUrl = baseUrl;
  }

  setModel(model: string): void {
    this.model = model;
    this.supportsTools = null;
  }

  getModel(): string {
    return this.model;
  }

  async chat(
    messages: ChatMessage[],
    tools?: ToolDefinitionForLLM[]
  ): Promise<ChatCompletion> {
    // Try native tool calling first, fall back to text-based if not supported
    if (tools && tools.length > 0) {
      try {
        return await this.chatWithTools(messages, tools);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("does not support tools")) {
          console.log(chalk.gray("  (Model doesn't support tool calling, using text-based fallback)"));
          this.supportsTools = false;
          return await this.chatWithTextTools(messages, tools);
        }
        throw error;
      }
    }

    return await this.chatSimple(messages);
  }

  private async chatWithTools(
    messages: ChatMessage[],
    tools: ToolDefinitionForLLM[]
  ): Promise<ChatCompletion> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      stream: false,
      tools,
    };

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    this.supportsTools = true;
    return response.json() as Promise<ChatCompletion>;
  }

  private async chatSimple(messages: ChatMessage[]): Promise<ChatCompletion> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      stream: false,
    };

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<ChatCompletion>;
  }

  private async chatWithTextTools(
    messages: ChatMessage[],
    tools: ToolDefinitionForLLM[]
  ): Promise<ChatCompletion> {
    // Build a tool prompt that instructs the model to output JSON tool calls
    const toolDescriptions = tools.map((t) => {
      const params = JSON.stringify(t.function.parameters, null, 2);
      return `### ${t.function.name}\n${t.function.description}\nParameters:\n${params}`;
    }).join("\n\n");

    const toolPrompt = `
You have access to the following tools. To use a tool, output EXACTLY this format (no other text around it):

\`\`\`json
{"tool": "tool_name", "args": {"param1": "value1"}}
\`\`\`

IMPORTANT: Always use "." as the path when the user asks about the current project/directory. Never use placeholder paths like "/path/to/...".

If you don't need to use a tool, just respond normally.

Available tools:
${toolDescriptions}
`;

    // Inject tool prompt into system message
    const enhancedMessages = messages.map((m, i) => {
      if (i === 0 && m.role === "system") {
        return { ...m, content: m.content + "\n\n" + toolPrompt };
      }
      return m;
    });

    const result = await this.chatSimple(enhancedMessages);
    const choice = result.choices[0];

    // Try to parse tool calls from the response
    if (choice.message.content) {
      const toolCalls = this.parseToolCalls(choice.message.content);
      if (toolCalls.length > 0) {
        // Return with tool calls parsed from text
        return {
          choices: [{
            message: {
              role: "assistant",
              content: null,
              tool_calls: toolCalls,
            },
            finish_reason: "tool_calls",
          }],
          usage: result.usage,
        };
      }
    }

    return result;
  }

  private parseToolCalls(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // Match ```json\n{...}\n``` blocks
    const jsonBlockRegex = /```json\s*(\{[\s\S]*?\})\s*```/g;
    let match;

    while ((match = jsonBlockRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.tool && parsed.args) {
          toolCalls.push({
            id: `text-${Date.now()}-${toolCalls.length}`,
            type: "function",
            function: {
              name: parsed.tool,
              arguments: JSON.stringify(parsed.args),
            },
          });
        }
      } catch {
        // Skip invalid JSON
      }
    }

    // Also try to find JSON objects without code blocks
    if (toolCalls.length === 0) {
      const jsonRegex = /\{"tool":\s*"[^"]+",\s*"args":\s*\{[^}]*\}\}/g;
      while ((match = jsonRegex.exec(content)) !== null) {
        try {
          const parsed = JSON.parse(match[0]);
          if (parsed.tool && parsed.args) {
            toolCalls.push({
              id: `text-${Date.now()}-${toolCalls.length}`,
              type: "function",
              function: {
                name: parsed.tool,
                arguments: JSON.stringify(parsed.args),
              },
            });
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    return toolCalls;
  }

  formatToolDefinitions(
    tools: Array<{
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }>
  ): ToolDefinitionForLLM[] {
    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];
      const data = await response.json() as { models?: Array<{ name: string }> };
      return data.models?.map((m) => m.name) || [];
    } catch {
      return [];
    }
  }
}
