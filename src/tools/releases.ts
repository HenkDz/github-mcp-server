import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { GitHubTool, GetGitHubTokenFn, ToolOutput } from '../types/tool.js';
import { GitHubClient } from '../utils/github.js';

/**
 * Release operations enum
 */
const ReleaseOperations = z.enum([
  'create',
  'update',
  'delete',
  'publish',
  'get',
  'get_latest',
  'list',
]);

type ReleaseOperation = z.infer<typeof ReleaseOperations>;

/**
 * Release management schema with discriminated unions
 */
const ManageReleasesSchema = z.object({
  token: z.string().optional().describe('GitHub token (optional if set via environment)'),
  operation: ReleaseOperations.describe('The release operation to perform'),
  
  // Repository identification (required for all operations)
  owner: z.string().optional().describe('Repository owner (required for all operations)'),
  repo: z.string().optional().describe('Repository name (required for all operations)'),
  
  // Release identification (required for specific release operations)
  release_id: z.number().optional().describe('Release ID (required for update, delete, publish operations)'),
  tag_name: z.string().optional().describe('Tag name (required for create, can be used for get instead of release_id)'),
  
  // Create operation parameters
  name: z.string().optional().describe('Release name/title (for create/update)'),
  body: z.string().optional().describe('Release description/notes (for create/update)'),
  draft: z.boolean().optional().describe('Create as draft release (for create, default: false)'),
  prerelease: z.boolean().optional().describe('Mark as prerelease (for create/update, default: false)'),
  generate_release_notes: z.boolean().optional().describe('Auto-generate release notes (for create, default: false)'),
  target_commitish: z.string().optional().describe('Branch or commit for release (for create, defaults to default branch)'),
  discussion_category_name: z.string().optional().describe('Discussion category for release (for create/update)'),
  make_latest: z.enum(['true', 'false', 'legacy']).optional().describe('Mark as latest release (for create/update)'),
  
  // List operation parameters
  per_page: z.number().min(1).max(100).optional().describe('Results per page (for list)'),
  page: z.number().min(1).optional().describe('Page number (for list)'),
}).refine((data) => {
  // Validation based on operation
  switch (data.operation) {
    case 'create':
      return !!data.owner && !!data.repo && !!data.tag_name;
    case 'get':
      return !!data.owner && !!data.repo && (!!data.release_id || !!data.tag_name);
    case 'update':
    case 'delete':
    case 'publish':
      return !!data.owner && !!data.repo && !!data.release_id;
    case 'get_latest':
    case 'list':
      return !!data.owner && !!data.repo;
    default:
      return false;
  }
}, {
  message: 'Missing required parameters for the specified operation',
});

type ManageReleasesInput = z.infer<typeof ManageReleasesSchema>;

/**
 * Execute release operations
 */
async function executeManageReleases(
  input: ManageReleasesInput,
  getGitHubToken: GetGitHubTokenFn
): Promise<{ operation: ReleaseOperation; result: unknown }> {
  const token = getGitHubToken(input.token);
  const github = GitHubClient.getInstance();
  
  try {
    await github.connect(token);
    const client = github.getClient(token);
    
    switch (input.operation) {
      case 'create': {
        const result = await client.rest.repos.createRelease({
          owner: input.owner!,
          repo: input.repo!,
          tag_name: input.tag_name!,
          name: input.name,
          body: input.body,
          draft: input.draft || false,
          prerelease: input.prerelease || false,
          generate_release_notes: input.generate_release_notes || false,
          target_commitish: input.target_commitish,
          discussion_category_name: input.discussion_category_name,
          make_latest: input.make_latest,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'get': {
        let result: Awaited<ReturnType<typeof client.rest.repos.getRelease>> | Awaited<ReturnType<typeof client.rest.repos.getReleaseByTag>>;
        if (input.release_id) {
          result = await client.rest.repos.getRelease({
            owner: input.owner!,
            repo: input.repo!,
            release_id: input.release_id,
          });
        } else {
          result = await client.rest.repos.getReleaseByTag({
            owner: input.owner!,
            repo: input.repo!,
            tag: input.tag_name!,
          });
        }
        return { operation: input.operation, result: result.data };
      }
      
      case 'update': {
        const updateData: Record<string, unknown> = {};
        if (input.tag_name !== undefined) updateData.tag_name = input.tag_name;
        if (input.name !== undefined) updateData.name = input.name;
        if (input.body !== undefined) updateData.body = input.body;
        if (input.draft !== undefined) updateData.draft = input.draft;
        if (input.prerelease !== undefined) updateData.prerelease = input.prerelease;
        if (input.discussion_category_name !== undefined) updateData.discussion_category_name = input.discussion_category_name;
        if (input.make_latest !== undefined) updateData.make_latest = input.make_latest;
        
        const result = await client.rest.repos.updateRelease({
          owner: input.owner!,
          repo: input.repo!,
          release_id: input.release_id!,
          ...updateData,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'delete': {
        await client.rest.repos.deleteRelease({
          owner: input.owner!,
          repo: input.repo!,
          release_id: input.release_id!,
        });
        return { operation: input.operation, result: { message: 'Release deleted successfully' } };
      }
      
      case 'publish': {
        const result = await client.rest.repos.updateRelease({
          owner: input.owner!,
          repo: input.repo!,
          release_id: input.release_id!,
          draft: false,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'get_latest': {
        const result = await client.rest.repos.getLatestRelease({
          owner: input.owner!,
          repo: input.repo!,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'list': {
        const result = await client.rest.repos.listReleases({
          owner: input.owner!,
          repo: input.repo!,
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
      `Release operation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    await github.disconnect();
  }
}

/**
 * Release management tool
 */
export const manageReleasesTool: GitHubTool = {
  name: 'gh_manage_releases',
  description: 'Comprehensive GitHub release management - create, update, delete, publish, and get release information',
  inputSchema: ManageReleasesSchema,
  async execute(params: unknown, getGitHubToken: GetGitHubTokenFn): Promise<ToolOutput> {
    const validationResult = ManageReleasesSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        content: [{ type: 'text', text: `Invalid input: ${validationResult.error.format()}` }],
        isError: true,
      };
    }
    
    try {
      const result = await executeManageReleases(validationResult.data, getGitHubToken);
      return {
        content: [
          { type: 'text', text: `Release ${result.operation} operation completed successfully` },
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