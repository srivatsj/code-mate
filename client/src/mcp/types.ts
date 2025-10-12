export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface MCPServersConfig {
  mcpServers: Record<string, MCPServerConfig>;
}
