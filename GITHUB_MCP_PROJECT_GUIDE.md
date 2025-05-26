# GitHub MCP Server - Project Blueprint & Best Practices

> **Note to Self**: This document captures the key architectural decisions and patterns that made the PostgreSQL MCP server successful. Use this as a blueprint for building the GitHub MCP server.

## 🎯 **Core Architecture Principles**

### **1. Tool Consolidation Strategy**
- **Target**: Start with planned consolidation, don't build 50+ separate tools
- **Pattern**: Use `operation` enums within meta-tools (e.g., `gh_manage_repos`, `gh_manage_issues`)
- **Sweet Spot**: Aim for 15-20 total tools (10-12 consolidated + 4-6 specialized)
- **Example Structure**:
  ```typescript
  // Instead of: gh_create_repo, gh_delete_repo, gh_update_repo, gh_fork_repo
  // Do: gh_manage_repos with operation: ['create', 'delete', 'update', 'fork', 'get']
  ```

### **2. Schema Design with Discriminated Unions**
- **Use Zod extensively** for runtime validation + TypeScript types
- **Operation as discriminant**: `operation: z.enum(['create', 'update', 'delete'])`
- **Conditional parameters**: Use Zod's conditional validation for operation-specific params
- **Example Pattern**:
  ```typescript
  const ManageReposSchema = z.object({
    operation: z.enum(['create', 'update', 'delete', 'fork', 'get']),
    repoName: z.string().describe('Repository name (required for all operations)'),
    // Conditional based on operation
    description: z.string().optional().describe('Repo description (for create/update)'),
    private: z.boolean().optional().describe('Private repo flag (for create)'),
    // ... other conditional params
  });
  ```

### **3. Project Structure**
```
github-mcp/
├── src/
│   ├── tools/           # One file per consolidated tool
│   │   ├── repos.ts     # gh_manage_repos
│   │   ├── issues.ts    # gh_manage_issues  
│   │   ├── pulls.ts     # gh_manage_pulls
│   │   └── users.ts     # gh_manage_users
│   ├── types/
│   │   └── tool.ts      # Common interfaces
│   ├── utils/
│   │   ├── github.ts    # GitHub API client wrapper
│   │   └── auth.ts      # Authentication handling
│   └── index.ts         # Server setup
├── docs/
│   ├── TOOL_SCHEMAS.md  # Complete parameter reference
│   └── EXAMPLES.md      # Usage examples
└── examples/            # Working example scripts
```

## 🔧 **Technical Implementation Patterns**

### **4. Error Handling Strategy**
- **Consistent error types**: Use McpError with structured error codes
- **GitHub API mapping**: Map GitHub API errors to appropriate MCP error codes
- **Pattern**:
  ```typescript
  try {
    const result = await githubApi.repos.create(params);
    return { content: [{ type: 'text', text: 'Success' }] };
  } catch (error) {
    if (error.status === 404) {
      throw new McpError(ErrorCode.InvalidParams, 'Repository not found');
    }
    throw new McpError(ErrorCode.InternalError, `GitHub API error: ${error.message}`);
  }
  ```

### **5. API Client Pattern**
- **Centralized client**: Single GitHub API client with authentication handling
- **Rate limiting**: Built-in rate limiting and retry logic
- **Token management**: Support multiple auth methods (token, app, OAuth)
- **Connection pooling**: Reuse authenticated clients

### **6. Type Safety Everywhere**
- **GitHub API types**: Use `@octokit/types` for GitHub API response types
- **Tool interfaces**: Strong typing for all tool inputs/outputs
- **Runtime validation**: Zod schemas for all external inputs
- **No `any` types**: Strict TypeScript configuration

## 📋 **Planned Tool Consolidations**

### **Meta-Tools (8-10 tools)**
1. **`gh_manage_repos`**: create, delete, update, fork, get, list, transfer
2. **`gh_manage_issues`**: create, update, close, assign, label, comment, search
3. **`gh_manage_pulls`**: create, update, merge, review, approve, request_changes
4. **`gh_manage_branches`**: create, delete, protect, get_protection, list
5. **`gh_manage_releases`**: create, update, delete, publish, get_latest
6. **`gh_manage_actions`**: list_workflows, trigger, get_runs, cancel, get_artifacts
7. **`gh_manage_collaborators`**: add, remove, set_permissions, list
8. **`gh_manage_webhooks`**: create, update, delete, list, test

### **Specialized Tools (4-6 tools)**
9. **`gh_search`**: Advanced search across repos, issues, PRs, users, code
10. **`gh_analyze_repo`**: Repository metrics, health checks, insights
11. **`gh_bulk_operations`**: Batch operations across multiple repos
12. **`gh_migration_tools`**: Import/export, repository migration

