# GitHub MCP Server - Tool Schemas Reference

This document provides complete parameter reference for all GitHub MCP tools, following the successful patterns from postgres-mcp.

## 📋 **Tool Index**

### **Phase 1: Foundation Tools**
- [`gh_manage_repos`](#gh_manage_repos) - Comprehensive repository management

### **Phase 2: Core Tools** ✅
- [`gh_manage_issues`](#gh_manage_issues) - Issue management and tracking
- [`gh_manage_pulls`](#gh_manage_pulls) - Pull request operations
- [`gh_manage_branches`](#gh_manage_branches) - Branch operations and protection
- [`gh_manage_releases`](#gh_manage_releases) - Release management

### **Phase 3: Advanced Tools** ✅
- [`gh_manage_actions`](#gh_manage_actions) - GitHub Actions integration
- [`gh_search`](#gh_search) - Advanced search across GitHub

---

## 🔧 **gh_manage_repos**

**Description**: Comprehensive GitHub repository management - create, update, delete, fork, get, list, and transfer repositories

### **Operations**

#### **`create`** - Create New Repository
Creates a new repository for the authenticated user.

**Required Parameters:**
- `operation`: `"create"`
- `name`: Repository name (string)

**Optional Parameters:**
- `token`: GitHub token (string) - uses environment/CLI if not provided
- `description`: Repository description (string)
- `private`: Private repository flag (boolean, default: false)
- `auto_init`: Initialize with README (boolean, default: false)
- `gitignore_template`: Gitignore template name (string)
- `license_template`: License template name (string)

**Example:**
```json
{
  "operation": "create",
  "name": "my-awesome-project",
  "description": "An awesome new project",
  "private": false,
  "auto_init": true,
  "gitignore_template": "Node",
  "license_template": "mit"
}
```

---

#### **`get`** - Get Repository Information
Retrieves detailed information about a specific repository.

**Required Parameters:**
- `operation`: `"get"`
- `owner`: Repository owner username/organization (string)
- `repo`: Repository name (string)

**Optional Parameters:**
- `token`: GitHub token (string)

**Example:**
```json
{
  "operation": "get",
  "owner": "octocat",
  "repo": "Hello-World"
}
```

---

#### **`update`** - Update Repository Settings
Updates repository settings and metadata.

**Required Parameters:**
- `operation`: `"update"`
- `owner`: Repository owner username/organization (string)
- `repo`: Repository name (string)

**Optional Parameters:**
- `token`: GitHub token (string)
- `new_name`: New repository name (string)
- `description`: Repository description (string)
- `homepage`: Repository homepage URL (string)
- `private`: Private repository flag (boolean)
- `has_issues`: Enable issues (boolean)
- `has_projects`: Enable projects (boolean)
- `has_wiki`: Enable wiki (boolean)

**Example:**
```json
{
  "operation": "update",
  "owner": "octocat",
  "repo": "Hello-World",
  "description": "Updated description",
  "homepage": "https://example.com",
  "has_issues": true,
  "has_wiki": false
}
```

---

#### **`delete`** - Delete Repository
Permanently deletes a repository. **This action cannot be undone.**

**Required Parameters:**
- `operation`: `"delete"`
- `owner`: Repository owner username/organization (string)
- `repo`: Repository name (string)

**Optional Parameters:**
- `token`: GitHub token (string)

**Example:**
```json
{
  "operation": "delete",
  "owner": "octocat",
  "repo": "old-project"
}
```

---

#### **`fork`** - Fork Repository
Creates a fork of a repository.

**Required Parameters:**
- `operation`: `"fork"`
- `owner`: Source repository owner (string)
- `repo`: Source repository name (string)

**Optional Parameters:**
- `token`: GitHub token (string)

**Example:**
```json
{
  "operation": "fork",
  "owner": "octocat",
  "repo": "Hello-World"
}
```

---

#### **`list`** - List Repositories
Lists repositories for the authenticated user.

**Required Parameters:**
- `operation`: `"list"`

**Optional Parameters:**
- `token`: GitHub token (string)
- `type`: Repository type filter (enum: `"all"`, `"owner"`, `"public"`, `"private"`, `"member"`)
- `sort`: Sort field (enum: `"created"`, `"updated"`, `"pushed"`, `"full_name"`)
- `direction`: Sort direction (enum: `"asc"`, `"desc"`)
- `per_page`: Results per page (number, 1-100)
- `page`: Page number (number, ≥1)

**Example:**
```json
{
  "operation": "list",
  "type": "owner",
  "sort": "updated",
  "direction": "desc",
  "per_page": 50
}
```

---

#### **`transfer`** - Transfer Repository
Transfers repository ownership to another user or organization.

**Required Parameters:**
- `operation`: `"transfer"`
- `owner`: Current repository owner (string)
- `repo`: Repository name (string)
- `new_owner`: New owner username/organization (string)

**Optional Parameters:**
- `token`: GitHub token (string)

**Example:**
```json
{
  "operation": "transfer",
  "owner": "current-owner",
  "repo": "my-project",
  "new_owner": "new-organization"
}
```

---

## 🔧 **gh_manage_issues**

**Description**: Comprehensive GitHub issue management - create, update, close, assign, label, comment, search, and list issues

### **Operations**

#### **`create`** - Create New Issue
Creates a new issue in a repository.

**Required Parameters:**
- `operation`: `"create"`
- `owner`: Repository owner username/organization (string)
- `repo`: Repository name (string)
- `title`: Issue title (string)

**Optional Parameters:**
- `token`: GitHub token (string)
- `body`: Issue description/body (string)
- `labels`: Array of label names (string[])
- `assignees`: Array of usernames to assign (string[])
- `milestone`: Milestone number (number)

**Example:**
```json
{
  "operation": "create",
  "owner": "octocat",
  "repo": "Hello-World",
  "title": "Bug: Application crashes on startup",
  "body": "When I run the application, it crashes immediately with error code 500.",
  "labels": ["bug", "critical"],
  "assignees": ["developer1"]
}
```

---

#### **`get`** - Get Issue Information
Retrieves detailed information about a specific issue.

**Required Parameters:**
- `operation`: `"get"`
- `owner`: Repository owner (string)
- `repo`: Repository name (string)
- `issue_number`: Issue number (number)

**Optional Parameters:**
- `token`: GitHub token (string)

**Example:**
```json
{
  "operation": "get",
  "owner": "octocat",
  "repo": "Hello-World",
  "issue_number": 123
}
```

---

#### **`update`** - Update Issue
Updates an existing issue's properties.

**Required Parameters:**
- `operation`: `"update"`
- `owner`: Repository owner (string)
- `repo`: Repository name (string)
- `issue_number`: Issue number (number)

**Optional Parameters:**
- `token`: GitHub token (string)
- `title`: New issue title (string)
- `body`: New issue body (string)
- `state`: Issue state - `"open"` or `"closed"`
- `state_reason`: Reason for state change - `"completed"`, `"not_planned"`, `"reopened"`
- `labels`: Array of label names (string[])
- `assignees`: Array of usernames (string[])
- `milestone`: Milestone number (number)

**Example:**
```json
{
  "operation": "update", 
  "owner": "octocat",
  "repo": "Hello-World",
  "issue_number": 123,
  "title": "Updated: Application crashes on startup",
  "state": "closed",
  "state_reason": "completed",
  "labels": ["bug", "fixed"]
}
```

---

#### **`close`** - Close Issue
Closes an issue with an optional reason.

**Required Parameters:**
- `operation`: `"close"`
- `owner`: Repository owner (string)
- `repo`: Repository name (string)
- `issue_number`: Issue number (number)

**Optional Parameters:**
- `token`: GitHub token (string)
- `state_reason`: Reason for closing - `"completed"` (default), `"not_planned"`

**Example:**
```json
{
  "operation": "close",
  "owner": "octocat",
  "repo": "Hello-World",
  "issue_number": 123,
  "state_reason": "completed"
}
```

---

#### **`assign`** - Assign Users to Issue
Assigns or unassigns users to/from an issue.

**Required Parameters:**
- `operation`: `"assign"`
- `owner`: Repository owner (string)
- `repo`: Repository name (string)
- `issue_number`: Issue number (number)

**Optional Parameters:**
- `token`: GitHub token (string)
- `assignees`: Array of usernames to assign (string[], empty array to unassign all)

**Example:**
```json
{
  "operation": "assign",
  "owner": "octocat",
  "repo": "Hello-World",
  "issue_number": 123,
  "assignees": ["developer1", "developer2"]
}
```

---

#### **`label`** - Manage Issue Labels
Sets labels on an issue (replaces existing labels).

**Required Parameters:**
- `operation`: `"label"`
- `owner`: Repository owner (string)
- `repo`: Repository name (string)
- `issue_number`: Issue number (number)

**Optional Parameters:**
- `token`: GitHub token (string)
- `labels`: Array of label names (string[], empty array to remove all labels)

**Example:**
```json
{
  "operation": "label",
  "owner": "octocat",
  "repo": "Hello-World",
  "issue_number": 123,
  "labels": ["bug", "priority-high", "needs-review"]
}
```

---

#### **`comment`** - Add Comment to Issue
Adds a comment to an existing issue.

**Required Parameters:**
- `operation`: `"comment"`
- `owner`: Repository owner (string)
- `repo`: Repository name (string)
- `issue_number`: Issue number (number)
- `comment_body`: Comment text (string)

**Optional Parameters:**
- `token`: GitHub token (string)

**Example:**
```json
{
  "operation": "comment",
  "owner": "octocat",
  "repo": "Hello-World",
  "issue_number": 123,
  "comment_body": "I'm investigating this issue and will have a fix ready soon."
}
```

---

#### **`list`** - List Repository Issues
Lists issues for a specific repository with filtering options.

**Required Parameters:**
- `operation`: `"list"`
- `owner`: Repository owner (string)
- `repo`: Repository name (string)

**Optional Parameters:**
- `token`: GitHub token (string)
- `state_filter`: Issue state filter - `"open"` (default), `"closed"`, `"all"`
- `labels_filter`: Labels filter (comma-separated string)
- `assignee`: Assignee username filter (string)
- `creator`: Creator username filter (string)
- `mentioned`: User mentioned filter (string)
- `since`: Only issues updated after this time (ISO 8601 string)
- `sort`: Sort field - `"created"`, `"updated"`, `"comments"`
- `order`: Sort order - `"asc"`, `"desc"`
- `per_page`: Results per page (number, 1-100)
- `page`: Page number (number, ≥1)

**Example:**
```json
{
  "operation": "list",
  "owner": "octocat",
  "repo": "Hello-World",
  "state_filter": "open",
  "labels_filter": "bug,critical",
  "sort": "updated",
  "order": "desc",
  "per_page": 25
}
```

---

#### **`search`** - Search Issues Globally
Searches for issues across all of GitHub using GitHub's search syntax.

**Required Parameters:**
- `operation`: `"search"`
- `q`: Search query (string) - Use GitHub search syntax

**Optional Parameters:**
- `token`: GitHub token (string)
- `sort`: Sort field - `"created"`, `"updated"`, `"comments"`
- `order`: Sort order - `"asc"`, `"desc"`
- `per_page`: Results per page (number, 1-100)
- `page`: Page number (number, ≥1)

**Example:**
```json
{
  "operation": "search",
  "q": "repo:octocat/Hello-World is:issue state:open label:bug",
  "sort": "updated",
  "order": "desc",
  "per_page": 20
}
```

**Search Query Examples:**
- `"is:issue is:open author:username"` - Open issues by specific user
- `"repo:owner/repo is:issue label:bug"` - Issues with bug label in specific repo
- `"is:issue involves:username"` - Issues involving specific user
- `"is:issue created:>2024-01-01"` - Issues created after date

---

## 🔐 **Authentication**

All tools support multiple authentication methods:

1. **Tool Parameter**: Pass `token` in the request
2. **Command Line**: Use `--token` flag when starting server
3. **Environment Variable**: Set `GITHUB_TOKEN`

**Token Scopes Required:**
- `repo` - Full control of private repositories
- `public_repo` - Access to public repositories (if only public access needed)

## ⚡ **Rate Limiting**

GitHub API has rate limits:
- **Authenticated requests**: 5,000 per hour
- **Search API**: 30 per minute
- **Secondary rate limits** apply to mutations

The server automatically handles rate limit errors and provides meaningful error messages.

## 🚨 **Error Handling**

The server provides consistent error handling with specific error codes:

- **401 Unauthorized**: Invalid or expired token
- **403 Forbidden**: Insufficient permissions or rate limit exceeded
- **404 Not Found**: Repository or resource doesn't exist
- **422 Unprocessable Entity**: Invalid parameters

**Example Error Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Repository not found. Check repository/organization names."
    }
  ],
  "isError": true
}
```

## 📝 **Response Format**

All tools return responses in this format:

**Success Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Repository create operation completed successfully"
    },
    {
      "type": "text", 
      "text": "{ ... detailed result data ... }"
    }
  ]
}
```

**Error Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Detailed error message"
    }
  ],
  "isError": true
}
```

---

## 🎯 **Best Practices**

1. **Use Environment Variables**: Set `GITHUB_TOKEN` for security
2. **Validate Permissions**: Ensure token has required scopes
3. **Handle Rate Limits**: Implement backoff for high-volume operations
4. **Check Repository Access**: Verify you have access before operations
5. **Use Specific Operations**: Choose the most specific operation for your need

---

## 🔧 **gh_manage_actions**

**Description**: Comprehensive GitHub Actions management - workflows, runs, artifacts, and automation

### **Operations**

#### **`list_workflows`** - List Repository Workflows
Lists all workflows in a repository.

**Required Parameters:**
- `operation`: `"list_workflows"`
- `owner`: Repository owner (string)
- `repo`: Repository name (string)

**Optional Parameters:**
- `token`: GitHub token (string)
- `per_page`: Results per page (number, 1-100)
- `page`: Page number (number, ≥1)

**Example:**
```json
{
  "operation": "list_workflows",
  "owner": "octocat",
  "repo": "Hello-World"
}
```

#### **`trigger_workflow`** - Trigger Workflow
Manually triggers a workflow dispatch event.

**Required Parameters:**
- `operation`: `"trigger_workflow"`
- `owner`: Repository owner (string)
- `repo`: Repository name (string)
- `workflow_id`: Workflow ID or filename (string/number)

**Optional Parameters:**
- `token`: GitHub token (string)
- `ref`: Git reference (string, defaults to default branch)
- `inputs`: Workflow inputs (object with string/number/boolean values)

**Example:**
```json
{
  "operation": "trigger_workflow",
  "owner": "octocat",
  "repo": "Hello-World",
  "workflow_id": "ci.yml",
  "ref": "main",
  "inputs": {
    "debug": "true",
    "environment": "staging"
  }
}
```

#### **`list_runs`** - List Workflow Runs
Lists workflow runs for a repository.

**Required Parameters:**
- `operation`: `"list_runs"`
- `owner`: Repository owner (string)
- `repo`: Repository name (string)

**Optional Parameters:**
- `token`: GitHub token (string)
- `workflow_id`: Filter by specific workflow (string/number)
- `status`: Filter by status (`"completed"`, `"in_progress"`, `"queued"`, etc.)
- `actor`: Filter by actor username (string)
- `branch`: Filter by branch name (string)
- `event`: Filter by trigger event (string)
- `created`: Filter by creation date (ISO 8601 string)
- `per_page`: Results per page (number, 1-100)
- `page`: Page number (number, ≥1)

**Example:**
```json
{
  "operation": "list_runs",
  "owner": "octocat",
  "repo": "Hello-World",
  "status": "completed",
  "branch": "main"
}
```

#### **`cancel_run`** - Cancel Workflow Run
Cancels a workflow run.

**Required Parameters:**
- `operation`: `"cancel_run"`
- `owner`: Repository owner (string)
- `repo`: Repository name (string)
- `run_id`: Workflow run ID (number)

**Optional Parameters:**
- `token`: GitHub token (string)

**Example:**
```json
{
  "operation": "cancel_run",
  "owner": "octocat",
  "repo": "Hello-World",
  "run_id": 123456789
}
```

#### **`list_artifacts`** - List Artifacts
Lists artifacts for a repository.

**Required Parameters:**
- `operation`: `"list_artifacts"`
- `owner`: Repository owner (string)
- `repo`: Repository name (string)

**Optional Parameters:**
- `token`: GitHub token (string)
- `per_page`: Results per page (number, 1-100)
- `page`: Page number (number, ≥1)

**Example:**
```json
{
  "operation": "list_artifacts",
  "owner": "octocat",
  "repo": "Hello-World"
}
```

---

## 🔧 **gh_search**

**Description**: Advanced GitHub search - repositories, issues, PRs, users, code, commits, and topics

### **Operations**

#### **`repositories`** - Search Repositories
Searches for repositories using GitHub's search syntax.

**Required Parameters:**
- `operation`: `"repositories"`
- `q`: Search query (string)

**Optional Parameters:**
- `token`: GitHub token (string)
- `language`: Programming language filter (string)
- `repo_size`: Repository size filter (string, e.g., ">1000")
- `sort`: Sort field (`"stars"`, `"forks"`, `"help-wanted-issues"`, `"updated"`)
- `order`: Sort order (`"asc"`, `"desc"`)
- `per_page`: Results per page (number, 1-100)
- `page`: Page number (number, ≥1)

**Example:**
```json
{
  "operation": "repositories",
  "q": "react",
  "language": "javascript",
  "sort": "stars",
  "order": "desc"
}
```

#### **`issues`** - Search Issues
Searches for issues across GitHub.

**Required Parameters:**
- `operation`: `"issues"`
- `q`: Search query (string)

**Optional Parameters:**
- `token`: GitHub token (string)
- `state`: Issue state filter (`"open"`, `"closed"`)
- `labels`: Labels filter (comma-separated string)
- `assignee`: Assignee filter (string)
- `sort`: Sort field (`"comments"`, `"reactions"`, `"created"`, `"updated"`)
- `order`: Sort order (`"asc"`, `"desc"`)
- `per_page`: Results per page (number, 1-100)
- `page`: Page number (number, ≥1)

**Example:**
```json
{
  "operation": "issues",
  "q": "is:issue is:open label:bug",
  "sort": "updated",
  "order": "desc"
}
```

#### **`code`** - Search Code
Searches for code across GitHub repositories.

**Required Parameters:**
- `operation`: `"code"`
- `q`: Search query (string)

**Optional Parameters:**
- `token`: GitHub token (string)
- `repo`: Repository filter (string, format: "owner/repo")
- `path`: File path filter (string)
- `extension`: File extension filter (string)
- `language`: Programming language filter (string)
- `sort`: Sort field (`"indexed"`)
- `order`: Sort order (`"asc"`, `"desc"`)
- `per_page`: Results per page (number, 1-100)
- `page`: Page number (number, ≥1)

**Example:**
```json
{
  "operation": "code",
  "q": "function handleClick",
  "repo": "facebook/react",
  "extension": "js",
  "language": "javascript"
}
```

#### **`users`** - Search Users
Searches for users and organizations.

**Required Parameters:**
- `operation`: `"users"`
- `q`: Search query (string)

**Optional Parameters:**
- `token`: GitHub token (string)
- `location`: Location filter (string)
- `sort`: Sort field (`"followers"`, `"repositories"`, `"joined"`)
- `order`: Sort order (`"asc"`, `"desc"`)
- `per_page`: Results per page (number, 1-100)
- `page`: Page number (number, ≥1)

**Example:**
```json
{
  "operation": "users",
  "q": "john",
  "location": "San Francisco",
  "sort": "followers"
}
```

## 📚 **Examples Library**

See the `examples/` directory for complete usage examples:
- Basic repository operations
- GitHub Actions automation
- Advanced search queries
- Bulk operations scripts
- Error handling patterns
- Authentication setups 