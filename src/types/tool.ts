import type { z } from 'zod';

/**
 * Function type for getting GitHub token
 */
export type GetGitHubTokenFn = (tokenArg?: string) => string;

/**
 * Tool output interface following postgres-mcp pattern
 */
export interface ToolOutput {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * GitHub tool interface following postgres-mcp pattern
 */
export interface GitHubTool {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny; // Zod schema, will be converted to JSON schema for MCP
  execute: (args: unknown, getGitHubToken: GetGitHubTokenFn) => Promise<ToolOutput>;
}

/**
 * GitHub API error structure
 */
export interface GitHubError {
  status: number;
  message: string;
  documentation_url?: string;
} 