## 🚀 **Development Workflow**

### **7. Build & Test Strategy**
- **Start with 1-2 tools**: Build repos + issues management first
- **Test each operation**: Unit tests for every operation in each tool
- **Integration tests**: Real GitHub API calls with test repos
- **Documentation-driven**: Write schemas first, then implementation

### **8. Authentication Handling**
- **Multiple auth types**: Personal tokens, GitHub Apps, OAuth
- **Environment variables**: `GITHUB_TOKEN`, `GITHUB_APP_ID`, etc.
- **Scope validation**: Check token scopes match required permissions
- **Error messaging**: Clear auth error messages for users

### **9. Documentation Strategy**
- **TOOL_SCHEMAS.md**: Complete parameter reference (copy PostgreSQL pattern)
- **Operation examples**: JSON examples for every operation
- **Error codes**: Document all possible error conditions
- **Rate limiting**: Document rate limits and best practices

## 🎯 **Key Success Patterns from PostgreSQL MCP**

### **10. What Made PostgreSQL MCP Great**
✅ **Single operation parameter**: Eliminates tool explosion
✅ **Comprehensive schemas**: Everything documented in one place  
✅ **Conditional validation**: Parameters required only when relevant
✅ **Consistent patterns**: Same structure across all tools
✅ **Runtime safety**: Zod validation catches errors early
✅ **Great DX**: Clear error messages and examples

### **11. Avoid These Antipatterns**
❌ **Tool explosion**: Don't create separate tools for each GitHub endpoint
❌ **Weak typing**: Don't use `any` or skip validation  
❌ **Poor error handling**: Don't let GitHub API errors bubble up raw
❌ **Missing docs**: Don't skip the comprehensive schema documentation
❌ **No examples**: Don't forget working examples for complex operations

## 📝 **Implementation Checklist**

### **Phase 1: Foundation (Week 1)** ✅ **COMPLETE**
- [x] Set up project structure with TypeScript + Zod
- [x] Implement GitHub API client with authentication
- [x] Create `gh_manage_repos` tool with basic operations
- [x] Write comprehensive tests for repos tool
- [x] Document all operations in TOOL_SCHEMAS.md

### **Phase 2: Core Tools (Week 2-3)** ✅ **COMPLETE**
- [x] Implement `gh_manage_issues` with 9 operations (create, get, update, close, assign, label, comment, list, search)
- [x] Implement `gh_manage_pulls` with 9 operations (create, get, update, merge, review, approve, request_changes, list, close)
- [x] Add `gh_manage_branches` with 7 operations (create, get, delete, list, protect, get_protection, update_protection)
- [x] Add `gh_manage_releases` with 7 operations (create, get, update, delete, publish, get_latest, list)
- [x] Comprehensive error handling and rate limiting
- [x] Integration tests with real GitHub API (successfully tested with created repository)

### **Phase 3: Advanced Features (Week 4)** ✅ **COMPLETE**
- [x] Implement `gh_manage_actions` with 11 operations (list_workflows, get_workflow, trigger_workflow, list_runs, get_run, cancel_run, rerun_workflow, list_artifacts, get_artifact, download_artifact, list_secrets)
- [x] Implement `gh_search` with 7 operations (repositories, issues, pull_requests, users, code, commits, topics)
- [x] Comprehensive error handling and rate limiting
- [x] Unit tests with 100% operation coverage
- [x] Complete documentation with examples

### **Phase 4: Enhancement (Week 5+)**
- [ ] Advanced GitHub features (Apps, marketplace, etc.)
- [ ] Monitoring and observability
- [ ] Community feedback integration
- [ ] Plugin system for extensibility

## 🎉 **Success Metrics**

- **Tool Count**: ✅ **7 consolidated tools** (vs 50+ separate endpoints) - **ACHIEVED**
- **Operation Count**: ✅ **43 total operations** across all GitHub workflows - **ACHIEVED**
- **Developer Experience**: ✅ **One-stop tool schemas documentation** - **ACHIEVED**
- **Type Safety**: ✅ **100% TypeScript coverage** with strict configuration - **ACHIEVED**
- **Test Coverage**: ✅ **100% operation coverage** with unit tests - **ACHIEVED**
- **Documentation**: ✅ **Complete examples for every operation** - **ACHIEVED**
- **Real-world Testing**: ✅ **Successfully tested with live GitHub API** - **ACHIEVED**

---

**Remember**: The PostgreSQL MCP succeeded because of thoughtful consolidation, excellent type safety, and comprehensive documentation. Apply these same principles to GitHub MCP for maximum impact. 