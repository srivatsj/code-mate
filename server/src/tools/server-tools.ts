import { Plan, PlanDataMessage, PlanStatus,TaskStatus, TodoTask, WSMessage } from '@shared/websocket-types';
import { tool } from 'ai';
import { z } from 'zod';

import logger from '../common/logger';

export class ServerTools {
  private plans = new Map<string, Plan>();

  constructor(private sendToClient?: (message: WSMessage) => void) {}

  private sendPlanData(sessionId: string) {
    if (this.sendToClient) {
      const plan = this.getPlan(sessionId);
      logger.info('[ServerTools] Sending plan data for session %s: %d tasks, status %s',
        sessionId, plan.tasks.length, plan.status);
      const message: PlanDataMessage = {
        id: crypto.randomUUID(),
        type: 'plan_data',
        payload: { sessionId, plan },
        timestamp: Date.now()
      };
      this.sendToClient(message);
      logger.info('[ServerTools] Plan data sent to client for session %s', sessionId);
    } else {
      logger.warn('[ServerTools] No sendToClient function available for session %s', sessionId);
    }
  }

  private createPlan(sessionId: string, tasks: string[], description?: string) {
    logger.info('[ServerTools] Creating plan for session %s with %d tasks: %s', sessionId, tasks.length, tasks);
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
    logger.info('[ServerTools] Plan created for session %s with %d tasks', sessionId, plan.tasks.length);
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
    logger.info('[ServerTools] Updating task %s to status %s for session %s', taskId, status, sessionId);
    const plan = this.getPlan(sessionId);
    const task = plan.tasks.find((t: TodoTask) => t.id === taskId);
    if (task) {
      logger.info('[ServerTools] Task found, updating status from %s to %s', task.status, status);
      task.status = status;
      plan.status = plan.tasks.every((t: TodoTask) => t.status === TaskStatus.COMPLETED) ? PlanStatus.COMPLETED : PlanStatus.IN_PROGRESS;
      logger.info('[ServerTools] Plan status updated to %s', plan.status);
      this.sendPlanData(sessionId);
    } else {
      logger.warn('[ServerTools] Task %s not found in plan for session %s', taskId, sessionId);
    }
    return { success: !!task };
  }

  getTools() {
    return {
      create_plan: tool({
        description: 'Create a new plan with tasks for complex multi-step work. Use this when starting any complex task that requires multiple steps.',
        inputSchema: z.object({
          sessionId: z.string().describe('Session identifier to associate the plan with'),
          tasks: z.array(z.string()).describe('Array of task descriptions in order of execution'),
          description: z.string().optional().describe('Optional overall description of what the plan accomplishes')
        }),
        execute: async ({ sessionId, tasks, description }: { sessionId: string; tasks: string[]; description?: string }) => {
          const result = this.createPlan(sessionId, tasks, description);
          return result;
        }
      }),

      update_plan_status: tool({
        description: 'Update the overall plan status based on current task completion. Call this after tasks are completed to refresh the plan status.',
        inputSchema: z.object({
          sessionId: z.string().describe('Session identifier for the plan to update')
        }),
        execute: async ({ sessionId }: { sessionId: string }) => {
          const result = this.updatePlanStatus(sessionId);
          return result;
        }
      }),

      get_plan: tool({
        description: 'Retrieve the current plan with all tasks and their IDs. ALWAYS call this before updating tasks to get the correct task IDs.',
        inputSchema: z.object({
          sessionId: z.string().describe('Session identifier for the plan to retrieve')
        }),
        execute: async ({ sessionId }: { sessionId: string }) => {
          const result = this.getPlan(sessionId);
          return result;
        }
      }),
      
      update_task: tool({
        description: 'Update a specific task status. Use get_plan first to retrieve task IDs, then use the task.id (UUID) from the plan.',
        inputSchema: z.object({
          sessionId: z.string().describe('Session identifier for the plan containing the task'),
          taskId: z.string().describe('The task ID (UUID) from the plan - get this from get_plan first'),
          status: z.enum([TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]).describe('New status for the task')
        }),
        execute: async ({ sessionId, taskId, status }: { sessionId: string; taskId: string; status: TaskStatus }) => {
          const result = this.updateTask(sessionId, taskId, status);
          return result;
        }
      }),
    };
  }
}