import * as p from "@clack/prompts";
import chalk from "chalk";
import { Overlay, StagedChange } from "./Overlay";

export class ApprovalFlow {
  private overlay: Overlay;

  constructor(overlay: Overlay) {
    this.overlay = overlay;
  }

  async presentChanges(changes: StagedChange[]): Promise<boolean> {
    if (changes.length === 0) {
      console.log(chalk.gray("No changes to approve."));
      return false;
    }

    console.log(
      chalk.yellow(`\n📋 ${changes.length} change(s) staged for review:\n`)
    );

    for (const change of changes) {
      this.printChangeSummary(change);
    }

    const action = await p.select({
      message: "What would you like to do?",
      options: [
        { value: "approve", label: chalk.green("Approve all changes") },
        { value: "reject", label: chalk.red("Reject all changes") },
        { value: "view", label: chalk.cyan("View full diffs") },
        { value: "cancel", label: chalk.gray("Cancel") },
      ],
    });

    if (p.isCancel(action)) {
      this.overlay.discard();
      console.log(chalk.yellow("\nAction cancelled. Changes discarded."));
      return false;
    }

    switch (action) {
      case "approve":
        await this.overlay.flush();
        console.log(chalk.green("\n✅ Changes applied successfully."));
        return true;

      case "reject":
        this.overlay.discard();
        console.log(chalk.red("\n❌ Changes discarded."));
        return false;

      case "view":
        return this.presentChanges(changes);

      case "cancel":
        this.overlay.discard();
        console.log(chalk.yellow("\nAction cancelled. Changes discarded."));
        return false;

      default:
        return false;
    }
  }

  private printChangeSummary(change: StagedChange): void {
    const typeLabel =
      change.type === "create"
        ? chalk.green("NEW")
        : change.type === "edit"
          ? chalk.yellow("MOD")
          : chalk.red("DEL");

    console.log(`  ${typeLabel} ${change.path}`);

    if (change.type === "edit" && change.originalContent && change.newContent) {
      const diff = this.overlay.computeDiff(change);
      const additions = diff.filter((d) => d.type === "add").length;
      const removals = diff.filter((d) => d.type === "remove").length;
      console.log(
        chalk.gray(`        +${additions} -${removals} lines`)
      );
    }
  }

  async viewDiff(change: StagedChange): Promise<void> {
    const diff = this.overlay.computeDiff(change);
    console.log(`\n--- ${change.path} ---`);
    console.log(this.overlay.formatDiff(diff));
    console.log("---\n");
  }
}
