import { describe, it, expect } from 'vitest';
import { manageBranchesTool } from './branches.js';

describe('manageBranchesTool', () => {
  it('should have correct name and description', () => {
    expect(manageBranchesTool.name).toBe('gh_manage_branches');
    expect(manageBranchesTool.description).toContain('branch management');
  });

  it('should validate required parameters for create operation', () => {
    const result = manageBranchesTool.inputSchema.safeParse({
      operation: 'create',
      owner: 'test-owner',
      repo: 'test-repo',
      branch: 'feature-branch',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid operations', () => {
    const result = manageBranchesTool.inputSchema.safeParse({
      operation: 'invalid',
      owner: 'test-owner',
      repo: 'test-repo',
    });
    expect(result.success).toBe(false);
  });

  it('should require branch name for specific operations', () => {
    const result = manageBranchesTool.inputSchema.safeParse({
      operation: 'get',
      owner: 'test-owner',
      repo: 'test-repo',
      // missing branch name
    });
    expect(result.success).toBe(false);
  });

  it('should validate protection schema', () => {
    const result = manageBranchesTool.inputSchema.safeParse({
      operation: 'protect',
      owner: 'test-owner',
      repo: 'test-repo',
      branch: 'main',
      protection: {
        required_status_checks: {
          strict: true,
          contexts: ['ci/build'],
        },
        enforce_admins: true,
      },
    });
    expect(result.success).toBe(true);
  });
}); 