import { Overlay } from "./Overlay";

export interface ToolResult {
  success: boolean;
  output: string;
  changeId?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  requiresApproval: boolean;
  execute: (
    args: Record<string, unknown>,
    overlay: Overlay
  ) => Promise<ToolResult>;
}

export class ToolExecutor {
  private tools: Map<string, ToolDefinition> = new Map();
  private overlay: Overlay;

  constructor(overlay: Overlay) {
    this.overlay = overlay;
  }

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getToolDefinitions(): Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }> {
    return this.getAllTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  async execute(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        success: false,
        output: `Unknown tool: ${toolName}. Available tools: ${Array.from(this.tools.keys()).join(", ")}`,
      };
    }

    try {
      const result = await tool.execute(args, this.overlay);
      return result;
    } catch (error) {
      return {
        success: false,
        output: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
