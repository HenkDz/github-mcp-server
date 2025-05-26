import { describe, it, expect } from 'vitest';
import { manageReleasesTool } from './releases.js';

describe('manageReleasesTool', () => {
  it('should have correct name and description', () => {
    expect(manageReleasesTool.name).toBe('gh_manage_releases');
    expect(manageReleasesTool.description).toContain('release management');
  });

  it('should validate required parameters for create operation', () => {
    const result = manageReleasesTool.inputSchema.safeParse({
      operation: 'create',
      owner: 'test-owner',
      repo: 'test-repo',
      tag_name: 'v1.0.0',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid operations', () => {
    const result = manageReleasesTool.inputSchema.safeParse({
      operation: 'invalid',
      owner: 'test-owner',
      repo: 'test-repo',
    });
    expect(result.success).toBe(false);
  });

  it('should require tag_name for create operation', () => {
    const result = manageReleasesTool.inputSchema.safeParse({
      operation: 'create',
      owner: 'test-owner',
      repo: 'test-repo',
      // missing tag_name
    });
    expect(result.success).toBe(false);
  });

  it('should require release_id for update operation', () => {
    const result = manageReleasesTool.inputSchema.safeParse({
      operation: 'update',
      owner: 'test-owner',
      repo: 'test-repo',
      // missing release_id
    });
    expect(result.success).toBe(false);
  });

  it('should validate create with optional parameters', () => {
    const result = manageReleasesTool.inputSchema.safeParse({
      operation: 'create',
      owner: 'test-owner',
      repo: 'test-repo',
      tag_name: 'v1.0.0',
      name: 'Version 1.0.0',
      body: 'Initial release',
      draft: true,
      prerelease: false,
      generate_release_notes: true,
    });
    expect(result.success).toBe(true);
  });

  it('should allow get operation with either release_id or tag_name', () => {
    const resultWithId = manageReleasesTool.inputSchema.safeParse({
      operation: 'get',
      owner: 'test-owner',
      repo: 'test-repo',
      release_id: 123,
    });
    expect(resultWithId.success).toBe(true);

    const resultWithTag = manageReleasesTool.inputSchema.safeParse({
      operation: 'get',
      owner: 'test-owner',
      repo: 'test-repo',
      tag_name: 'v1.0.0',
    });
    expect(resultWithTag.success).toBe(true);
  });
}); 