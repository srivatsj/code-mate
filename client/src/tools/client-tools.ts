import { exec as execCallback } from 'child_process';
import fs from 'fs/promises';
import { promisify } from 'util';

const exec = promisify(execCallback);


interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
}
  
export class ClientTools {
    async execute(toolName: string, args: Record<string, any>): Promise<ToolResult> {
        switch (toolName) {
        case 'read_file':
            return this.readFile(args.path);
        case 'write_file':
            return this.writeFile(args.path, args.content);
        case 'bash':
            return this.executeBash(args.command, args.cwd);
        default:
            throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private async readFile(path: string): Promise<ToolResult> {
        try {
        const content = await fs.readFile(path, 'utf-8');
        return { 
            success: true, 
            data: { content, path, size: content.length } 
        };
        } catch (error) {
        throw new Error(`Failed to read ${path}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async writeFile(path: string, content: string): Promise<ToolResult> {
        try {
        await fs.writeFile(path, content);
        return { 
            success: true, 
            data: { path, bytes_written: content.length } 
        };
        } catch (error) {
        throw new Error(`Failed to write ${path}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async executeBash(command: string, cwd?: string): Promise<ToolResult> {
        try {
        const { stdout, stderr } = await exec(command, { cwd });
        return { 
            success: true, 
            data: { stdout, stderr, command } 
        };
        } catch (error) {
        throw new Error(`Command failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}