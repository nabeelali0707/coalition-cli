import { ActionTracker } from "../core/ActionTracker";

describe("ActionTracker", () => {
  let tracker: ActionTracker;

  beforeEach(() => {
    tracker = new ActionTracker();
  });

  describe("createTask", () => {
    it("should create a new task with pending status", () => {
      const task = tracker.createTask("Test task");

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.description).toBe("Test task");
      expect(task.status).toBe("pending");
      expect(task.toolCalls).toEqual([]);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it("should create tasks with unique IDs", () => {
      const task1 = tracker.createTask("Task 1");
      const task2 = tracker.createTask("Task 2");

      expect(task1.id).not.toBe(task2.id);
    });
  });

  describe("getTask", () => {
    it("should return a task by ID", () => {
      const task = tracker.createTask("Test task");
      const retrieved = tracker.getTask(task.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(task.id);
    });

    it("should return undefined for non-existent task", () => {
      const retrieved = tracker.getTask("non-existent-id");
      expect(retrieved).toBeUndefined();
    });
  });

  describe("getAllTasks", () => {
    it("should return all tasks", () => {
      tracker.createTask("Task 1");
      tracker.createTask("Task 2");
      tracker.createTask("Task 3");

      const tasks = tracker.getAllTasks();
      expect(tasks).toHaveLength(3);
    });

    it("should return empty array when no tasks", () => {
      const tasks = tracker.getAllTasks();
      expect(tasks).toEqual([]);
    });
  });

  describe("updateStatus", () => {
    it("should update task status with valid transition", () => {
      const task = tracker.createTask("Test task");

      tracker.updateStatus(task.id, "planning");
      expect(tracker.getTask(task.id)?.status).toBe("planning");

      tracker.updateStatus(task.id, "in_progress");
      expect(tracker.getTask(task.id)?.status).toBe("in_progress");

      tracker.updateStatus(task.id, "completed");
      expect(tracker.getTask(task.id)?.status).toBe("completed");
    });

    it("should throw error for invalid transition", () => {
      const task = tracker.createTask("Test task");

      expect(() => {
        tracker.updateStatus(task.id, "completed");
      }).toThrow("Invalid transition");
    });

    it("should throw error for non-existent task", () => {
      expect(() => {
        tracker.updateStatus("non-existent-id", "planning");
      }).toThrow("not found");
    });

    it("should allow cancellation from any state", () => {
      const task = tracker.createTask("Test task");

      tracker.updateStatus(task.id, "planning");
      tracker.updateStatus(task.id, "cancelled");
      expect(tracker.getTask(task.id)?.status).toBe("cancelled");
    });

    it("should allow re-planning from rejected state", () => {
      const task = tracker.createTask("Test task");

      tracker.updateStatus(task.id, "planning");
      tracker.updateStatus(task.id, "in_progress");
      tracker.updateStatus(task.id, "awaiting_approval");
      tracker.updateStatus(task.id, "rejected");
      tracker.updateStatus(task.id, "planning");
      expect(tracker.getTask(task.id)?.status).toBe("planning");
    });
  });

  describe("addToolCall", () => {
    it("should add a tool call to a task", () => {
      const task = tracker.createTask("Test task");
      const toolCall = tracker.addToolCall(task.id, "read_file", {
        path: "test.ts",
      });

      expect(toolCall.toolName).toBe("read_file");
      expect(toolCall.args).toEqual({ path: "test.ts" });
      expect(toolCall.status).toBe("pending");

      const updatedTask = tracker.getTask(task.id);
      expect(updatedTask?.toolCalls).toHaveLength(1);
    });

    it("should throw error for non-existent task", () => {
      expect(() => {
        tracker.addToolCall("non-existent-id", "read_file", { path: "test.ts" });
      }).toThrow("not found");
    });
  });

  describe("updateToolCallStatus", () => {
    it("should update tool call status", () => {
      const task = tracker.createTask("Test task");
      tracker.addToolCall(task.id, "read_file", { path: "test.ts" });

      tracker.updateToolCallStatus(task.id, 0, "completed", "file content");
      const updatedTask = tracker.getTask(task.id);
      const toolCall = updatedTask?.toolCalls[0];

      expect(toolCall?.status).toBe("completed");
      expect(toolCall?.result).toBe("file content");
    });

    it("should throw error for non-existent tool call", () => {
      const task = tracker.createTask("Test task");

      expect(() => {
        tracker.updateToolCallStatus(task.id, 0, "completed");
      }).toThrow("not found");
    });
  });
});
