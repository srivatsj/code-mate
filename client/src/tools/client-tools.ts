import { exec as execCallback } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

const exec = promisify(execCallback);


interface ToolResult {
    success: boolean;
    data?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    error?: string;
}
  
export class ClientTools {
    private userCwd = process.env.USER_CWD || process.cwd();

    async execute(toolName: string, args: Record<string, any>): Promise<ToolResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
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

    private async readFile(filePath: string): Promise<ToolResult> {
        try {
        const resolvedPath = path.resolve(this.userCwd, filePath);
        const content = await fs.readFile(resolvedPath, 'utf-8');
        return {
            success: true,
            data: { content, path: resolvedPath, size: content.length }
        };
        } catch (error) {
        throw new Error(`Failed to read ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async writeFile(filePath: string, content: string): Promise<ToolResult> {
        try {
        const resolvedPath = path.resolve(this.userCwd, filePath);
        await fs.writeFile(resolvedPath, content);
        return {
            success: true,
            data: { path: resolvedPath, bytes_written: content.length }
        };
        } catch (error) {
        throw new Error(`Failed to write ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async executeBash(command: string, cwd?: string): Promise<ToolResult> {
        try {
        const execCwd = cwd || this.userCwd;
        const { stdout, stderr } = await exec(command, { cwd: execCwd });
        return { 
            success: true, 
            data: { stdout, stderr, command } 
        };
        } catch (error) {
        throw new Error(`Command failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}