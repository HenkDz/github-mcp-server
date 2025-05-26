import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { GitHubTool, GetGitHubTokenFn, ToolOutput } from '../types/tool.js';
import { GitHubClient } from '../utils/github.js';

/**
 * Actions operations enum
 */
const ActionsOperations = z.enum([
  'list_workflows',
  'get_workflow',
  'trigger_workflow',
  'list_runs',
  'get_run',
  'cancel_run',
  'rerun_workflow',
  'list_artifacts',
  'get_artifact',
  'download_artifact',
  'list_secrets',
]);

type ActionsOperation = z.infer<typeof ActionsOperations>;

/**
 * Workflow inputs schema for triggering workflows
 */
const WorkflowInputsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));

/**
 * Actions management schema with discriminated unions
 */
const ManageActionsSchema = z.object({
  token: z.string().optional().describe('GitHub token (optional if set via environment)'),
  operation: ActionsOperations.describe('The GitHub Actions operation to perform'),
  
  // Repository identification (required for most operations)
  owner: z.string().optional().describe('Repository owner (required for repo-specific operations)'),
  repo: z.string().optional().describe('Repository name (required for repo-specific operations)'),
  
  // Workflow identification
  workflow_id: z.union([z.string(), z.number()]).optional().describe('Workflow ID or filename (required for workflow-specific operations)'),
  
  // Run identification
  run_id: z.number().optional().describe('Workflow run ID (required for run-specific operations)'),
  
  // Artifact identification
  artifact_id: z.number().optional().describe('Artifact ID (required for artifact-specific operations)'),
  
  // Trigger workflow parameters
  ref: z.string().optional().describe('Git reference (branch/tag) for workflow trigger (defaults to default branch)'),
  inputs: WorkflowInputsSchema.optional().describe('Workflow inputs for manual triggers'),
  
  // List operation parameters
  status: z.enum(['completed', 'action_required', 'cancelled', 'failure', 'neutral', 'skipped', 'stale', 'success', 'timed_out', 'in_progress', 'queued', 'requested', 'waiting']).optional().describe('Filter runs by status'),
  actor: z.string().optional().describe('Filter runs by actor (username)'),
  branch: z.string().optional().describe('Filter runs by branch name'),
  event: z.string().optional().describe('Filter runs by trigger event'),
  created: z.string().optional().describe('Filter runs by creation date (ISO 8601)'),
  per_page: z.number().min(1).max(100).optional().describe('Results per page (for list operations)'),
  page: z.number().min(1).optional().describe('Page number (for list operations)'),
}).refine((data) => {
  // Validation based on operation
  switch (data.operation) {
    case 'list_workflows':
    case 'list_runs':
    case 'list_artifacts':
    case 'list_secrets':
      return !!data.owner && !!data.repo;
    case 'get_workflow':
    case 'trigger_workflow':
      return !!data.owner && !!data.repo && !!data.workflow_id;
    case 'get_run':
    case 'cancel_run':
    case 'rerun_workflow':
      return !!data.owner && !!data.repo && !!data.run_id;
    case 'get_artifact':
    case 'download_artifact':
      return !!data.owner && !!data.repo && !!data.artifact_id;
    default:
      return false;
  }
}, {
  message: 'Missing required parameters for the specified operation',
});

type ManageActionsInput = z.infer<typeof ManageActionsSchema>;

/**
 * Execute GitHub Actions operations
 */
async function executeManageActions(
  input: ManageActionsInput,
  getGitHubToken: GetGitHubTokenFn
): Promise<{ operation: ActionsOperation; result: unknown }> {
  const token = getGitHubToken(input.token);
  const github = GitHubClient.getInstance();
  
  try {
    await github.connect(token);
    const client = github.getClient(token);
    
    switch (input.operation) {
      case 'list_workflows': {
        const result = await client.rest.actions.listRepoWorkflows({
          owner: input.owner!,
          repo: input.repo!,
          per_page: input.per_page,
          page: input.page,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'get_workflow': {
        const result = await client.rest.actions.getWorkflow({
          owner: input.owner!,
          repo: input.repo!,
          workflow_id: input.workflow_id!,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'trigger_workflow': {
        const result = await client.rest.actions.createWorkflowDispatch({
          owner: input.owner!,
          repo: input.repo!,
          workflow_id: input.workflow_id!,
          ref: input.ref || 'main',
          inputs: input.inputs || {},
        });
        return { operation: input.operation, result: { message: 'Workflow triggered successfully', status: result.status } };
      }
      
      case 'list_runs': {
        const params: any = {
          owner: input.owner!,
          repo: input.repo!,
          actor: input.actor,
          branch: input.branch,
          event: input.event,
          status: input.status,
          created: input.created,
          per_page: input.per_page,
          page: input.page,
        };
        
        if (input.workflow_id) {
          params.workflow_id = input.workflow_id;
        }
        
        const result = await client.rest.actions.listWorkflowRuns(params);
        return { operation: input.operation, result: result.data };
      }
      
      case 'get_run': {
        const result = await client.rest.actions.getWorkflowRun({
          owner: input.owner!,
          repo: input.repo!,
          run_id: input.run_id!,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'cancel_run': {
        const result = await client.rest.actions.cancelWorkflowRun({
          owner: input.owner!,
          repo: input.repo!,
          run_id: input.run_id!,
        });
        return { operation: input.operation, result: { message: 'Workflow run cancelled successfully', status: result.status } };
      }
      
      case 'rerun_workflow': {
        const result = await client.rest.actions.reRunWorkflow({
          owner: input.owner!,
          repo: input.repo!,
          run_id: input.run_id!,
        });
        return { operation: input.operation, result: { message: 'Workflow rerun triggered successfully', status: result.status } };
      }
      
      case 'list_artifacts': {
        const result = await client.rest.actions.listArtifactsForRepo({
          owner: input.owner!,
          repo: input.repo!,
          per_page: input.per_page,
          page: input.page,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'get_artifact': {
        const result = await client.rest.actions.getArtifact({
          owner: input.owner!,
          repo: input.repo!,
          artifact_id: input.artifact_id!,
        });
        return { operation: input.operation, result: result.data };
      }
      
      case 'download_artifact': {
        const result = await client.rest.actions.downloadArtifact({
          owner: input.owner!,
          repo: input.repo!,
          artifact_id: input.artifact_id!,
          archive_format: 'zip',
        });
        return { operation: input.operation, result: { 
          message: 'Artifact download URL generated',
          download_url: result.url,
          status: result.status 
        }};
      }
      
      case 'list_secrets': {
        const result = await client.rest.actions.listRepoSecrets({
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
      `GitHub Actions operation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    await github.disconnect();
  }
}

/**
 * GitHub Actions management tool
 */
export const manageActionsTool: GitHubTool = {
  name: 'gh_manage_actions',
  description: 'Comprehensive GitHub Actions management - workflows, runs, artifacts, and automation',
  inputSchema: ManageActionsSchema,
  async execute(params: unknown, getGitHubToken: GetGitHubTokenFn): Promise<ToolOutput> {
    const validationResult = ManageActionsSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        content: [{ type: 'text', text: `Invalid input: ${validationResult.error.format()}` }],
        isError: true,
      };
    }
    
    try {
      const result = await executeManageActions(validationResult.data, getGitHubToken);
      return {
        content: [
          { type: 'text', text: `GitHub Actions ${result.operation} operation completed successfully` },
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