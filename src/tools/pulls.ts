import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { GitHubTool, GetGitHubTokenFn, ToolOutput } from '../types/tool.js';
import { GitHubClient } from '../utils/github.js';

/**
 * Pull request operations enum
 */
const PullOperations = z.enum([
  'create',
  'update',
  'merge',
  'review',
  'approve',
  'request_changes',
  'list',
  'get',
  'close',
]);

type PullOperation = z.infer<typeof PullOperations>;

/**
 * Pull request management schema with discriminated unions
 */
const ManagePullsSchema = z.object({
  token: z.string().optional().describe('GitHub token (optional if set via environment)'),
  operation: PullOperations.describe('The pull request operation to perform'),
  
  // Repository identification (required for most operations)
  owner: z.string().optional().describe('Repository owner (required for repo-specific operations)'),
  repo: z.string().optional().describe('Repository name (required for repo-specific operations)'),
  
  // Pull request identification (required for specific PR operations)
  pull_number: z.number().optional().describe('Pull request number (required for get, update, merge, review operations)'),
  
  // Create operation parameters
  title: z.string().optional().describe('Pull request title (required for create)'),
  head: z.string().optional().describe('Branch containing changes (required for create)'),
  base: z.string().optional().describe('Branch to merge into (required for create)'),
  body: z.string().optional().describe('Pull request description (for create/update)'),
  draft: z.boolean().optional().describe('Create as draft PR (for create)'),
  maintainer_can_modify: z.boolean().optional().describe('Allow maintainer edits (for create)'),
  
  // Update operation parameters
  state: z.enum(['open', 'closed']).optional().describe('Pull request state (for update)'),
  
  // Merge operation parameters
  commit_title: z.string().optional().describe('Commit title for merge (for merge)'),
  commit_message: z.string().optional().describe('Commit message for merge (for merge)'),
  merge_method: z.enum(['merge', 'squash', 'rebase']).optional().describe('Merge method (for merge)'),
  
  // Review operation parameters
  review_body: z.string().optional().describe('Review comment (for review/approve/request_changes)'),
  review_event: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']).optional().describe('Review type (for review)'),
  review_comments: z.array(z.object({
    path: z.string(),
    line: z.number().optional(),
    position: z.number().optional(),
    body: z.string(),
  })).optional().describe('Line-specific review comments (for review)'),
  
  // List operation parameters
  state_filter: z.enum(['open', 'closed', 'all']).optional().describe('PR state filter (for list)'),
  head_filter: z.string().optional().describe('Head branch filter (for list)'),
  base_filter: z.string().optional().describe('Base branch filter (for list)'),
  sort: z.enum(['created', 'updated', 'popularity', 'long-running']).optional().describe('Sort field (for list)'),
  direction: z.enum(['asc', 'desc']).optional().describe('Sort direction (for list)'),
  per_page: z.number().min(1).max(100).optional().describe('Results per page (for list)'),
  page: z.number().min(1).optional().describe('Page number (for list)'),
}).refine((data) => {
  // Validation based on operation
  switch (data.operation) {
    case 'create':
      return !!data.owner && !!data.repo && !!data.title && !!data.head && !!data.base;
    case 'get':
    case 'update':
    case 'merge':
    case 'close':
      return !!data.owner && !!data.repo && !!data.pull_number;
    case 'review':
      return !!data.owner && !!data.repo && !!data.pull_number && !!data.review_event;
    case 'approve':
    case 'request_changes':
      return !!data.owner && !!data.repo && !!data.pull_number;
    case 'list':
      return !!data.owner && !!data.repo;
    default:
      return false;
  }
}, {
  message: 'Missing required parameters for the specified operation',
});

type ManagePullsInput = z.infer<typeof ManagePullsSchema>;

/**
 * Execute pull request operations
 */
async function executeManagePulls(
  input: ManagePullsInput,
  getGitHubToken: GetGitHubTokenFn
): Promise<{ operation: PullOperation; result: unknown }> {
  const token = getGitHubToken(input.token);
  const github = GitHubClient.getInstance();
  
  try {
    await github.connect(token);
    const client = github.getClient(token);
    
    switch (input.operation) {
      case 'create': {
        const result = await client.rest.pulls.create({
          owner: input.owner!,
          repo: input.repo!,
          title: input.title!,
          head: input.head!,
          base: input.base!,
          body: input.body,
          draft: input.draft,
          maintainer_can_modify: input.maintainer_can_modify,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'get': {
        const result = await client.rest.pulls.get({
          owner: input.owner!,
          repo: input.repo!,
          pull_number: input.pull_number!,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'update': {
        const updateData: Record<string, unknown> = {};
        if (input.title !== undefined) updateData.title = input.title;
        if (input.body !== undefined) updateData.body = input.body;
        if (input.state !== undefined) updateData.state = input.state;
        if (input.base !== undefined) updateData.base = input.base;
        if (input.maintainer_can_modify !== undefined) updateData.maintainer_can_modify = input.maintainer_can_modify;
        
        const result = await client.rest.pulls.update({
          owner: input.owner!,
          repo: input.repo!,
          pull_number: input.pull_number!,
          ...updateData,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'close': {
        const result = await client.rest.pulls.update({
          owner: input.owner!,
          repo: input.repo!,
          pull_number: input.pull_number!,
          state: 'closed',
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'merge': {
        const result = await client.rest.pulls.merge({
          owner: input.owner!,
          repo: input.repo!,
          pull_number: input.pull_number!,
          commit_title: input.commit_title,
          commit_message: input.commit_message,
          merge_method: input.merge_method,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'review': {
        const result = await client.rest.pulls.createReview({
          owner: input.owner!,
          repo: input.repo!,
          pull_number: input.pull_number!,
          body: input.review_body,
          event: input.review_event!,
          comments: input.review_comments,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'approve': {
        const result = await client.rest.pulls.createReview({
          owner: input.owner!,
          repo: input.repo!,
          pull_number: input.pull_number!,
          body: input.review_body || 'Approved',
          event: 'APPROVE',
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'request_changes': {
        const result = await client.rest.pulls.createReview({
          owner: input.owner!,
          repo: input.repo!,
          pull_number: input.pull_number!,
          body: input.review_body || 'Changes requested',
          event: 'REQUEST_CHANGES',
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'list': {
        const result = await client.rest.pulls.list({
          owner: input.owner!,
          repo: input.repo!,
          state: input.state_filter || 'open',
          head: input.head_filter,
          base: input.base_filter,
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
      `Pull request operation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    await github.disconnect();
  }
}

/**
 * Pull request management tool
 */
export const managePullsTool: GitHubTool = {
  name: 'gh_manage_pulls',
  description: 'Comprehensive GitHub pull request management - create, update, merge, review, approve, request changes, list, and get pull requests',
  inputSchema: ManagePullsSchema,
  async execute(params: unknown, getGitHubToken: GetGitHubTokenFn): Promise<ToolOutput> {
    const validationResult = ManagePullsSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        content: [{ type: 'text', text: `Invalid input: ${validationResult.error.format()}` }],
        isError: true,
      };
    }
    
    try {
      const result = await executeManagePulls(validationResult.data, getGitHubToken);
      return {
        content: [
          { type: 'text', text: `Pull request ${result.operation} operation completed successfully` },
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