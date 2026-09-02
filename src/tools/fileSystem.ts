import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join } from "path";
import { ToolDefinition, ToolResult } from "../core/ToolExecutor";
import { Overlay } from "../core/Overlay";

export const readFileTool: ToolDefinition = {
  name: "read_file",
  description: "Read and return the contents of a file",
  requiresApproval: false,
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to the file to read" },
    },
    required: ["path"],
  },
  async execute(args): Promise<ToolResult> {
    const filePath = args.path as string;

    if (!existsSync(filePath)) {
      return { success: false, output: `File not found: ${filePath}` };
    }

    try {
      const content = readFileSync(filePath, "utf-8");
      return { success: true, output: content };
    } catch (error) {
      return {
        success: false,
        output: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

export const listDirectoryTool: ToolDefinition = {
  name: "list_directory",
  description: "List files and directories in a given path",
  requiresApproval: false,
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the directory to list",
      },
    },
    required: ["path"],
  },
  async execute(args): Promise<ToolResult> {
    const dirPath = args.path as string;

    if (!existsSync(dirPath)) {
      return { success: false, output: `Directory not found: ${dirPath}` };
    }

    try {
      const entries = readdirSync(dirPath).map((name) => {
        const fullPath = join(dirPath, name);
        const isDir = statSync(fullPath).isDirectory();
        return `${isDir ? "[DIR]" : "     "} ${name}`;
      });

      return {
        success: true,
        output: entries.length ? entries.join("\n") : "(empty directory)",
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to list directory: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

export const writeFileTool: ToolDefinition = {
  name: "write_file",
  description: "Write content to a file (staged via Overlay, requires approval)",
  requiresApproval: true,
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to the file to write" },
      content: { type: "string", description: "Content to write to the file" },
    },
    required: ["path", "content"],
  },
  async execute(args, overlay: Overlay): Promise<ToolResult> {
    const filePath = args.path as string;
    const content = args.content as string;

    const exists = existsSync(filePath);
    const change = exists
      ? overlay.stageEdit(filePath, content)
      : overlay.stageCreate(filePath, content);

    return {
      success: true,
      output: `Staged ${exists ? "edit" : "create"} for: ${filePath}`,
      changeId: change.id,
    };
  },
};

export const editFileTool: ToolDefinition = {
  name: "edit_file",
  description:
    "Edit a file by replacing specified content (staged via Overlay)",
  requiresApproval: true,
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to the file to edit" },
      oldContent: {
        type: "string",
        description: "The content to find and replace",
      },
      newContent: {
        type: "string",
        description: "The content to replace with",
      },
    },
    required: ["path", "oldContent", "newContent"],
  },
  async execute(args, overlay: Overlay): Promise<ToolResult> {
    const filePath = args.path as string;
    const oldContent = args.oldContent as string;
    const newContent = args.newContent as string;

    if (!existsSync(filePath)) {
      return { success: false, output: `File not found: ${filePath}` };
    }

    try {
      const currentContent = readFileSync(filePath, "utf-8");

      if (!currentContent.includes(oldContent)) {
        return {
          success: false,
          output: "Could not find the specified content in the file",
        };
      }

      const updatedContent = currentContent.replace(oldContent, newContent);
      const change = overlay.stageEdit(filePath, updatedContent);

      return {
        success: true,
        output: `Staged edit for: ${filePath}`,
        changeId: change.id,
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to edit file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

export const deleteFileTool: ToolDefinition = {
  name: "delete_file",
  description: "Delete a file (staged via Overlay, requires approval)",
  requiresApproval: true,
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to the file to delete" },
    },
    required: ["path"],
  },
  async execute(args, overlay: Overlay): Promise<ToolResult> {
    const filePath = args.path as string;

    if (!existsSync(filePath)) {
      return { success: false, output: `File not found: ${filePath}` };
    }

    const change = overlay.stageDelete(filePath);

    return {
      success: true,
      output: `Staged deletion for: ${filePath}`,
      changeId: change.id,
    };
  },
};
