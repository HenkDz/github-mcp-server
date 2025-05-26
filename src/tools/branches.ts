import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { GitHubTool, GetGitHubTokenFn, ToolOutput } from '../types/tool.js';
import { GitHubClient } from '../utils/github.js';

/**
 * Branch operations enum
 */
const BranchOperations = z.enum([
  'create',
  'delete',
  'get',
  'list',
  'protect',
  'get_protection',
  'update_protection',
]);

type BranchOperation = z.infer<typeof BranchOperations>;

/**
 * Simplified branch protection rule schema
 * Note: For complex protection rules, use GitHub UI or direct API calls
 */
const BranchProtectionSchema = z.object({
  required_status_checks: z.object({
    strict: z.boolean(),
    contexts: z.array(z.string()),
  }).nullable().optional(),
  enforce_admins: z.boolean().nullable().optional(),
  required_pull_request_reviews: z.object({
    required_approving_review_count: z.number().min(1).max(6).optional(),
    dismiss_stale_reviews: z.boolean().optional(),
    require_code_owner_reviews: z.boolean().optional(),
  }).nullable().optional(),
  restrictions: z.object({
    users: z.array(z.string()),
    teams: z.array(z.string()),
  }).nullable().optional(),
});

/**
 * Branch management schema with discriminated unions
 */
const ManageBranchesSchema = z.object({
  token: z.string().optional().describe('GitHub token (optional if set via environment)'),
  operation: BranchOperations.describe('The branch operation to perform'),
  
  // Repository identification (required for all operations)
  owner: z.string().optional().describe('Repository owner (required for all operations)'),
  repo: z.string().optional().describe('Repository name (required for all operations)'),
  
  // Branch identification (required for specific branch operations)
  branch: z.string().optional().describe('Branch name (required for get, delete, protect, get_protection, update_protection)'),
  
  // Create operation parameters
  sha: z.string().optional().describe('SHA to create branch from (required for create, defaults to default branch)'),
  
  // Protection operation parameters
  protection: BranchProtectionSchema.optional().describe('Branch protection settings (for protect/update_protection)'),
  
  // List operation parameters
  protected: z.boolean().optional().describe('Filter by protection status (for list)'),
  per_page: z.number().min(1).max(100).optional().describe('Results per page (for list)'),
  page: z.number().min(1).optional().describe('Page number (for list)'),
}).refine((data) => {
  // Validation based on operation
  switch (data.operation) {
    case 'create':
      return !!data.owner && !!data.repo && !!data.branch;
    case 'get':
    case 'delete':
    case 'get_protection':
      return !!data.owner && !!data.repo && !!data.branch;
    case 'protect':
    case 'update_protection':
      return !!data.owner && !!data.repo && !!data.branch && !!data.protection;
    case 'list':
      return !!data.owner && !!data.repo;
    default:
      return false;
  }
}, {
  message: 'Missing required parameters for the specified operation',
});

type ManageBranchesInput = z.infer<typeof ManageBranchesSchema>;

/**
 * Execute branch operations
 */
async function executeManageBranches(
  input: ManageBranchesInput,
  getGitHubToken: GetGitHubTokenFn
): Promise<{ operation: BranchOperation; result: unknown }> {
  const token = getGitHubToken(input.token);
  const github = GitHubClient.getInstance();
  
  try {
    await github.connect(token);
    const client = github.getClient(token);
    
    switch (input.operation) {
      case 'create': {
        // Get the default branch SHA if no SHA provided
        let baseSha = input.sha;
        if (!baseSha) {
          const repo = await client.rest.repos.get({
            owner: input.owner!,
            repo: input.repo!,
          });
          const defaultBranch = await client.rest.repos.getBranch({
            owner: input.owner!,
            repo: input.repo!,
            branch: repo.data.default_branch,
          });
          baseSha = defaultBranch.data.commit.sha;
        }
        
        const result = await client.rest.git.createRef({
          owner: input.owner!,
          repo: input.repo!,
          ref: `refs/heads/${input.branch!}`,
          sha: baseSha,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'get': {
        const result = await client.rest.repos.getBranch({
          owner: input.owner!,
          repo: input.repo!,
          branch: input.branch!,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'delete': {
        await client.rest.git.deleteRef({
          owner: input.owner!,
          repo: input.repo!,
          ref: `heads/${input.branch!}`,
        });
        return { operation: input.operation, result: { message: 'Branch deleted successfully' } };
      }
      
      case 'list': {
        const result = await client.rest.repos.listBranches({
          owner: input.owner!,
          repo: input.repo!,
          protected: input.protected,
          per_page: input.per_page,
          page: input.page,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'protect': {
        const protectionConfig = {
          owner: input.owner!,
          repo: input.repo!,
          branch: input.branch!,
          required_status_checks: input.protection!.required_status_checks || null,
          enforce_admins: input.protection!.enforce_admins || null,
          required_pull_request_reviews: input.protection!.required_pull_request_reviews || null,
          restrictions: input.protection!.restrictions || null,
        };
        const result = await client.rest.repos.updateBranchProtection(protectionConfig as any);
        return { operation: input.operation, result: result.data };
      }
      
      case 'get_protection': {
        const result = await client.rest.repos.getBranchProtection({
          owner: input.owner!,
          repo: input.repo!,
          branch: input.branch!,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'update_protection': {
        const protectionConfig = {
          owner: input.owner!,
          repo: input.repo!,
          branch: input.branch!,
          required_status_checks: input.protection!.required_status_checks || null,
          enforce_admins: input.protection!.enforce_admins || null,
          required_pull_request_reviews: input.protection!.required_pull_request_reviews || null,
          restrictions: input.protection!.restrictions || null,
        };
        const result = await client.rest.repos.updateBranchProtection(protectionConfig as any);
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
      `Branch operation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    await github.disconnect();
  }
}

/**
 * Branch management tool
 */
export const manageBranchesTool: GitHubTool = {
  name: 'gh_manage_branches',
  description: 'Comprehensive GitHub branch management - create, delete, get, list, and manage branch protection settings',
  inputSchema: ManageBranchesSchema,
  async execute(params: unknown, getGitHubToken: GetGitHubTokenFn): Promise<ToolOutput> {
    const validationResult = ManageBranchesSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        content: [{ type: 'text', text: `Invalid input: ${validationResult.error.format()}` }],
        isError: true,
      };
    }
    
    try {
      const result = await executeManageBranches(validationResult.data, getGitHubToken);
      return {
        content: [
          { type: 'text', text: `Branch ${result.operation} operation completed successfully` },
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