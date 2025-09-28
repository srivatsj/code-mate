import { Plan, PlanDataMessage, PlanStatus,TaskStatus, TodoTask, WSMessage } from '@shared/websocket-types';
import { tool } from 'ai';
import { z } from 'zod';

export class ServerTools {
  private plans = new Map<string, Plan>();

  constructor(private sendToClient?: (message: WSMessage) => void) {}

  private sendPlanData(sessionId: string) {
    if (this.sendToClient) {
      const plan = this.getPlan(sessionId);
      const message: PlanDataMessage = {
        id: crypto.randomUUID(),
        type: 'plan_data',
        payload: { sessionId, plan },
        timestamp: Date.now()
      };
      this.sendToClient(message);
    }
  }

  private createPlan(sessionId: string, tasks: string[], description?: string) {
    const plan: Plan = {
      description,
      tasks: tasks.map((desc: string) => ({
        id: crypto.randomUUID(),
        description: desc,
        status: TaskStatus.PENDING
      })),
      status: PlanStatus.PENDING
    };
    this.plans.set(sessionId, plan);
    this.sendPlanData(sessionId);
    return { success: true, total_tasks: plan.tasks.length };
  }

  private updatePlanStatus(sessionId: string) {
    const plan = this.plans.get(sessionId);
    if (plan) {
      plan.status = plan.tasks.every((t: TodoTask) => t.status === TaskStatus.COMPLETED) ? PlanStatus.COMPLETED : PlanStatus.IN_PROGRESS;
      this.sendPlanData(sessionId);
      return { success: true, status: plan.status };
    }
    return { success: false };
  }

  private getPlan(sessionId: string): Plan {
    return this.plans.get(sessionId) || { tasks: [], status: PlanStatus.PENDING };
  }

  private updateTask(sessionId: string, taskId: string, status: TaskStatus) {
    const plan = this.getPlan(sessionId);
    const task = plan.tasks.find((t: TodoTask) => t.id === taskId);
    if (task) {
      task.status = status;
      plan.status = plan.tasks.every((t: TodoTask) => t.status === TaskStatus.COMPLETED) ? PlanStatus.COMPLETED : PlanStatus.IN_PROGRESS;
      this.sendPlanData(sessionId);
    }
    return { success: !!task };
  }

  getTools() {
    return {
      create_plan: tool({
        description: 'Create a new plan with tasks',
        inputSchema: z.object({
          sessionId: z.string(),
          tasks: z.array(z.string()),
          description: z.string().optional()
        }),
        execute: async ({ sessionId, tasks, description }: { sessionId: string; tasks: string[]; description?: string }) => {
          const result = this.createPlan(sessionId, tasks, description);
          return result;
        }
      }),

      update_plan_status: tool({
        description: 'Update plan status based on task completion',
        inputSchema: z.object({
          sessionId: z.string()
        }),
        execute: async ({ sessionId }: { sessionId: string }) => {
          const result = this.updatePlanStatus(sessionId);
          return result;
        }
      }),

      get_plan: tool({
        description: 'Get current plan',
        inputSchema: z.object({
          sessionId: z.string()
        }),
        execute: async ({ sessionId }: { sessionId: string }) => {
          const result = this.getPlan(sessionId);
          return result;
        }
      }),
      
      update_task: tool({
        description: 'Update task status',
        inputSchema: z.object({
          sessionId: z.string(),
          taskId: z.string(),
          status: z.enum([TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED])
        }),
        execute: async ({ sessionId, taskId, status }: { sessionId: string; taskId: string; status: TaskStatus }) => {
          const result = this.updateTask(sessionId, taskId, status);
          return result;
        }
      }),
    };
  }
}