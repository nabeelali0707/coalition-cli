import { exec } from "child_process";
import { promisify } from "util";
import { ToolDefinition, ToolResult } from "../core/ToolExecutor";
import { Overlay } from "../core/Overlay";

const execAsync = promisify(exec);

const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,
  /rm\s+-rf\s+~/,
  /mkfs/,
  /dd\s+if=/,
  />.*\/dev\//,
  /chmod\s+-R\s+777\s+\//,
];

function isDangerous(command: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(command));
}

export const shellCommandTool: ToolDefinition = {
  name: "run_shell_command",
  description:
    "Execute a shell command (requires approval). Use cautiously.",
  requiresApproval: true,
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The shell command to execute",
      },
      cwd: {
        type: "string",
        description: "Working directory for the command",
      },
    },
    required: ["command"],
  },
  async execute(args, _overlay: Overlay): Promise<ToolResult> {
    const command = args.command as string;
    const cwd = (args.cwd as string) || process.cwd();

    if (isDangerous(command)) {
      return {
        success: false,
        output: `DANGEROUS: Command blocked: "${command}". This command matches a dangerous pattern.`,
      };
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      });

      const output = [];
      if (stdout) output.push(stdout.trim());
      if (stderr) output.push(`STDERR: ${stderr.trim()}`);

      return {
        success: true,
        output: output.length ? output.join("\n") : "(no output)",
      };
    } catch (error) {
      return {
        success: false,
        output: `Command failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
