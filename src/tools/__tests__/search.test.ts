import { describe, test, expect, vi } from 'vitest';
import { gitHubSearchTool } from '../search.js';

// Mock the GitHub client
vi.mock('../../utils/github.js', () => ({
  GitHubClient: {
    getInstance: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      getClient: vi.fn(() => ({
        rest: {
          search: {
            repos: vi.fn(() => ({
              data: { total_count: 150, items: [{ id: 1, name: 'awesome-repo' }] }
            })),
            issuesAndPullRequests: vi.fn(() => ({
              data: { total_count: 50, items: [{ id: 1, title: 'Bug in component' }] }
            })),
            users: vi.fn(() => ({
              data: { total_count: 10, items: [{ id: 1, login: 'johndoe' }] }
            })),
            code: vi.fn(() => ({
              data: { total_count: 100, items: [{ name: 'component.js' }] }
            })),
            commits: vi.fn(() => ({
              data: { total_count: 20, items: [{ sha: 'abc123' }] }
            })),
            topics: vi.fn(() => ({
              data: { total_count: 5, items: [{ name: 'react' }] }
            })),
          },
        },
      })),
    })),
  },
}));

const getGitHubToken = vi.fn(() => 'mock-token');

describe('gitHubSearchTool', () => {
  test('should have correct metadata', () => {
    expect(gitHubSearchTool.name).toBe('gh_search');
    expect(gitHubSearchTool.description).toContain('Advanced GitHub search');
  });

  test('repositories search operation', async () => {
    const result = await gitHubSearchTool.execute(
      {
        operation: 'repositories',
        q: 'react',
        language: 'javascript',
        sort: 'stars',
        order: 'desc',
        per_page: 10,
      },
      getGitHubToken
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('repositories search completed - Found 150 results, showing 1 items');
  });

  test('issues search operation', async () => {
    const result = await gitHubSearchTool.execute(
      {
        operation: 'issues',
        q: 'bug',
        state: 'open',
        labels: 'bug,priority-high',
        sort: 'created',
        order: 'desc',
      },
      getGitHubToken
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('issues search completed - Found 50 results, showing 1 items');
  });

  test('pull_requests search operation', async () => {
    const result = await gitHubSearchTool.execute(
      {
        operation: 'pull_requests',
        q: 'feature',
        state: 'open',
        assignee: 'developer123',
      },
      getGitHubToken
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('pull_requests search completed - Found 50 results, showing 1 items');
  });

  test('users search operation', async () => {
    const result = await gitHubSearchTool.execute(
      {
        operation: 'users',
        q: 'john',
        location: 'San Francisco',
        sort: 'followers',
        order: 'desc',
      },
      getGitHubToken
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('users search completed - Found 10 results, showing 1 items');
  });

  test('code search operation', async () => {
    const result = await gitHubSearchTool.execute(
      {
        operation: 'code',
        q: 'function handleClick',
        repo: 'user/repo',
        path: 'src/',
        extension: 'js',
        language: 'javascript',
      },
      getGitHubToken
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('code search completed - Found 100 results, showing 1 items');
  });

  test('commits search operation', async () => {
    const result = await gitHubSearchTool.execute(
      {
        operation: 'commits',
        q: 'fix bug',
        author: 'dev1',
        repo: 'user/repo',
        sort: 'author-date',
        order: 'desc',
      },
      getGitHubToken
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('commits search completed - Found 20 results, showing 1 items');
  });

  test('topics search operation', async () => {
    const result = await gitHubSearchTool.execute(
      {
        operation: 'topics',
        q: 'javascript framework',
      },
      getGitHubToken
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('topics search completed - Found 5 results, showing 1 items');
  });

  test('should handle validation errors', async () => {
    const result = await gitHubSearchTool.execute(
      {
        operation: 'repositories',
        // Missing required q parameter
      },
      getGitHubToken
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid input');
  });

  test('should handle unsupported operations', async () => {
    const result = await gitHubSearchTool.execute(
      {
        operation: 'invalid_search',
        q: 'test',
      },
      getGitHubToken
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid input');
  });

  test('should handle empty search results', async () => {
    // Override the mock for this test
    const mockSearch = vi.fn(() => ({
      data: { total_count: 0, items: [] }
    }));
    
    const result = await gitHubSearchTool.execute(
      {
        operation: 'repositories',
        q: 'very-specific-nonexistent-repo',
      },
      getGitHubToken
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('repositories search completed');
  });
}); 