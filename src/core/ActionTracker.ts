import { randomUUID } from "crypto";

export type TaskStatus =
  | "pending"
  | "planning"
  | "in_progress"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "completed"
  | "failed"
  | "cancelled";

export interface TaskRecord {
  id: string;
  description: string;
  status: TaskStatus;
  toolCalls: ToolCallRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ToolCallRecord {
  toolName: string;
  args: Record<string, unknown>;
  result?: string;
  status: "pending" | "executing" | "completed" | "failed" | "rejected";
}

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ["planning", "cancelled"],
  planning: ["in_progress", "failed", "cancelled"],
  in_progress: ["awaiting_approval", "completed", "failed", "cancelled"],
  awaiting_approval: ["approved", "rejected", "cancelled"],
  approved: ["completed", "failed"],
  rejected: ["planning", "cancelled"],
  completed: [],
  failed: ["planning"],
  cancelled: [],
};

export class ActionTracker {
  private tasks: Map<string, TaskRecord> = new Map();

  createTask(description: string): TaskRecord {
    const now = new Date();
    const task: TaskRecord = {
      id: randomUUID(),
      description,
      status: "pending",
      toolCalls: [],
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  getTask(id: string): TaskRecord | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): TaskRecord[] {
    return Array.from(this.tasks.values());
  }

  updateStatus(taskId: string, newStatus: TaskStatus): TaskRecord {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const allowed = VALID_TRANSITIONS[task.status];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid transition: ${task.status} → ${newStatus}. Allowed: ${allowed.join(", ")}`
      );
    }

    task.status = newStatus;
    task.updatedAt = new Date();
    return task;
  }

  addToolCall(
    taskId: string,
    toolName: string,
    args: Record<string, unknown>
  ): ToolCallRecord {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const toolCall: ToolCallRecord = {
      toolName,
      args,
      status: "pending",
    };
    task.toolCalls.push(toolCall);
    task.updatedAt = new Date();
    return toolCall;
  }

  updateToolCallStatus(
    taskId: string,
    toolIndex: number,
    status: ToolCallRecord["status"],
    result?: string
  ): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const toolCall = task.toolCalls[toolIndex];
    if (!toolCall) {
      throw new Error(`Tool call at index ${toolIndex} not found`);
    }

    toolCall.status = status;
    if (result) toolCall.result = result;
    task.updatedAt = new Date();
  }
}
