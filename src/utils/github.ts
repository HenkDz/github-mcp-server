import { Octokit } from '@octokit/rest';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { GitHubError } from '../types/tool.js';

/**
 * GitHub API client wrapper following postgres-mcp connection pattern
 */
export class GitHubClient {
  private static instance: GitHubClient;
  private clients: Map<string, Octokit> = new Map();
  private defaultClient?: Octokit;

  /**
   * Get singleton instance
   */
  static getInstance(): GitHubClient {
    if (!GitHubClient.instance) {
      GitHubClient.instance = new GitHubClient();
    }
    return GitHubClient.instance;
  }

  /**
   * Connect with GitHub token
   */
  async connect(token: string): Promise<void> {
    try {
      const octokit = new Octokit({
        auth: token,
        request: {
          timeout: 30000, // 30 second timeout
        },
      });

      // Test the connection by getting the authenticated user
      await octokit.rest.users.getAuthenticated();
      
      this.clients.set(token, octokit);
      this.defaultClient = octokit;
    } catch (error) {
      throw this.handleGitHubError(error, 'Failed to connect to GitHub API');
    }
  }

  /**
   * Get Octokit client for a specific token
   */
  getClient(token?: string): Octokit {
    if (token && this.clients.has(token)) {
      const client = this.clients.get(token);
      if (client) {
        return client;
      }
    }
    
    if (this.defaultClient) {
      return this.defaultClient;
    }
    
    throw new McpError(
      ErrorCode.InvalidParams,
      'No GitHub client available. Please connect first.'
    );
  }

  /**
   * Disconnect and cleanup clients
   */
  async disconnect(): Promise<void> {
    this.clients.clear();
    this.defaultClient = undefined;
  }

  /**
   * Handle GitHub API errors consistently
   */
  private handleGitHubError(error: unknown, context: string): McpError {
    if (error && typeof error === 'object' && 'status' in error) {
      const ghError = error as GitHubError;
      
      switch (ghError.status) {
        case 401:
          return new McpError(
            ErrorCode.InvalidParams,
            `${context}: Invalid or expired GitHub token. Please check your authentication.`
          );
        case 403:
          return new McpError(
            ErrorCode.InvalidParams,
            `${context}: Access forbidden. Check your token permissions or rate limits.`
          );
        case 404:
          return new McpError(
            ErrorCode.InvalidParams,
            `${context}: Resource not found. Check repository/organization names.`
          );
        case 422:
          return new McpError(
            ErrorCode.InvalidParams,
            `${context}: Invalid request parameters. ${ghError.message || ''}`
          );
        default:
          return new McpError(
            ErrorCode.InternalError,
            `${context}: GitHub API error (${ghError.status}): ${ghError.message || 'Unknown error'}`
          );
      }
    }
    
    if (error instanceof Error) {
      return new McpError(ErrorCode.InternalError, `${context}: ${error.message}`);
    }
    
    return new McpError(ErrorCode.InternalError, `${context}: Unknown error occurred`);
  }

  /**
   * Execute GitHub API operation with error handling
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.handleGitHubError(error, context);
    }
  }

  /**
   * Check if token has required scopes
   */
  async checkTokenScopes(requiredScopes: string[], token?: string): Promise<boolean> {
    try {
      const client = this.getClient(token);
      const response = await client.request('GET /user');
      
      // GitHub returns scopes in the X-OAuth-Scopes header
      const scopes = response.headers['x-oauth-scopes']?.split(', ') || [];
      
      return requiredScopes.every(scope => scopes.includes(scope));
    } catch {
      return false;
    }
  }

  /**
   * Get rate limit information
   */
  async getRateLimit(token?: string): Promise<{
    limit: number;
    remaining: number;
    reset: Date;
    used: number;
  }> {
    const client = this.getClient(token);
    const response = await client.rest.rateLimit.get();
    
    return {
      limit: response.data.rate.limit,
      remaining: response.data.rate.remaining,
      reset: new Date(response.data.rate.reset * 1000),
      used: response.data.rate.used,
    };
  }
} 