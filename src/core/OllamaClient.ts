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

  constructor(model: string = "qwen2.5-coder:7b", baseUrl: string = "http://localhost:11434") {
    this.model = model;
    this.baseUrl = baseUrl;
  }

  setModel(model: string): void {
    this.model = model;
  }

  getModel(): string {
    return this.model;
  }

  async chat(
    messages: ChatMessage[],
    tools?: ToolDefinitionForLLM[]
  ): Promise<ChatCompletion> {
    // Ollama uses OpenAI-compatible API at /v1/chat/completions
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      stream: false,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama API error (${response.status}): ${errorText}`
      );
    }

    return response.json() as Promise<ChatCompletion>;
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
