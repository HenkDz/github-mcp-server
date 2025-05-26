#!/usr/bin/env node
import { program } from 'commander';
import fs from 'node:fs';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Import tool types
import type { GitHubTool, ToolOutput } from './types/tool.js';

// Import all tool implementations
import { manageReposTool } from './tools/repos.js';
import { manageIssuesTool } from './tools/issues.js';
import { managePullsTool } from './tools/pulls.js';
import { manageBranchesTool } from './tools/branches.js';
import { manageReleasesTool } from './tools/releases.js';
import { manageActionsTool } from './tools/actions.js';
import { gitHubSearchTool } from './tools/search.js';

// Initialize commander
program
  .version('1.0.0')
  .option('-t, --token <string>', 'GitHub token')
  .option('-tc, --tools-config <path>', 'Path to tools configuration JSON file')
  .parse(process.argv);

const options = program.opts();

/**
 * Get GitHub token from various sources in order of precedence:
 * 1. Function argument (tool-specific)
 * 2. CLI --token option
 * 3. GITHUB_TOKEN environment variable
 */
function getGitHubToken(tokenArg?: string): string {
  if (tokenArg) {
    return tokenArg;
  }
  const cliToken = options.token;
  if (cliToken) {
    return cliToken;
  }
  const envToken = process.env.GITHUB_TOKEN;
  if (envToken) {
    return envToken;
  }
  throw new McpError(
    ErrorCode.InvalidParams,
    'No GitHub token provided. Provide one in the tool arguments, via the --token CLI option, or set the GITHUB_TOKEN environment variable.'
  );
}

class GitHubServer {
  private server: Server;
  public availableToolsList: GitHubTool[];
  private enabledTools: GitHubTool[];
  private enabledToolsMap: Record<string, GitHubTool>;

  constructor(initialTools: GitHubTool[] = []) {
    this.availableToolsList = [...initialTools];
    this.enabledTools = [];
    this.enabledToolsMap = {};
    this.loadAndFilterTools();

    this.server = new Server(
      {
        name: 'github-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: this.enabledTools.reduce(
            (acc, tool) => {
              acc[tool.name] = {
                name: tool.name,
                description: tool.description,
                inputSchema: zodToJsonSchema(tool.inputSchema),
              };
              return acc;
            },
            {} as Record<string, { name: string; description: string; inputSchema: object }>
          ),
        },
      }
    );

    this.setupToolHandlers();
    this.server.onerror = (error) => console.error('[MCP Error]', error);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Load tools configuration and filter enabled tools
   */
  private loadAndFilterTools(): void {
    let toolsToEnable = [...this.availableToolsList];
    const toolsConfigPath = options.toolsConfig;

    if (toolsConfigPath) {
      try {
        const configContent = fs.readFileSync(toolsConfigPath, 'utf-8');
        const config = JSON.parse(configContent);
        if (
          config &&
          Array.isArray(config.enabledTools) &&
          config.enabledTools.every((t: unknown) => typeof t === 'string')
        ) {
          const enabledToolNames = new Set(config.enabledTools as string[]);
          toolsToEnable = this.availableToolsList.filter((tool) =>
            enabledToolNames.has(tool.name)
          );
          console.error(
            `[MCP Info] Loaded tools configuration from ${toolsConfigPath}. Enabled tools: ${toolsToEnable
              .map((t) => t.name)
              .join(', ')}`
          );

          // Warn about tools specified in config but not available
          for (const requestedName of enabledToolNames) {
            if (!this.availableToolsList.some((tool) => tool.name === requestedName)) {
              console.warn(
                `[MCP Warning] Tool "${requestedName}" specified in config file but not found in available tools.`
              );
            }
          }
        } else {
          console.error(
            `[MCP Warning] Invalid tools configuration file format at ${toolsConfigPath}.`
          );
        }
      } catch (error) {
        console.error(
          `[MCP Warning] Could not read or parse tools configuration file at ${toolsConfigPath}. Error: ${
            error instanceof Error ? error.message : String(error)
          }.`
        );
      }
    } else {
      if (this.availableToolsList.length > 0) {
        console.error('[MCP Info] No tools configuration file provided. All available tools will be enabled.');
      } else {
        console.error(
          '[MCP Info] No tools configuration file provided and no tools loaded into availableToolsList.'
        );
      }
    }

    this.enabledTools = toolsToEnable;
    this.enabledToolsMap = toolsToEnable.reduce(
      (acc, tool) => {
        acc[tool.name] = tool;
        return acc;
      },
      {} as Record<string, GitHubTool>
    );
  }

  /**
   * Clean up resources on shutdown
   */
  private async cleanup(): Promise<void> {
    console.error('Shutting down GitHub MCP server...');
    if (this.server) {
      await this.server.close();
    }
  }

  /**
   * Setup MCP request handlers
   */
  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.enabledTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: zodToJsonSchema(tool.inputSchema),
      })),
    }));

    // Handle tool execution requests
    this.server.setRequestHandler(
      CallToolRequestSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async (request: any): Promise<ToolOutput> => {
        try {
          const toolName = request.params.name;
          const tool = this.enabledToolsMap[toolName];

          if (!tool) {
            const wasAvailable = this.availableToolsList.some((t) => t.name === toolName);
            const message = wasAvailable
              ? `Tool "${toolName}" is available but not enabled by the current server configuration.`
              : `Tool '${toolName}' is not enabled or does not exist.`;
            throw new McpError(ErrorCode.MethodNotFound, message);
          }

          const result: ToolOutput = await tool.execute(request.params.arguments, getGitHubToken);
          return result;
        } catch (error) {
          console.error(`Error handling request for tool ${request.params.name}:`, error);
          let errorMessage = error instanceof Error ? error.message : String(error);
          if (error instanceof McpError) {
            errorMessage = error.message;
          }
          return {
            content: [{ type: 'text', text: `Error: ${errorMessage}` }],
            isError: true,
          } as ToolOutput;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    );
  }

  async run(): Promise<void> {
    if (this.availableToolsList.length === 0 && !options.toolsConfig) {
      console.warn(
        '[MCP Warning] No tools loaded and no tools config provided. Server will start with no active tools.'
      );
    }

    this.loadAndFilterTools();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GitHub MCP server running on stdio');
  }
}

/**
 * All available GitHub MCP tools
 * Following the blueprint consolidation strategy
 */
const allTools: GitHubTool[] = [
  // Meta-Tools (Phase 1)
  manageReposTool,
  
  // Phase 2 tools
  manageIssuesTool,
  managePullsTool,
  manageBranchesTool,
  manageReleasesTool,
  
  // Phase 3 tools
  manageActionsTool,
  gitHubSearchTool,
  
  // TODO: Phase 4 specialized tools
  // analyzeRepoTool,
  // bulkOperationsTool,
];

const serverInstance = new GitHubServer(allTools);

serverInstance.run().catch((error) => {
  console.error('Failed to run the server:', error);
  process.exit(1);
}); 