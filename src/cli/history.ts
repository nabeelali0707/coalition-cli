import chalk from "chalk";
import { ActionTracker, TaskRecord } from "../core/ActionTracker";

// In-memory history store (would be persistent in a real app)
const history: TaskRecord[] = [];

export function addToHistory(task: TaskRecord): void {
  history.push({ ...task });
}

export function getHistory(): TaskRecord[] {
  return [...history];
}

export function printHistory(tasks: TaskRecord[]): void {
  if (tasks.length === 0) {
    console.log(chalk.gray("\nNo task history yet.\n"));
    return;
  }

  console.log(chalk.cyan(`\n📋 Task History (${tasks.length} tasks)\n`));

  for (const task of tasks.reverse()) {
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
