import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { GitHubTool, GetGitHubTokenFn, ToolOutput } from '../types/tool.js';
import { GitHubClient } from '../utils/github.js';

/**
 * Repository operations enum
 */
const RepoOperations = z.enum([
  'create',
  'delete',
  'update',
  'fork',
  'get',
  'list',
  'transfer',
]);

type RepoOperation = z.infer<typeof RepoOperations>;

/**
 * Repository management schema with discriminated unions
 */
const ManageReposSchema = z.object({
  token: z.string().optional().describe('GitHub token (optional if set via environment)'),
  operation: RepoOperations.describe('The repository operation to perform'),
  
  // Repository identification (required for most operations)
  owner: z.string().optional().describe('Repository owner (required for get, update, delete, fork, transfer)'),
  repo: z.string().optional().describe('Repository name (required for get, update, delete, fork, transfer)'),
  
  // Create operation parameters
  name: z.string().optional().describe('Repository name (required for create)'),
  description: z.string().optional().describe('Repository description (for create/update)'),
  private: z.boolean().optional().describe('Private repository flag (for create/update)'),
  auto_init: z.boolean().optional().describe('Initialize with README (for create)'),
  gitignore_template: z.string().optional().describe('Gitignore template (for create)'),
  license_template: z.string().optional().describe('License template (for create)'),
  
  // Update operation parameters
  new_name: z.string().optional().describe('New repository name (for update)'),
  homepage: z.string().optional().describe('Repository homepage URL (for update)'),
  has_issues: z.boolean().optional().describe('Enable issues (for update)'),
  has_projects: z.boolean().optional().describe('Enable projects (for update)'),
  has_wiki: z.boolean().optional().describe('Enable wiki (for update)'),
  
  // Transfer operation parameters
  new_owner: z.string().optional().describe('New owner for transfer operation'),
  
  // List operation parameters
  type: z.enum(['all', 'owner', 'public', 'private', 'member']).optional().describe('Repository type filter (for list)'),
  sort: z.enum(['created', 'updated', 'pushed', 'full_name']).optional().describe('Sort field (for list)'),
  direction: z.enum(['asc', 'desc']).optional().describe('Sort direction (for list)'),
  per_page: z.number().min(1).max(100).optional().describe('Results per page (for list)'),
  page: z.number().min(1).optional().describe('Page number (for list)'),
}).refine((data) => {
  // Validation based on operation
  switch (data.operation) {
    case 'create':
      return !!data.name;
    case 'get':
    case 'update':
    case 'delete':
    case 'fork':
      return !!data.owner && !!data.repo;
    case 'transfer':
      return !!data.owner && !!data.repo && !!data.new_owner;
    case 'list':
      return true; // No additional requirements
    default:
      return false;
  }
}, {
  message: 'Missing required parameters for the specified operation',
});

type ManageReposInput = z.infer<typeof ManageReposSchema>;

/**
 * Execute repository operations
 */
async function executeManageRepos(
  input: ManageReposInput,
  getGitHubToken: GetGitHubTokenFn
): Promise<{ operation: RepoOperation; result: unknown }> {
  const token = getGitHubToken(input.token);
  const github = GitHubClient.getInstance();
  
  try {
    await github.connect(token);
    const client = github.getClient(token);
    
    switch (input.operation) {
      case 'create': {
        const result = await client.rest.repos.createForAuthenticatedUser({
          name: input.name!,
          description: input.description,
          private: input.private,
          auto_init: input.auto_init,
          gitignore_template: input.gitignore_template,
          license_template: input.license_template,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'get': {
        const result = await client.rest.repos.get({
          owner: input.owner!,
          repo: input.repo!,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'update': {
        const updateData: Record<string, unknown> = {};
        if (input.new_name !== undefined) updateData.name = input.new_name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.homepage !== undefined) updateData.homepage = input.homepage;
        if (input.private !== undefined) updateData.private = input.private;
        if (input.has_issues !== undefined) updateData.has_issues = input.has_issues;
        if (input.has_projects !== undefined) updateData.has_projects = input.has_projects;
        if (input.has_wiki !== undefined) updateData.has_wiki = input.has_wiki;
        
        const result = await client.rest.repos.update({
          owner: input.owner!,
          repo: input.repo!,
          ...updateData,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'delete': {
        await client.rest.repos.delete({
          owner: input.owner!,
          repo: input.repo!,
        });
        return { operation: input.operation, result: { deleted: true, repository: `${input.owner}/${input.repo}` } };
      }
      
      case 'fork': {
        const result = await client.rest.repos.createFork({
          owner: input.owner!,
          repo: input.repo!,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'transfer': {
        const result = await client.rest.repos.transfer({
          owner: input.owner!,
          repo: input.repo!,
          new_owner: input.new_owner!,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'list': {
        const result = await client.rest.repos.listForAuthenticatedUser({
          type: input.type,
          sort: input.sort,
          direction: input.direction,
          per_page: input.per_page,
          page: input.page,
        });
        return { operation: input.operation, result: result.data };
      }
      
      default:
        throw new McpError(ErrorCode.InvalidParams, `Unsupported operation: ${input.operation}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Repository operation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    await github.disconnect();
  }
}

/**
 * Repository management tool
 */
export const manageReposTool: GitHubTool = {
  name: 'gh_manage_repos',
  description: 'Comprehensive GitHub repository management - create, update, delete, fork, get, list, and transfer repositories',
  inputSchema: ManageReposSchema,
  async execute(params: unknown, getGitHubToken: GetGitHubTokenFn): Promise<ToolOutput> {
    const validationResult = ManageReposSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        content: [{ type: 'text', text: `Invalid input: ${validationResult.error.format()}` }],
        isError: true,
      };
    }
    
    try {
      const result = await executeManageRepos(validationResult.data, getGitHubToken);
      return {
        content: [
          { type: 'text', text: `Repository ${result.operation} operation completed successfully` },
          { type: 'text', text: JSON.stringify(result.result, null, 2) },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof McpError
        ? error.message
        : error instanceof Error
        ? error.message
        : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  },
}; 