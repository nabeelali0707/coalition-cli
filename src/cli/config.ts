import * as p from "@clack/prompts";
import chalk from "chalk";
import { loadEnv, saveEnv } from "../utils/env";

export async function config(): Promise<void> {
  const env = loadEnv();

  console.log(chalk.cyan("\nCoalition Configuration\n"));

  const action = await p.select({
    message: "What would you like to configure?",
    options: [
      { value: "view", label: "View current configuration" },
      { value: "set-key", label: "Set OpenRouter API key (fallback)" },
      { value: "set-model", label: "Set OpenRouter model" },
      { value: "set-ollama-model", label: "Set Ollama model (primary)" },
      { value: "set", label: "Set a custom configuration value" },
      { value: "exit", label: "Exit" },
    ],
  });

  if (p.isCancel(action)) {
    return;
  }

  switch (action) {
    case "view": {
      console.log(chalk.gray("\nCurrent configuration:"));
      console.log(chalk.gray("  Priority: Ollama (primary) → OpenRouter (fallback)"));
      console.log(
        `  OPENROUTER_API_KEY: ${env.OPENROUTER_API_KEY ? chalk.green("✓ Set") : chalk.red("✗ Not set")}`
      );
      console.log(`  DEFAULT_MODEL: ${chalk.cyan(env.DEFAULT_MODEL || "openrouter/free")}`);
      console.log(`  OLLAMA_MODEL: ${chalk.cyan(env.OLLAMA_MODEL || "deepseek-coder:6.7b")}`);
      console.log(
        `  FIRECRAWL_API_KEY: ${env.FIRECRAWL_API_KEY ? chalk.green("✓ Set") : chalk.red("✗ Not set")}`
      );
      console.log();
      break;
    }

    case "set-ollama-model": {
      const model = await p.text({
        message: "Enter the Ollama model name (primary backend):",
        defaultValue: env.OLLAMA_MODEL || "deepseek-coder:6.7b",
      });

      if (p.isCancel(model)) return;

      env.OLLAMA_MODEL = model;
      saveEnv(env);
      console.log(chalk.green(`✓ Ollama model set to: ${model}`));
      break;
    }

    case "set-key": {
      const key = await p.password({
        message: "Enter your OpenRouter API key:",
      });

      if (p.isCancel(key)) return;

      env.OPENROUTER_API_KEY = key;
      saveEnv(env);
      console.log(chalk.green("✓ OpenRouter API key saved."));
      break;
    }

    case "set-model": {
      const model = await p.text({
        message: "Enter the default model slug:",
        defaultValue: env.DEFAULT_MODEL || "openrouter/free",
      });

      if (p.isCancel(model)) return;

      env.DEFAULT_MODEL = model;
      saveEnv(env);
      console.log(chalk.green(`✓ Default model set to: ${model}`));
      break;
    }

    case "set": {
      const key = await p.text({
        message: "Enter variable name (e.g., OPENROUTER_API_KEY):",
      });

      if (p.isCancel(key)) return;

      const value = await p.password({
        message: `Enter value for ${key}:`,
      });

      if (p.isCancel(value)) return;

      env[key] = value;
      saveEnv(env);
      console.log(chalk.green(`✓ ${key} saved.`));
      break;
    }
  }
}
