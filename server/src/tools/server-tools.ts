import { tool } from 'ai';
import { z } from 'zod';


interface TodoTask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface Plan {
  description?: string;
  tasks: TodoTask[];
  status: 'pending' | 'in_progress' | 'completed';
}

export class ServerTools {
  private plans = new Map<string, Plan>();

  private createPlan(sessionId: string, tasks: string[], description?: string) {
    const plan: Plan = {
      description,
      tasks: tasks.map((desc: string) => ({
        id: crypto.randomUUID(),
        description: desc,
        status: 'pending'
      })),
      status: 'pending'
    };
    this.plans.set(sessionId, plan);
    return { success: true, total_tasks: plan.tasks.length };
  }

  private updatePlanStatus(sessionId: string) {
    const plan = this.plans.get(sessionId);
    if (plan) {
      plan.status = plan.tasks.every(t => t.status === 'completed') ? 'completed' : 'in_progress';
      return { success: true, status: plan.status };
    }
    return { success: false };
  }

  private getPlan(sessionId: string): Plan {
    return this.plans.get(sessionId) || { tasks: [], status: 'pending' };
  }

  private updateTask(sessionId: string, taskId: string, status: 'pending' | 'in_progress' | 'completed') {
    const plan = this.getPlan(sessionId);
    const task = plan.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      const plan = this.plans.get(sessionId);
      if (plan) {
        plan.status = plan.tasks.every(t => t.status === 'completed') ? 'completed' : 'in_progress';
      }
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
          status: z.enum(['pending', 'in_progress', 'completed'])
        }),
        execute: async ({ sessionId, taskId, status }: { sessionId: string; taskId: string; status: 'pending' | 'in_progress' | 'completed' }) => {
          const result = this.updateTask(sessionId, taskId, status);
          return result;
        }
      }),
    };
  }
}