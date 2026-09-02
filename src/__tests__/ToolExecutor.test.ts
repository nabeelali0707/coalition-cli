import { ToolExecutor, ToolDefinition, ToolResult } from "../core/ToolExecutor";
import { Overlay } from "../core/Overlay";

describe("ToolExecutor", () => {
  let executor: ToolExecutor;
  let overlay: Overlay;

  beforeEach(() => {
    overlay = new Overlay();
    executor = new ToolExecutor(overlay);
  });

  describe("register", () => {
    it("should register a tool", () => {
      const tool: ToolDefinition = {
        name: "test_tool",
        description: "A test tool",
        requiresApproval: false,
        parameters: {},
        execute: async () => ({ success: true, output: "done" }),
      };

      executor.register(tool);
      expect(executor.getTool("test_tool")).toBeDefined();
    });

    it("should register multiple tools", () => {
      const tool1: ToolDefinition = {
        name: "tool_1",
        description: "Tool 1",
        requiresApproval: false,
        parameters: {},
        execute: async () => ({ success: true, output: "1" }),
      };

      const tool2: ToolDefinition = {
        name: "tool_2",
        description: "Tool 2",
        requiresApproval: false,
        parameters: {},
        execute: async () => ({ success: true, output: "2" }),
      };

      executor.register(tool1);
      executor.register(tool2);

      expect(executor.getAllTools()).toHaveLength(2);
    });
  });

  describe("getTool", () => {
    it("should return undefined for unknown tool", () => {
      expect(executor.getTool("unknown")).toBeUndefined();
    });
  });

  describe("getAllTools", () => {
    it("should return empty array when no tools registered", () => {
      expect(executor.getAllTools()).toEqual([]);
    });
  });

  describe("getToolDefinitions", () => {
    it("should return tool definitions without execute functions", () => {
      const tool: ToolDefinition = {
        name: "test_tool",
        description: "A test tool",
        requiresApproval: false,
        parameters: { type: "object", properties: {} },
        execute: async () => ({ success: true, output: "done" }),
      };

      executor.register(tool);
      const defs = executor.getToolDefinitions();

      expect(defs).toHaveLength(1);
      expect(defs[0].name).toBe("test_tool");
      expect(defs[0].description).toBe("A test tool");
      expect(defs[0].parameters).toEqual({ type: "object", properties: {} });
    });
  });

  describe("execute", () => {
    it("should execute a registered tool", async () => {
      const tool: ToolDefinition = {
        name: "echo",
        description: "Echo input",
        requiresApproval: false,
        parameters: {},
        execute: async (args) => ({
          success: true,
          output: String(args.message),
        }),
      };

      executor.register(tool);
      const result = await executor.execute("echo", { message: "hello" });

      expect(result.success).toBe(true);
      expect(result.output).toBe("hello");
    });

    it("should return error for unknown tool", async () => {
      const result = await executor.execute("unknown_tool", {});

      expect(result.success).toBe(false);
      expect(result.output).toContain("Unknown tool");
    });

    it("should handle tool execution errors gracefully", async () => {
      const tool: ToolDefinition = {
        name: "failing_tool",
        description: "A tool that fails",
        requiresApproval: false,
        parameters: {},
        execute: async () => {
          throw new Error("Tool failed!");
        },
      };

      executor.register(tool);
      const result = await executor.execute("failing_tool", {});

      expect(result.success).toBe(false);
      expect(result.output).toContain("Tool failed!");
    });
  });
});
