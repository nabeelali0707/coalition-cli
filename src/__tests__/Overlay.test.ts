import { Overlay } from "../core/Overlay";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "fs";
import { join } from "path";

const TEST_DIR = join(__dirname, "__test_files__");
const TEST_FILE = join(TEST_DIR, "test.txt");

describe("Overlay", () => {
  let overlay: Overlay;

  beforeEach(() => {
    overlay = new Overlay();
    if (!existsSync(TEST_DIR)) {
      require("fs").mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    overlay.discard();
    if (existsSync(TEST_FILE)) {
      unlinkSync(TEST_FILE);
    }
    if (existsSync(TEST_DIR)) {
      require("fs").rmdirSync(TEST_DIR, { recursive: true } as any);
    }
  });

  describe("stageCreate", () => {
    it("should stage a new file creation", () => {
      const change = overlay.stageCreate(TEST_FILE, "Hello, world!");

      expect(change.id).toBeDefined();
      expect(change.type).toBe("create");
      expect(change.path).toBe(TEST_FILE);
      expect(change.newContent).toBe("Hello, world!");
    });

    it("should not create the file on disk", () => {
      overlay.stageCreate(TEST_FILE, "Hello, world!");
      expect(existsSync(TEST_FILE)).toBe(false);
    });
  });

  describe("stageEdit", () => {
    it("should stage an edit to an existing file", () => {
      writeFileSync(TEST_FILE, "Original content", "utf-8");

      const change = overlay.stageEdit(TEST_FILE, "Updated content");

      expect(change.type).toBe("edit");
      expect(change.originalContent).toBe("Original content");
      expect(change.newContent).toBe("Updated content");
    });

    it("should read original content from disk", () => {
      writeFileSync(TEST_FILE, "File on disk", "utf-8");

      const change = overlay.stageEdit(TEST_FILE, "New content");
      expect(change.originalContent).toBe("File on disk");
    });
  });

  describe("stageDelete", () => {
    it("should stage a file deletion", () => {
      writeFileSync(TEST_FILE, "To be deleted", "utf-8");

      const change = overlay.stageDelete(TEST_FILE);

      expect(change.type).toBe("delete");
      expect(change.originalContent).toBe("To be deleted");
    });

    it("should not actually delete the file", () => {
      writeFileSync(TEST_FILE, "To be deleted", "utf-8");

      overlay.stageDelete(TEST_FILE);
      expect(existsSync(TEST_FILE)).toBe(true);
    });
  });

  describe("getAllStaged", () => {
    it("should return all staged changes", () => {
      overlay.stageCreate(join(TEST_DIR, "a.txt"), "A");
      overlay.stageCreate(join(TEST_DIR, "b.txt"), "B");
      overlay.stageCreate(join(TEST_DIR, "c.txt"), "C");

      const changes = overlay.getAllStaged();
      expect(changes).toHaveLength(3);
    });

    it("should return empty array when nothing staged", () => {
      expect(overlay.getAllStaged()).toEqual([]);
    });
  });

  describe("computeDiff", () => {
    it("should compute a diff between old and new content", () => {
      const change = overlay.stageEdit(TEST_FILE, "Line 1\nLine 2\nLine 3");
      change.originalContent = "Line 1\nLine 2 modified\nLine 3";

      const diff = overlay.computeDiff(change);

      expect(diff.length).toBeGreaterThan(0);
      expect(diff.some((d) => d.type === "remove")).toBe(true);
      expect(diff.some((d) => d.type === "add")).toBe(true);
    });

    it("should return empty diff for create/delete without original", () => {
      const change = overlay.stageCreate(TEST_FILE, "New file");
      const diff = overlay.computeDiff(change);
      expect(diff).toEqual([]);
    });
  });

  describe("flush", () => {
    it("should write staged changes to disk", async () => {
      overlay.stageCreate(TEST_FILE, "Flushed content");
      await overlay.flush();

      expect(existsSync(TEST_FILE)).toBe(true);
      expect(readFileSync(TEST_FILE, "utf-8")).toBe("Flushed content");
    });

    it("should clear staged changes after flush", async () => {
      overlay.stageCreate(TEST_FILE, "Content");
      await overlay.flush();

      expect(overlay.getAllStaged()).toEqual([]);
    });
  });

  describe("discard", () => {
    it("should clear all staged changes", () => {
      overlay.stageCreate(join(TEST_DIR, "a.txt"), "A");
      overlay.stageCreate(join(TEST_DIR, "b.txt"), "B");

      overlay.discard();
      expect(overlay.getAllStaged()).toEqual([]);
    });

    it("should not affect files on disk", () => {
      writeFileSync(TEST_FILE, "Existing", "utf-8");
      overlay.stageDelete(TEST_FILE);

      overlay.discard();
      expect(existsSync(TEST_FILE)).toBe(true);
      expect(readFileSync(TEST_FILE, "utf-8")).toBe("Existing");
    });
  });
});
