import { ToolResultPayload } from '@shared/websocket-types';

export class ToolCoordinator {
  private pendingToolResolves = new Map<string, (res: any) => void>(); // eslint-disable-line @typescript-eslint/no-explicit-any

  createPending(id: string): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    return new Promise((resolve) => {
      this.pendingToolResolves.set(id, resolve);
    });
  }

  resolve(id: string, toolResult: ToolResultPayload): boolean {
    const resolver = this.pendingToolResolves.get(id);
    if (resolver) {
      // Convert tool result to the format the AI SDK expects
      const result = toolResult.error
        ? { error: toolResult.error }
        : toolResult.result;

      resolver(result);
      this.pendingToolResolves.delete(id);
      return true;
    }
    return false;
  }
}
  