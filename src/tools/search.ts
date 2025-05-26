import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { GitHubTool, GetGitHubTokenFn, ToolOutput } from '../types/tool.js';
import { GitHubClient } from '../utils/github.js';

/**
 * Search operations enum
 */
const SearchOperations = z.enum([
  'repositories',
  'issues',
  'pull_requests', 
  'users',
  'code',
  'commits',
  'topics',
]);

type SearchOperation = z.infer<typeof SearchOperations>;

/**
 * Search sort options for different types
 */
const RepoSortOptions = z.enum(['stars', 'forks', 'help-wanted-issues', 'updated']);
const IssueSortOptions = z.enum(['comments', 'reactions', 'reactions-+1', 'reactions--1', 'reactions-smile', 'reactions-thinking_face', 'reactions-heart', 'reactions-tada', 'interactions', 'created', 'updated']);
const UserSortOptions = z.enum(['followers', 'repositories', 'joined']);
const CodeSortOptions = z.enum(['indexed']);
const CommitSortOptions = z.enum(['author-date', 'committer-date']);

/**
 * GitHub search schema with discriminated unions
 */
const GitHubSearchSchema = z.object({
  token: z.string().optional().describe('GitHub token (optional if set via environment)'),
  operation: SearchOperations.describe('The GitHub search operation to perform'),
  
  // Core search parameters
  q: z.string().describe('Search query (required for all search operations)'),
  
  // Sorting and pagination
  sort: z.union([RepoSortOptions, IssueSortOptions, UserSortOptions, CodeSortOptions, CommitSortOptions]).optional().describe('Sort field (varies by search type)'),
  order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
  per_page: z.number().min(1).max(100).optional().describe('Results per page (default: 30, max: 100)'),
  page: z.number().min(1).optional().describe('Page number (default: 1)'),
  
  // Repository-specific filters (for repo search)
  repo_size: z.string().optional().describe('Repository size filter (e.g., ">1000")'),
  language: z.string().optional().describe('Programming language filter'),
  
  // Issue/PR specific filters
  state: z.enum(['open', 'closed']).optional().describe('Issue/PR state filter'),
  labels: z.string().optional().describe('Labels filter (comma-separated)'),
  assignee: z.string().optional().describe('Assignee filter'),
  
  // Code search specific
  repo: z.string().optional().describe('Repository filter for code search (format: owner/repo)'),
  path: z.string().optional().describe('File path filter for code search'),
  extension: z.string().optional().describe('File extension filter for code search'),
  
  // User search specific
  location: z.string().optional().describe('Location filter for user search'),
  
  // Commit search specific
  author: z.string().optional().describe('Author filter for commit search'),
  committer: z.string().optional().describe('Committer filter for commit search'),
});

type GitHubSearchInput = z.infer<typeof GitHubSearchSchema>;

/**
 * Execute GitHub search operations
 */
async function executeGitHubSearch(
  input: GitHubSearchInput,
  getGitHubToken: GetGitHubTokenFn
): Promise<{ operation: SearchOperation; result: unknown }> {
  const token = getGitHubToken(input.token);
  const github = GitHubClient.getInstance();
  
  try {
    await github.connect(token);
    const client = github.getClient(token);
    
    const searchParams = {
      q: input.q,
      sort: input.sort as any,
      order: input.order,
      per_page: input.per_page,
      page: input.page,
    };
    
    switch (input.operation) {
      case 'repositories': {
        // Add repository-specific query modifiers
        let query = input.q;
        if (input.language) query += ` language:${input.language}`;
        if (input.repo_size) query += ` size:${input.repo_size}`;
        
        const result = await client.rest.search.repos({
          ...searchParams,
          q: query,
          sort: input.sort as 'stars' | 'forks' | 'help-wanted-issues' | 'updated',
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'issues': {
        // Add issue-specific query modifiers
        let query = input.q;
        if (input.state) query += ` state:${input.state}`;
        if (input.labels) query += ` label:"${input.labels}"`;
        if (input.assignee) query += ` assignee:${input.assignee}`;
        
        const result = await client.rest.search.issuesAndPullRequests({
          ...searchParams,
          q: `${query} type:issue`,
          sort: input.sort as any,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'pull_requests': {
        // Add PR-specific query modifiers
        let query = input.q;
        if (input.state) query += ` state:${input.state}`;
        if (input.labels) query += ` label:"${input.labels}"`;
        if (input.assignee) query += ` assignee:${input.assignee}`;
        
        const result = await client.rest.search.issuesAndPullRequests({
          ...searchParams,
          q: `${query} type:pr`,
          sort: input.sort as any,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'users': {
        // Add user-specific query modifiers
        let query = input.q;
        if (input.location) query += ` location:"${input.location}"`;
        
        const result = await client.rest.search.users({
          ...searchParams,
          q: query,
          sort: input.sort as 'followers' | 'repositories' | 'joined',
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'code': {
        // Add code-specific query modifiers
        let query = input.q;
        if (input.repo) query += ` repo:${input.repo}`;
        if (input.path) query += ` path:${input.path}`;
        if (input.extension) query += ` extension:${input.extension}`;
        if (input.language) query += ` language:${input.language}`;
        
        const result = await client.rest.search.code({
          ...searchParams,
          q: query,
          sort: input.sort as 'indexed',
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'commits': {
        // Add commit-specific query modifiers
        let query = input.q;
        if (input.author) query += ` author:${input.author}`;
        if (input.committer) query += ` committer:${input.committer}`;
        if (input.repo) query += ` repo:${input.repo}`;
        
        const result = await client.rest.search.commits({
          ...searchParams,
          q: query,
          sort: input.sort as 'author-date' | 'committer-date',
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'topics': {
        const result = await client.rest.search.topics({
          ...searchParams,
          q: input.q,
        });
        return { operation: input.operation, result: result.data };
      }
      
      default:
        throw new McpError(ErrorCode.InvalidParams, `Unsupported search operation: ${input.operation}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `GitHub search operation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    await github.disconnect();
  }
}

/**
 * GitHub search tool
 */
export const gitHubSearchTool: GitHubTool = {
  name: 'gh_search',
  description: 'Advanced GitHub search - repositories, issues, PRs, users, code, commits, and topics',
  inputSchema: GitHubSearchSchema,
  async execute(params: unknown, getGitHubToken: GetGitHubTokenFn): Promise<ToolOutput> {
    const validationResult = GitHubSearchSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        content: [{ type: 'text', text: `Invalid input: ${validationResult.error.format()}` }],
        isError: true,
      };
    }
    
    try {
      const result = await executeGitHubSearch(validationResult.data, getGitHubToken);
      
      // Format the search results with summary
      const summary = `GitHub ${result.operation} search completed`;
      const data = result.result as any;
      const totalCount = data.total_count || 0;
      const items = data.items || [];
      
      return {
        content: [
          { type: 'text', text: `${summary} - Found ${totalCount} results, showing ${items.length} items` },
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