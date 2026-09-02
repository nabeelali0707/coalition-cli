import { readFileSync, existsSync } from "fs";
import { dirname } from "path";
import chalk from "chalk";

export type ChangeType = "create" | "edit" | "delete";

export interface StagedChange {
  id: string;
  type: ChangeType;
  path: string;
  newContent?: string;
  originalContent?: string;
}

export interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
  lineNumber?: number;
}

export class Overlay {
  private stagedChanges: Map<string, StagedChange> = new Map();
  private changeCounter = 0;

  private generateId(): string {
    return `change-${++this.changeCounter}`;
  }

  stageCreate(filePath: string, content: string): StagedChange {
    const id = this.generateId();
    const change: StagedChange = {
      id,
      type: "create",
      path: filePath,
      newContent: content,
    };
    this.stagedChanges.set(id, change);
    return change;
  }

  stageEdit(filePath: string, newContent: string): StagedChange {
    const id = this.generateId();
    let originalContent: string | undefined;

    if (existsSync(filePath)) {
      originalContent = readFileSync(filePath, "utf-8");
    }

    const change: StagedChange = {
      id,
      type: "edit",
      path: filePath,
      newContent,
      originalContent,
    };
    this.stagedChanges.set(id, change);
    return change;
  }

  stageDelete(filePath: string): StagedChange {
    const id = this.generateId();
    let originalContent: string | undefined;

    if (existsSync(filePath)) {
      originalContent = readFileSync(filePath, "utf-8");
    }

    const change: StagedChange = {
      id,
      type: "delete",
      path: filePath,
      originalContent,
    };
    this.stagedChanges.set(id, change);
    return change;
  }

  getChange(id: string): StagedChange | undefined {
    return this.stagedChanges.get(id);
  }

  getAllStaged(): StagedChange[] {
    return Array.from(this.stagedChanges.values());
  }

  computeDiff(change: StagedChange): DiffLine[] {
    if (!change.originalContent || !change.newContent) {
      return [];
    }

    const oldLines = change.originalContent.split("\n");
    const newLines = change.newContent.split("\n");
    const diff: DiffLine[] = [];

    const maxLen = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLen; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === undefined) {
        diff.push({ type: "add", content: newLine, lineNumber: i + 1 });
      } else if (newLine === undefined) {
        diff.push({ type: "remove", content: oldLine, lineNumber: i + 1 });
      } else if (oldLine !== newLine) {
        diff.push({ type: "remove", content: oldLine, lineNumber: i + 1 });
        diff.push({ type: "add", content: newLine, lineNumber: i + 1 });
      } else {
        diff.push({ type: "context", content: oldLine, lineNumber: i + 1 });
      }
    }

    return diff;
  }

  formatDiff(diff: DiffLine[]): string {
    return diff
      .map((line) => {
        const prefix = line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";
        const colorFn =
          line.type === "add"
            ? chalk.green
            : line.type === "remove"
              ? chalk.red
              : chalk.gray;
        const lineNum = String(line.lineNumber ?? "").padStart(4, " ");
        return colorFn(`${lineNum} ${prefix} ${line.content}`);
      })
      .join("\n");
  }

  async flush(): Promise<void> {
    const { writeFileSync, unlinkSync, mkdirSync } = await import("fs");

    for (const change of this.stagedChanges.values()) {
      const dir = dirname(change.path);

      switch (change.type) {
        case "create":
        case "edit":
          if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
          }
          writeFileSync(change.path, change.newContent!, "utf-8");
          break;
        case "delete":
          if (existsSync(change.path)) {
            unlinkSync(change.path);
          }
          break;
      }
    }

    this.stagedChanges.clear();
  }

  discard(): void {
    this.stagedChanges.clear();
  }
}
