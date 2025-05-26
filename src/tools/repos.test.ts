import { describe, it, expect, vi } from 'vitest';
import { manageReposTool } from './repos.js';

// Mock the GitHub client
vi.mock('../utils/github.js', () => ({
  GitHubClient: {
    getInstance: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      getClient: vi.fn(() => ({
        rest: {
          repos: {
            createForAuthenticatedUser: vi.fn(() => ({
              data: { id: 123, name: 'test-repo', full_name: 'user/test-repo' }
            })),
            get: vi.fn(() => ({
              data: { id: 123, name: 'test-repo', full_name: 'user/test-repo' }
            })),
            listForAuthenticatedUser: vi.fn(() => ({
              data: [{ id: 123, name: 'test-repo', full_name: 'user/test-repo' }]
            })),
          },
        },
      })),
    })),
  },
}));

describe('manageReposTool', () => {
  const mockGetToken = vi.fn(() => 'mock-token');

  it('should have correct tool metadata', () => {
    expect(manageReposTool.name).toBe('gh_manage_repos');
    expect(manageReposTool.description).toContain('repository management');
    expect(manageReposTool.inputSchema).toBeDefined();
  });

  it('should validate create operation schema correctly', async () => {
    const validCreateParams = {
      operation: 'create',
      name: 'test-repo',
      description: 'A test repository',
      private: false,
    };

    const result = await manageReposTool.execute(validCreateParams, mockGetToken);
    
    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(2);
    expect(result.content[0].text).toContain('create operation completed successfully');
  });

  it('should validate get operation schema correctly', async () => {
    const validGetParams = {
      operation: 'get',
      owner: 'octocat',
      repo: 'Hello-World',
    };

    const result = await manageReposTool.execute(validGetParams, mockGetToken);
    
    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(2);
    expect(result.content[0].text).toContain('get operation completed successfully');
  });

  it('should validate list operation schema correctly', async () => {
    const validListParams = {
      operation: 'list',
      type: 'owner',
      sort: 'updated',
      direction: 'desc',
    };

    const result = await manageReposTool.execute(validListParams, mockGetToken);
    
    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(2);
    expect(result.content[0].text).toContain('list operation completed successfully');
  });

  it('should reject invalid operation', async () => {
    const invalidParams = {
      operation: 'invalid-operation',
    };

    const result = await manageReposTool.execute(invalidParams, mockGetToken);
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid input');
  });

  it('should reject create operation without name', async () => {
    const invalidCreateParams = {
      operation: 'create',
      description: 'A test repository',
    };

    const result = await manageReposTool.execute(invalidCreateParams, mockGetToken);
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid input');
  });

  it('should reject get operation without owner/repo', async () => {
    const invalidGetParams = {
      operation: 'get',
      owner: 'octocat',
      // missing repo
    };

    const result = await manageReposTool.execute(invalidGetParams, mockGetToken);
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid input');
  });

  it('should reject transfer operation without new_owner', async () => {
    const invalidTransferParams = {
      operation: 'transfer',
      owner: 'octocat',
      repo: 'Hello-World',
      // missing new_owner
    };

    const result = await manageReposTool.execute(invalidTransferParams, mockGetToken);
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid input');
  });
}); 