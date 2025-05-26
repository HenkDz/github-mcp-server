# GitHub MCP Server

A Model Context Protocol server for GitHub API operations, providing comprehensive repository management and GitHub workflow automation.

## 🚀 **Features**

### **Phase 1: Foundation** ✅ **COMPLETE**
- ✅ **Repository Management**: Create, update, delete, fork, get, list, and transfer repositories
- ✅ **Type-safe Operations**: Full TypeScript support with Zod validation
- ✅ **Error Handling**: Comprehensive GitHub API error mapping
- ✅ **Token Management**: Multiple authentication methods

### **Phase 2: Core Tools** ✅ **COMPLETE** 
- ✅ **Issue Management**: Create, update, close, assign, label, comment, search, and list issues
- ✅ **Pull Request Management**: Create, update, merge, review, approve, request changes, list PRs
- ✅ **Branch Management**: Create, delete, get, list, and manage branch protection
- ✅ **Release Management**: Create, update, delete, publish, and manage releases

### **Planned Features**
- 🔄 **Actions Integration**: Trigger workflows, get run status
- 🔄 **Advanced Search**: Search across repos, issues, PRs, code
- 🔄 **Repository Analytics**: Health checks, insights, metrics

## 📦 **Installation**

```bash
# Clone the repository
git clone <repository-url>
cd github-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## 🔧 **Configuration**

### **Authentication**

Set your GitHub token using one of these methods:

1. **Environment Variable** (recommended):
   ```bash
   export GITHUB_TOKEN="your_github_token_here"
   ```

2. **Command Line**:
   ```bash
   npm start -- --token "your_github_token_here"
   ```

3. **Tool Parameters**: Pass the token directly in tool calls

### **Tool Configuration**

Create a `tools-config.json` file to enable specific tools:

```json
{
  "enabledTools": [
    "gh_manage_repos"
  ]
}
```

## 🎯 **Usage**

### **Development**
```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

### **Production**
```bash
# Build and start
npm run build
npm start
```

## 🛠 **Available Tools**

### **gh_manage_repos** (Phase 1) ✅
Comprehensive repository management with the following operations:

- **`create`**: Create a new repository
- **`get`**: Get repository information
- **`update`**: Update repository settings
- **`delete`**: Delete a repository
- **`fork`**: Fork a repository
- **`list`**: List repositories for authenticated user
- **`transfer`**: Transfer repository ownership

### **gh_manage_issues** (Phase 2) ✅
Comprehensive issue management with the following operations:

- **`create`**: Create a new issue
- **`get`**: Get issue information
- **`update`**: Update issue properties
- **`close`**: Close an issue
- **`assign`**: Assign users to issue
- **`label`**: Manage issue labels
- **`comment`**: Add comments to issue
- **`list`**: List repository issues with filters
- **`search`**: Search issues globally

### **gh_manage_pulls** (Phase 2) ✅
Comprehensive pull request management with the following operations:

- **`create`**: Create a new pull request
- **`get`**: Get pull request information
- **`update`**: Update pull request properties
- **`merge`**: Merge a pull request
- **`review`**: Review pull request with comments
- **`approve`**: Approve a pull request
- **`request_changes`**: Request changes on PR
- **`list`**: List repository pull requests
- **`close`**: Close a pull request

### **gh_manage_branches** (Phase 2) ✅
Comprehensive branch management with the following operations:

- **`create`**: Create a new branch
- **`get`**: Get branch information
- **`delete`**: Delete a branch
- **`list`**: List repository branches
- **`protect`**: Set branch protection rules
- **`get_protection`**: Get branch protection settings
- **`update_protection`**: Update protection rules

### **gh_manage_releases** (Phase 2) ✅
Comprehensive release management with the following operations:

- **`create`**: Create a new release
- **`get`**: Get release information
- **`update`**: Update release properties
- **`delete`**: Delete a release
- **`publish`**: Publish a draft release
- **`get_latest`**: Get latest release
- **`list`**: List repository releases

#### **Example Usage**

```json
{
  "operation": "create",
  "name": "my-new-repo",
  "description": "A new repository",
  "private": false,
  "auto_init": true
}
```

```json
{
  "operation": "get",
  "owner": "username",
  "repo": "repository-name"
}
```

## 🏗 **Architecture**

Following the proven patterns from postgres-mcp:

- **Consolidated Tools**: Operations grouped by domain (repos, issues, PRs)
- **Type Safety**: Zod schemas with runtime validation
- **Error Handling**: Consistent GitHub API error mapping
- **Extensible Design**: Easy to add new operations and tools

## 📋 **Development Roadmap**

### **Phase 1: Foundation** ✅
- [x] Repository management tool
- [x] GitHub API client wrapper
- [x] Authentication handling
- [x] Error handling and validation

### **Phase 2: Core Tools** ✅ **COMPLETE**
- [x] Issue management tool
- [x] Pull request management tool
- [x] Branch management tool
- [x] Release management tool

### **Phase 3: Advanced Features**
- [ ] GitHub Actions integration
- [ ] Advanced search capabilities
- [ ] Repository analytics

### **Phase 4: Specialized Tools**
- [ ] Bulk operations
- [ ] Migration tools
- [ ] Monitoring and insights

## 🤝 **Contributing**

1. Follow the established patterns from postgres-mcp
2. Add comprehensive tests for new features
3. Update documentation for new tools
4. Ensure type safety throughout

## 📄 **License**

MIT License 