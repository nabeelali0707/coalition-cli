import chalk from "chalk";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { ActionTracker, TaskRecord } from "../core/ActionTracker";

const CONFIG_DIR = join(homedir(), ".coalition");
const HISTORY_FILE = join(CONFIG_DIR, "history.json");

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadHistoryFromDisk(): TaskRecord[] {
  if (!existsSync(HISTORY_FILE)) return [];
  try {
    const content = readFileSync(HISTORY_FILE, "utf-8");
    const records = JSON.parse(content);
    // Revive Date objects
    return records.map((r: Record<string, string>) => ({
      ...r,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }));
  } catch {
    return [];
  }
}

function saveHistoryToDisk(tasks: TaskRecord[]): void {
  ensureConfigDir();
  // Keep last 100 tasks
  const recent = tasks.slice(-100);
  writeFileSync(HISTORY_FILE, JSON.stringify(recent, null, 2), "utf-8");
}

// In-memory history store backed by disk
let history: TaskRecord[] = loadHistoryFromDisk();

export function addToHistory(task: TaskRecord): void {
  history.push({ ...task });
  saveHistoryToDisk(history);
}

export function getHistory(): TaskRecord[] {
  return [...history];
}

export function clearHistory(): void {
  history = [];
  saveHistoryToDisk(history);
}

export function printHistory(tasks: TaskRecord[]): void {
  if (tasks.length === 0) {
    console.log(chalk.gray("\nNo task history yet.\n"));
    return;
  }

  console.log(chalk.cyan(`\n📋 Task History (${tasks.length} tasks)\n`));

  for (const task of tasks.slice().reverse()) {
    const statusColor =
      task.status === "completed"
        ? chalk.green
        : task.status === "failed"
          ? chalk.red
          : task.status === "cancelled"
            ? chalk.gray
            : chalk.yellow;

    const date = task.updatedAt.toLocaleString();
    const id = task.id.slice(0, 8);

    console.log(`  ${statusColor(task.status.padEnd(18))} [${id}] ${task.description}`);
    console.log(chalk.gray(`                       ${date} | ${task.toolCalls.length} tool calls`));
  }

  console.log();
}
