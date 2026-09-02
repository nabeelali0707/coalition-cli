import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import { join, extname, basename } from "path";
import { ToolDefinition, ToolResult } from "../core/ToolExecutor";
import { Overlay } from "../core/Overlay";

const LANG_MAP: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript (React)",
  ".js": "JavaScript",
  ".jsx": "JavaScript (React)",
  ".py": "Python",
  ".go": "Go",
  ".rs": "Rust",
  ".java": "Java",
  ".rb": "Ruby",
  ".css": "CSS",
  ".html": "HTML",
  ".json": "JSON",
  ".md": "Markdown",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".toml": "TOML",
};

function walkDirectory(
  dirPath: string,
  results: { path: string; isDir: boolean; size: number }[],
  ignoreDirs: Set<string> = new Set(["node_modules", ".git", "dist"])
): void {
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!ignoreDirs.has(entry)) {
        results.push({ path: fullPath, isDir: true, size: 0 });
        walkDirectory(fullPath, results, ignoreDirs);
      }
    } else {
      results.push({ path: fullPath, isDir: false, size: stat.size });
    }
  }
}

export const analyzeCodebaseTool: ToolDefinition = {
  name: "analyze_codebase",
  description:
    "Analyze a codebase directory structure, languages, and entry points",
  requiresApproval: false,
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the codebase root to analyze",
      },
    },
    required: ["path"],
  },
  async execute(args): Promise<ToolResult> {
    const rootPath = args.path as string;

    if (!existsSync(rootPath)) {
      return { success: false, output: `Path not found: ${rootPath}` };
    }

    try {
      const allFiles: { path: string; isDir: boolean; size: number }[] = [];
      walkDirectory(rootPath, allFiles);

      const files = allFiles.filter((f) => !f.isDir);
      const directories = allFiles.filter((f) => f.isDir);

      const langCounts: Record<string, number> = {};
      for (const file of files) {
        const ext = extname(file.path);
        const lang = LANG_MAP[ext] || `Other (${ext})`;
        langCounts[lang] = (langCounts[lang] || 0) + 1;
      }

      const summary = [
        `Codebase: ${basename(rootPath)}`,
        `Total files: ${files.length}`,
        `Total directories: ${directories.length}`,
        "",
        "Languages:",
        ...Object.entries(langCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([lang, count]) => `  ${lang}: ${count} files`),
      ];

      // Check for entry points and manifests
      const manifestFiles = files.filter((f) =>
        ["package.json", "Cargo.toml", "go.mod", "requirements.txt", "pyproject.toml"].includes(
          basename(f.path)
        )
      );

      if (manifestFiles.length > 0) {
        summary.push("", "Manifest files:");
        manifestFiles.forEach((f) => summary.push(`  ${f.path}`));
      }

      return { success: true, output: summary.join("\n") };
    } catch (error) {
      return {
        success: false,
        output: `Failed to analyze codebase: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

export const searchCodebaseTool: ToolDefinition = {
  name: "search_codebase",
  description: "Search for a pattern across files in the codebase",
  requiresApproval: false,
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search term or pattern to find in files",
      },
      path: {
        type: "string",
        description: "Path to search in (defaults to current directory)",
      },
    },
    required: ["query"],
  },
  async execute(args): Promise<ToolResult> {
    const query = args.query as string;
    const searchPath = (args.path as string) || ".";

    if (!existsSync(searchPath)) {
      return { success: false, output: `Path not found: ${searchPath}` };
    }

    try {
      const allFiles: { path: string; isDir: boolean; size: number }[] = [];
      walkDirectory(searchPath, allFiles);

      const files = allFiles.filter(
        (f) => !f.isDir && !f.path.includes("node_modules")
      );
      const matches: string[] = [];

      for (const file of files.slice(0, 100)) {
        try {
          const content = readFileSync(file.path, "utf-8");
          const lines = content.split("\n");

          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(query.toLowerCase())) {
              matches.push(`${file.path}:${i + 1}: ${lines[i].trim()}`);
            }
          }
        } catch {
          // Skip binary files or files that can't be read as text
        }
      }

      if (matches.length === 0) {
        return { success: true, output: `No matches found for "${query}"` };
      }

      return {
        success: true,
        output: `Found ${matches.length} matches:\n${matches.slice(0, 50).join("\n")}${matches.length > 50 ? `\n... and ${matches.length - 50} more` : ""}`,
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to search codebase: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
