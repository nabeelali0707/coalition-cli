import * as p from "@clack/prompts";
import chalk from "chalk";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const ENV_PATH = join(process.cwd(), ".env");
const ENV_EXAMPLE_PATH = join(process.cwd(), ".env.example");

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};

  if (existsSync(ENV_PATH)) {
    const content = readFileSync(ENV_PATH, "utf-8");
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

function saveEnv(env: Record<string, string>): void {
  const lines = Object.entries(env).map(
    ([key, value]) => `${key}=${value}`
  );
  writeFileSync(ENV_PATH, lines.join("\n"), "utf-8");
}

export async function config(): Promise<void> {
  const env = loadEnv();

  console.log(chalk.cyan("\nCoalition Configuration\n"));

  const action = await p.select({
    message: "What would you like to configure?",
    options: [
      { value: "view", label: "View current configuration" },
      { value: "set", label: "Set a configuration value" },
      { value: "set-key", label: "Set OpenRouter API key" },
      { value: "set-model", label: "Set default model" },
      { value: "exit", label: "Exit" },
    ],
  });

  if (p.isCancel(action)) {
    return;
  }

  switch (action) {
    case "view": {
      console.log(chalk.gray("\nCurrent configuration:"));
      console.log(
        `  OPENROUTER_API_KEY: ${env.OPENROUTER_API_KEY ? chalk.green("✓ Set") : chalk.red("✗ Not set")}`
      );
      console.log(
        `  FIRECRAWL_API_KEY: ${env.FIRECRAWL_API_KEY ? chalk.green("✓ Set") : chalk.red("✗ Not set")}`
      );
      console.log(`  DEFAULT_MODEL: ${env.DEFAULT_MODEL || "openrouter/free"}`);
      console.log();
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
