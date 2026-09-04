import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const CONFIG_DIR = join(homedir(), ".coalition");
const CONFIG_FILE = join(CONFIG_DIR, "config");

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function parseEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!existsSync(filePath)) return env;

  const content = readFileSync(filePath, "utf-8");
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
  return env;
}

export function loadEnv(): Record<string, string> {
  // 1. Check ~/.coalition/config (global config, works from anywhere)
  const globalEnv = parseEnvFile(CONFIG_FILE);

  // 2. Check cwd/.env (local config, overrides global)
  const localEnv = parseEnvFile(join(process.cwd(), ".env"));

  // Local overrides global
  return { ...globalEnv, ...localEnv };
}

export function saveEnv(env: Record<string, string>): void {
  ensureConfigDir();
  const lines = Object.entries(env).map(
    ([key, value]) => `${key}=${value}`
  );
  writeFileSync(CONFIG_FILE, lines.join("\n"), "utf-8");
}
