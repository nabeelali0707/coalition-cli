import chalk from "chalk";
import { loadEnv } from "../utils/env";
import { OllamaClient } from "../core/OllamaClient";

export async function status(): Promise<void> {
  const env = loadEnv();
  const ollamaModel = env.OLLAMA_MODEL || "deepseek-coder:6.7b";
  const openrouterKey = env.OPENROUTER_API_KEY;
  const openrouterModel = env.DEFAULT_MODEL || "openrouter/free";

  console.log(chalk.cyan("\nCoalition Status\n"));

  // Check Ollama
  console.log(chalk.bold("Ollama (Primary)"));
  const ollama = new OllamaClient(ollamaModel);
  const ollamaAvailable = await ollama.isAvailable();
  if (ollamaAvailable) {
    console.log(chalk.green(`  ✓ Running — model: ${ollamaModel}`));
    const models = await ollama.listModels();
    if (models.length > 0) {
      console.log(chalk.gray(`  Available models: ${models.join(", ")}`));
    }
  } else {
    console.log(chalk.red("  ✗ Not running — start with `ollama serve`"));
  }

  console.log();

  // Check OpenRouter
  console.log(chalk.bold("OpenRouter (Fallback)"));
  if (openrouterKey) {
    console.log(chalk.green(`  ✓ API key configured — model: ${openrouterModel}`));
  } else {
    console.log(chalk.yellow("  ⚠ No API key set — run `coalition config`"));
  }

  console.log();

  // Active backend
  console.log(chalk.bold("Active Backend"));
  if (ollamaAvailable) {
    console.log(chalk.green(`  → Ollama (${ollamaModel})`));
  } else if (openrouterKey) {
    console.log(chalk.green(`  → OpenRouter (${openrouterModel})`));
  } else {
    console.log(chalk.red("  → None available"));
  }

  console.log();

  // Tools
  console.log(chalk.bold("Built-in Tools"));
  const tools = [
    "read_file", "list_directory", "write_file", "edit_file",
    "delete_file", "run_shell_command", "analyze_codebase",
    "search_codebase",
  ];
  if (env.FIRECRAWL_API_KEY) {
    tools.push("scrape_url", "crawl_site");
  }
  console.log(chalk.gray(`  ${tools.join(", ")}`));
  console.log();
}
