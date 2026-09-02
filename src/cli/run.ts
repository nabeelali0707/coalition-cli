import chalk from "chalk";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { ActionTracker } from "../core/ActionTracker";
import { ToolExecutor } from "../core/ToolExecutor";
import { Overlay } from "../core/Overlay";
import { ApprovalFlow } from "../core/ApprovalFlow";
import { OpenRouterClient } from "../core/OpenRouterClient";
import { Agent } from "../core/Agent";
import {
  readFileTool,
  listDirectoryTool,
  writeFileTool,
  editFileTool,
  deleteFileTool,
} from "../tools/fileSystem";
import {
  analyzeCodebaseTool,
  searchCodebaseTool,
} from "../tools/codebaseAnalysis";
import { shellCommandTool } from "../tools/shell";
import { scrapeUrlTool, crawlSiteTool, setFireCrawlClient } from "../tools/webScraping";
import { FireCrawlClient } from "../core/FireCrawlClient";

function loadEnv(): Record<string, string> {
  const envPath = join(process.cwd(), ".env");
  const env: Record<string, string> = {};

  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim();
          const value = trimmed.slice(eqIndex + 1).trim();
          env[key] = value;
        }
      }
    }
  }

  return env;
}

export async function run(taskDescription: string): Promise<void> {
  const env = loadEnv();
  const apiKey = env.OPENROUTER_API_KEY;
  const model = env.DEFAULT_MODEL || "openrouter/free";

  if (!apiKey) {
    console.log(
      chalk.red(
        "Error: OpenRouter API key required for one-shot mode.\nRun `coalition config` to set it up."
      )
    );
    process.exit(1);
  }

  const actionTracker = new ActionTracker();
  const overlay = new Overlay();
  const toolExecutor = new ToolExecutor(overlay);
  const approvalFlow = new ApprovalFlow(overlay);
  const openRouter = new OpenRouterClient(apiKey, model);

  // Initialize FireCrawl if API key is present
  const firecrawlKey = env.FIRECRAWL_API_KEY;
  if (firecrawlKey) {
    const firecrawl = new FireCrawlClient(firecrawlKey);
    setFireCrawlClient(firecrawl);
  }

  // Register all tools
  toolExecutor.register(readFileTool);
  toolExecutor.register(listDirectoryTool);
  toolExecutor.register(writeFileTool);
  toolExecutor.register(editFileTool);
  toolExecutor.register(deleteFileTool);
  toolExecutor.register(analyzeCodebaseTool);
  toolExecutor.register(searchCodebaseTool);
  toolExecutor.register(shellCommandTool);
  if (firecrawlKey) {
    toolExecutor.register(scrapeUrlTool);
    toolExecutor.register(crawlSiteTool);
  }

  const agent = new Agent(
    actionTracker,
    toolExecutor,
    overlay,
    approvalFlow,
    openRouter
  );

  console.log(chalk.gray(`Task: ${taskDescription}`));
  console.log(chalk.gray(`Model: ${model}\n`));

  try {
    await agent.processUserInput(taskDescription);
  } catch (error) {
    console.log(
      chalk.red(
        `\nError: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}
