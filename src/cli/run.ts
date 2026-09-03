import chalk from "chalk";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { ActionTracker } from "../core/ActionTracker";
import { ToolExecutor } from "../core/ToolExecutor";
import { Overlay } from "../core/Overlay";
import { ApprovalFlow } from "../core/ApprovalFlow";
import { OpenRouterClient } from "../core/OpenRouterClient";
import { OllamaClient } from "../core/OllamaClient";
import { Agent, LLMClient } from "../core/Agent";
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
  const ollamaModel = env.OLLAMA_MODEL || "deepseek-coder:6.7b";

  let llm: LLMClient;

  // Try OpenRouter first (primary)
  if (apiKey) {
    llm = new OpenRouterClient(apiKey, model);
  } else {
    // Fallback to Ollama
    const ollama = new OllamaClient(ollamaModel);
    const available = await ollama.isAvailable();
    if (!available) {
      console.log(chalk.red("Error: No AI backend available."));
      console.log(chalk.gray("Set OPENROUTER_API_KEY or start Ollama with `ollama serve`."));
      process.exit(1);
    }
    llm = ollama;
    console.log(chalk.gray(`OpenRouter not available, falling back to Ollama (${ollamaModel})`));
  }

  const actionTracker = new ActionTracker();
  const overlay = new Overlay();
  const toolExecutor = new ToolExecutor(overlay);
  const approvalFlow = new ApprovalFlow(overlay);

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
    llm
  );

  console.log(chalk.gray(`Task: ${taskDescription}`));
  console.log(chalk.gray(`Model: ${llm.getModel()}\n`));

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
