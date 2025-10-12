import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { MCPServersConfig } from './types';

const CONFIG_PATH = path.join(os.homedir(), '.code-mate', 'mcp-servers.json');

export async function loadMCPConfig(): Promise<MCPServersConfig | null> {
  try {
    const content = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // No config file
    }
    throw error;
  }
}
