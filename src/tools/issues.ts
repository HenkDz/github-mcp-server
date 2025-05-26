import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { GitHubTool, GetGitHubTokenFn, ToolOutput } from '../types/tool.js';
import { GitHubClient } from '../utils/github.js';

/**
 * Issue operations enum
 */
const IssueOperations = z.enum([
  'create',
  'update',
  'close',
  'assign',
  'label',
  'comment',
  'search',
  'list',
  'get',
]);

type IssueOperation = z.infer<typeof IssueOperations>;

/**
 * Issue management schema with discriminated unions
 */
const ManageIssuesSchema = z.object({
  token: z.string().optional().describe('GitHub token (optional if set via environment)'),
  operation: IssueOperations.describe('The issue operation to perform'),
  
  // Repository identification (required for most operations)
  owner: z.string().optional().describe('Repository owner (required for repo-specific operations)'),
  repo: z.string().optional().describe('Repository name (required for repo-specific operations)'),
  
  // Issue identification (required for specific issue operations)
  issue_number: z.number().optional().describe('Issue number (required for get, update, close, assign, label, comment)'),
  
  // Create operation parameters
  title: z.string().optional().describe('Issue title (required for create)'),
  body: z.string().optional().describe('Issue body/description (for create/update)'),
  labels: z.array(z.string()).optional().describe('Issue labels (for create/update/label)'),
  assignees: z.array(z.string()).optional().describe('Issue assignees (for create/update/assign)'),
  milestone: z.number().optional().describe('Milestone number (for create/update)'),
  
  // Update operation parameters
  state: z.enum(['open', 'closed']).optional().describe('Issue state (for update)'),
  state_reason: z.enum(['completed', 'not_planned', 'reopened']).optional().describe('State reason (for update when closing)'),
  
  // Comment operation parameters
  comment_body: z.string().optional().describe('Comment text (required for comment operation)'),
  
  // Search operation parameters
  q: z.string().optional().describe('Search query (required for search)'),
  sort: z.enum(['created', 'updated', 'comments']).optional().describe('Sort field (for search/list)'),
  order: z.enum(['asc', 'desc']).optional().describe('Sort order (for search/list)'),
  
  // List operation parameters
  state_filter: z.enum(['open', 'closed', 'all']).optional().describe('Issue state filter (for list)'),
  labels_filter: z.string().optional().describe('Labels filter (comma-separated, for list)'),
  assignee: z.string().optional().describe('Assignee filter (for list)'),
  creator: z.string().optional().describe('Creator filter (for list)'),
  mentioned: z.string().optional().describe('User mentioned filter (for list)'),
  since: z.string().optional().describe('Only issues updated after this time (ISO 8601, for list)'),
  per_page: z.number().min(1).max(100).optional().describe('Results per page (for list/search)'),
  page: z.number().min(1).optional().describe('Page number (for list/search)'),
}).refine((data) => {
  // Validation based on operation
  switch (data.operation) {
    case 'create':
      return !!data.owner && !!data.repo && !!data.title;
    case 'get':
    case 'update':
    case 'close':
    case 'assign':
    case 'label':
      return !!data.owner && !!data.repo && !!data.issue_number;
    case 'comment':
      return !!data.owner && !!data.repo && !!data.issue_number && !!data.comment_body;
    case 'list':
      return !!data.owner && !!data.repo;
    case 'search':
      return !!data.q;
    default:
      return false;
  }
}, {
  message: 'Missing required parameters for the specified operation',
});

type ManageIssuesInput = z.infer<typeof ManageIssuesSchema>;

/**
 * Execute issue operations
 */
async function executeManageIssues(
  input: ManageIssuesInput,
  getGitHubToken: GetGitHubTokenFn
): Promise<{ operation: IssueOperation; result: unknown }> {
  const token = getGitHubToken(input.token);
  const github = GitHubClient.getInstance();
  
  try {
    await github.connect(token);
    const client = github.getClient(token);
    
    switch (input.operation) {
      case 'create': {
        const result = await client.rest.issues.create({
          owner: input.owner!,
          repo: input.repo!,
          title: input.title!,
          body: input.body,
          labels: input.labels,
          assignees: input.assignees,
          milestone: input.milestone,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'get': {
        const result = await client.rest.issues.get({
          owner: input.owner!,
          repo: input.repo!,
          issue_number: input.issue_number!,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'update': {
        const updateData: Record<string, unknown> = {};
        if (input.title !== undefined) updateData.title = input.title;
        if (input.body !== undefined) updateData.body = input.body;
        if (input.state !== undefined) updateData.state = input.state;
        if (input.state_reason !== undefined) updateData.state_reason = input.state_reason;
        if (input.labels !== undefined) updateData.labels = input.labels;
        if (input.assignees !== undefined) updateData.assignees = input.assignees;
        if (input.milestone !== undefined) updateData.milestone = input.milestone;
        
        const result = await client.rest.issues.update({
          owner: input.owner!,
          repo: input.repo!,
          issue_number: input.issue_number!,
          ...updateData,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'close': {
        const result = await client.rest.issues.update({
          owner: input.owner!,
          repo: input.repo!,
          issue_number: input.issue_number!,
          state: 'closed',
          state_reason: input.state_reason || 'completed',
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'assign': {
        const result = await client.rest.issues.update({
          owner: input.owner!,
          repo: input.repo!,
          issue_number: input.issue_number!,
          assignees: input.assignees || [],
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'label': {
        const result = await client.rest.issues.update({
          owner: input.owner!,
          repo: input.repo!,
          issue_number: input.issue_number!,
          labels: input.labels || [],
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'comment': {
        const result = await client.rest.issues.createComment({
          owner: input.owner!,
          repo: input.repo!,
          issue_number: input.issue_number!,
          body: input.comment_body!,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'list': {
        const result = await client.rest.issues.listForRepo({
          owner: input.owner!,
          repo: input.repo!,
          state: input.state_filter || 'open',
          labels: input.labels_filter,
          assignee: input.assignee,
          creator: input.creator,
          mentioned: input.mentioned,
          since: input.since,
          sort: input.sort,
          direction: input.order,
          per_page: input.per_page,
          page: input.page,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'search': {
        const result = await client.rest.search.issuesAndPullRequests({
          q: input.q!,
          sort: input.sort,
          order: input.order,
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
      `Issue operation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    await github.disconnect();
  }
}

/**
 * Issue management tool
 */
export const manageIssuesTool: GitHubTool = {
  name: 'gh_manage_issues',
  description: 'Comprehensive GitHub issue management - create, update, close, assign, label, comment, search, and list issues',
  inputSchema: ManageIssuesSchema,
  async execute(params: unknown, getGitHubToken: GetGitHubTokenFn): Promise<ToolOutput> {
    const validationResult = ManageIssuesSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        content: [{ type: 'text', text: `Invalid input: ${validationResult.error.format()}` }],
        isError: true,
      };
    }
    
    try {
      const result = await executeManageIssues(validationResult.data, getGitHubToken);
      return {
        content: [
          { type: 'text', text: `Issue ${result.operation} operation completed successfully` },
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