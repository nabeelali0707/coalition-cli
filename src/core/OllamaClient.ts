import chalk from "chalk";
import {
  ChatMessage,
  ToolCall,
  ToolDefinitionForLLM,
  ChatCompletion,
} from "./OpenRouterClient";

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
}

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

  async chatStream(
    messages: ChatMessage[],
    tools?: ToolDefinitionForLLM[],
    callbacks?: StreamCallbacks
  ): Promise<ChatCompletion> {
    // Try native tool calling first (non-streaming to detect tool calls)
    if (tools && tools.length > 0 && this.supportsTools !== false) {
      try {
        return await this.chatWithTools(messages, tools);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("does not support tools")) {
          this.supportsTools = false;
        }
        // Fall through to streaming
      }
    }

    // Stream the response
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      stream: true,
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

    let fullContent = "";
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const chunk = JSON.parse(jsonStr);
              const token = chunk.choices?.[0]?.delta?.content || "";
              if (token) {
                fullContent += token;
                callbacks?.onToken?.(token);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    }

    callbacks?.onComplete?.(fullContent);

    // If text contains tool calls, parse them
    if (tools && tools.length > 0) {
      const toolCalls = this.parseTextToolCalls(fullContent);
      if (toolCalls.length > 0) {
        return {
          choices: [{
            message: { role: "assistant", content: null, tool_calls: toolCalls },
            finish_reason: "tool_calls",
          }],
        };
      }
    }

    return {
      choices: [{
        message: { role: "assistant", content: fullContent },
        finish_reason: "stop",
      }],
    };
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
    const toolDescriptions = tools.map((t) => {
      const params = JSON.stringify(t.function.parameters, null, 2);
      return `### ${t.function.name}\n${t.function.description}\nParameters:\n${params}`;
    }).join("\n\n");

    const toolPrompt = `
To use a tool, output EXACTLY this JSON (nothing else):
{"name": "tool_name", "arguments": {"param1": "value1"}}

Always use "." for current directory. Never use placeholder paths.

Available tools:
${toolDescriptions}
`;

    const enhancedMessages = messages.map((m, i) => {
      if (i === 0 && m.role === "system") {
        return { ...m, content: m.content + "\n\n" + toolPrompt };
      }
      return m;
    });

    const result = await this.chatSimple(enhancedMessages);
    const choice = result.choices[0];

    if (choice.message.content) {
      const toolCalls = this.parseTextToolCalls(choice.message.content);
      if (toolCalls.length > 0) {
        return {
          choices: [{
            message: { role: "assistant", content: null, tool_calls: toolCalls },
            finish_reason: "tool_calls",
          }],
          usage: result.usage,
        };
      }
    }

    return result;
  }

  parseTextToolCalls(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    // Match {"name": "...", "arguments": {...}} pattern
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
    // Also match the reverse order: {"arguments": {...}, "name": "..."}
    const regex2 = /\{\s*"arguments"\s*:\s*(\{[^}]*\})\s*,\s*"name"\s*:\s*"([^"]+)"\s*\}/g;
    while ((match = regex2.exec(content)) !== null) {
      toolCalls.push({
        id: `text-${Date.now()}-${toolCalls.length}`,
        type: "function",
        function: {
          name: match[2],
          arguments: match[1],
        },
      });
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
