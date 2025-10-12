import { Plan, PlanDataMessage, PlanStatus,TaskStatus, TodoTask, WSMessage } from '@shared/websocket-types';
import { tool } from 'ai';
import { z } from 'zod';

import logger from '../common/logger';

export class ServerTools {
  private plans = new Map<string, Plan>();

  constructor(
    private sessionId: string,
    private sendToClient: (message: WSMessage) => void
  ) {}

  private sendPlanData() {
    const plan = this.getPlan();
    logger.info('[ServerTools] Sending plan data for session %s: %d tasks, status %s',
      this.sessionId, plan.tasks.length, plan.status);
    const message: PlanDataMessage = {
      id: crypto.randomUUID(),
      type: 'plan_data',
      payload: { sessionId: this.sessionId, plan },
      timestamp: Date.now()
    };
    this.sendToClient(message);
    logger.info('[ServerTools] Plan data sent to client for session %s', this.sessionId);
  }

  private createPlan(tasks: string[], description?: string) {
    logger.info('[ServerTools] Creating plan for session %s with %d tasks: %s', this.sessionId, tasks.length, tasks);
    const planId = crypto.randomUUID();
    const plan: Plan = {
      id: planId,
      description,
      tasks: tasks.map((desc: string) => ({
        id: crypto.randomUUID(),
        description: desc,
        status: TaskStatus.PENDING
      })),
      status: PlanStatus.PENDING
    };
    this.plans.set(this.sessionId, plan);
    logger.info('[ServerTools] Plan created with id %s for session %s with %d tasks', planId, this.sessionId, plan.tasks.length);
    this.sendPlanData();
    return { success: true, plan_id: planId, total_tasks: plan.tasks.length };
  }

  private getPlan(): Plan {
    return this.plans.get(this.sessionId) || { id: '', tasks: [], status: PlanStatus.PENDING };
  }

  private updateTask(taskId: string, status: TaskStatus) {
    logger.info('[ServerTools] Updating task %s to status %s for session %s', taskId, status, this.sessionId);
    const plan = this.getPlan();
    const task = plan.tasks.find((t: TodoTask) => t.id === taskId);
    if (task) {
      logger.info('[ServerTools] Task found, updating status from %s to %s', task.status, status);
      task.status = status;

      const allCompleted = plan.tasks.every((t: TodoTask) => t.status === TaskStatus.COMPLETED);
      const anyInProgress = plan.tasks.some((t: TodoTask) => t.status === TaskStatus.IN_PROGRESS);

      plan.status = allCompleted ? PlanStatus.COMPLETED :
                    anyInProgress ? PlanStatus.IN_PROGRESS :
                    PlanStatus.PENDING;

      logger.info('[ServerTools] Plan status updated to %s', plan.status);
      this.sendPlanData();

      return {
        success: true,
        taskStatus: status,
        planStatus: plan.status,
        message: allCompleted ? 'All tasks completed!' : 'Task updated successfully'
      };
    } else {
      logger.warn('[ServerTools] Task %s not found in plan for session %s', taskId, this.sessionId);
    }
    return { success: false, message: 'Task not found' };
  }

  getTools() {
    return {
      create_plan: tool({
        description: 'Create a new plan with tasks for complex multi-step work. Use this when starting any complex task that requires multiple steps.',
        inputSchema: z.object({
          tasks: z.array(z.string()).describe('Array of task descriptions in order of execution'),
          description: z.string().optional().describe('Optional overall description of what the plan accomplishes')
        }),
        execute: async ({ tasks, description }: { tasks: string[]; description?: string }) => {
          return this.createPlan(tasks, description);
        }
      }),

      get_plan: tool({
        description: 'Retrieve the current plan with all tasks and their IDs. ALWAYS call this before updating tasks to get the correct task IDs.',
        inputSchema: z.object({}),
        execute: async () => {
          return this.getPlan();
        }
      }),

      update_task: tool({
        description: 'Update a specific task status. This automatically updates the overall plan status. Use get_plan first to retrieve task IDs, then use the task.id (UUID) from the plan. IMPORTANT: Mark tasks as COMPLETED immediately after finishing them.',
        inputSchema: z.object({
          taskId: z.string().describe('The task ID (UUID) from the plan - get this from get_plan first'),
          status: z.enum([TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]).describe('New status for the task - mark as COMPLETED immediately after finishing')
        }),
        execute: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
          return this.updateTask(taskId, status);
        }
      }),

      web_search: tool({
        description: 'Search the web for current, real-time information. REQUIRED for: latest news, recent events, current prices, up-to-date documentation, or any information after January 2025. Always use this when user asks about "latest", "current", "recent", or "today".',
        inputSchema: z.object({
          query: z.string().describe('The search query to find information about'),
          max_results: z.number().optional().default(5).describe('Maximum number of search results to return (default: 5)')
        }),
        execute: async (args: { query: string; max_results?: number }) => {
          try {
            const apiKey = process.env.TAVILY_API_KEY;
            if (!apiKey) {
              throw new Error('TAVILY_API_KEY environment variable is not set');
            }

            const response = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                api_key: apiKey,
                query: args.query,
                max_results: args.max_results || 5,
                include_answer: true,
                include_raw_content: false
              })
            });

            if (!response.ok) {
              throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return {
              success: true,
              query: args.query,
              answer: data.answer,
              results: data.results?.map((r: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
                title: r.title,
                url: r.url,
                content: r.content,
                score: r.score
              })) || []
            };
          } catch (error) {
            logger.error('[ServerTools] Web search failed: %s', error instanceof Error ? error.message : String(error));
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
          }
        }
      })
    };
  }
}