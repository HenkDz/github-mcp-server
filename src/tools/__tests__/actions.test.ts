import { describe, test, expect, vi } from 'vitest';
import { manageActionsTool } from '../actions.js';

// Mock the GitHub client
vi.mock('../../utils/github.js', () => ({
  GitHubClient: {
    getInstance: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      getClient: vi.fn(() => ({
        rest: {
          actions: {
            listRepoWorkflows: vi.fn(() => ({
              data: { total_count: 2, workflows: [{ id: 1, name: 'CI' }] }
            })),
            getWorkflow: vi.fn(() => ({
              data: { id: 1, name: 'CI', state: 'active' }
            })),
            createWorkflowDispatch: vi.fn(() => ({ status: 204 })),
            listWorkflowRuns: vi.fn(() => ({
              data: { total_count: 5, workflow_runs: [{ id: 123, status: 'completed' }] }
            })),
            getWorkflowRun: vi.fn(() => ({
              data: { id: 123, status: 'completed', conclusion: 'success' }
            })),
            cancelWorkflowRun: vi.fn(() => ({ status: 202 })),
            reRunWorkflow: vi.fn(() => ({ status: 201 })),
            listArtifactsForRepo: vi.fn(() => ({
              data: { total_count: 3, artifacts: [{ id: 1, name: 'build-artifacts' }] }
            })),
            getArtifact: vi.fn(() => ({
              data: { id: 1, name: 'build-artifacts', size_in_bytes: 1024 }
            })),
            downloadArtifact: vi.fn(() => ({
              url: 'https://api.github.com/download/artifact/123',
              status: 200
            })),
            listRepoSecrets: vi.fn(() => ({
              data: { total_count: 2, secrets: [{ name: 'SECRET_1' }] }
            })),
          },
        },
      })),
    })),
  },
}));

const getGitHubToken = vi.fn(() => 'mock-token');

describe('manageActionsTool', () => {
  test('should have correct metadata', () => {
    expect(manageActionsTool.name).toBe('gh_manage_actions');
    expect(manageActionsTool.description).toContain('GitHub Actions management');
  });

  test('list_workflows operation', async () => {
    const result = await manageActionsTool.execute(
      {
        operation: 'list_workflows',
        owner: 'testowner',
        repo: 'testrepo',
      },
      getGitHubToken
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('list_workflows operation completed successfully');
  });

  test('get_workflow operation', async () => {
    const result = await manageActionsTool.execute(
      {
        operation: 'get_workflow',
        owner: 'testowner',
        repo: 'testrepo',
        workflow_id: 'ci.yml',
      },
      getGitHubToken
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('get_workflow operation completed successfully');
  });

  test('trigger_workflow operation', async () => {
    const result = await manageActionsTool.execute(
      {
        operation: 'trigger_workflow',
        owner: 'testowner',
        repo: 'testrepo',
        workflow_id: 'ci.yml',
        ref: 'main',
        inputs: { debug: 'true' },
      },
      getGitHubToken
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('trigger_workflow operation completed successfully');
  });

  test('list_runs operation', async () => {
    const result = await manageActionsTool.execute(
      {
        operation: 'list_runs',
        owner: 'testowner',
        repo: 'testrepo',
        status: 'completed',
        per_page: 10,
      },
      getGitHubToken
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('list_runs operation completed successfully');
  });

  test('cancel_run operation', async () => {
    const result = await manageActionsTool.execute(
      {
        operation: 'cancel_run',
        owner: 'testowner',
        repo: 'testrepo',
        run_id: 123,
      },
      getGitHubToken
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('cancel_run operation completed successfully');
  });

  test('list_artifacts operation', async () => {
    const result = await manageActionsTool.execute(
      {
        operation: 'list_artifacts',
        owner: 'testowner',
        repo: 'testrepo',
      },
      getGitHubToken
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('list_artifacts operation completed successfully');
  });

  test('should handle validation errors', async () => {
    const result = await manageActionsTool.execute(
      {
        operation: 'get_workflow',
        // Missing required owner, repo, workflow_id
      },
      getGitHubToken
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid input');
  });

  test('should handle unsupported operations', async () => {
    const result = await manageActionsTool.execute(
      {
        operation: 'invalid_operation',
        owner: 'testowner',
        repo: 'testrepo',
      },
      getGitHubToken
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid input');
  });
}); 