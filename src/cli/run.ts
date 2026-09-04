import chalk from "chalk";
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

import { loadEnv } from "../utils/env";

export async function run(taskDescription: string): Promise<void> {
  const env = loadEnv();
  const apiKey = env.OPENROUTER_API_KEY;
  const model = env.DEFAULT_MODEL || "openrouter/free";
  const ollamaModel = env.OLLAMA_MODEL || "deepseek-coder:6.7b";

  let llm: LLMClient;

  // Try Ollama first (primary - local, private, free)
  const ollama = new OllamaClient(ollamaModel);
  const ollamaAvailable = await ollama.isAvailable();
  if (ollamaAvailable) {
    llm = ollama;
  } else if (apiKey) {
    // Fallback to OpenRouter
    llm = new OpenRouterClient(apiKey, model);
    console.log(chalk.gray(`Ollama not available, falling back to OpenRouter (${model})`));
  } else {
    console.log(chalk.red("Error: No AI backend available."));
    console.log(chalk.gray("Start Ollama with `ollama serve` or set OPENROUTER_API_KEY."));
    process.exit(1);
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
