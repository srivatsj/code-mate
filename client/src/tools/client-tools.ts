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
    private readFiles = new Set<string>(); // Track files that have been read

    async execute(toolName: string, args: Record<string, any>): Promise<ToolResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
        switch (toolName) {
        case 'read_file':
            return this.readFile(args.path);
        case 'write_file':
            return this.writeFile(args.path, args.content);
        case 'bash':
            return this.executeBash(args.command, args.cwd);
        case 'edit':
            return this.editFile(args.path, args.old_string, args.new_string);
        case 'glob':
            return this.globFiles(args.pattern, args.cwd);
        case 'grep':
            return this.grepFiles(args.pattern, args.path, args.case_insensitive);
        case 'web_fetch':
            return this.webFetch(args.url);
        default:
            throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private async readFile(filePath: string): Promise<ToolResult> {
        try {
        const resolvedPath = path.resolve(this.userCwd, filePath);
        const content = await fs.readFile(resolvedPath, 'utf-8');
        this.readFiles.add(resolvedPath); // Track that this file has been read
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

    private async editFile(filePath: string, oldString: string, newString: string): Promise<ToolResult> {
        try {
            const resolvedPath = path.resolve(this.userCwd, filePath);

            // Check if file has been read
            if (!this.readFiles.has(resolvedPath)) {
                throw new Error(`Cannot edit ${filePath}: file must be read first using read_file`);
            }

            const content = await fs.readFile(resolvedPath, 'utf-8');

            // Check if old_string exists
            if (!content.includes(oldString)) {
                throw new Error(`Cannot edit ${filePath}: old_string not found in file`);
            }

            // Replace old_string with new_string
            const newContent = content.replace(oldString, newString);
            await fs.writeFile(resolvedPath, newContent);

            return {
                success: true,
                data: { path: resolvedPath, replacements: 1 }
            };
        } catch (error) {
            throw new Error(`Failed to edit ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async globFiles(pattern: string, cwd?: string): Promise<ToolResult> {
        try {
            const searchCwd = cwd || this.userCwd;
            const { glob } = await import('glob');
            const files = await glob(pattern, { cwd: searchCwd });

            return {
                success: true,
                data: { files, pattern, count: files.length }
            };
        } catch (error) {
            throw new Error(`Glob failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async grepFiles(pattern: string, searchPath?: string, caseInsensitive?: boolean): Promise<ToolResult> {
        try {
            const targetPath = searchPath ? path.resolve(this.userCwd, searchPath) : this.userCwd;
            const flags = caseInsensitive ? '-ri' : '-r';
            const { stdout } = await exec(`grep ${flags} -n "${pattern}" "${targetPath}" || true`);

            const matches = stdout.trim().split('\n').filter(line => line.length > 0);

            return {
                success: true,
                data: { matches, pattern, count: matches.length }
            };
        } catch (error) {
            throw new Error(`Grep failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async webFetch(url: string): Promise<ToolResult> {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type') || '';
            let content: string;

            if (contentType.includes('application/json')) {
                const json = await response.json();
                content = JSON.stringify(json, null, 2);
            } else {
                content = await response.text();
            }

            return {
                success: true,
                data: {
                    url,
                    status: response.status,
                    contentType,
                    content,
                    size: content.length
                }
            };
        } catch (error) {
            throw new Error(`Web fetch failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}