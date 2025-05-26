#!/usr/bin/env node

/**
 * GitHub MCP Server - Basic Usage Examples
 * 
 * This script demonstrates how to interact with the GitHub MCP server
 * using various repository management operations.
 * 
 * Prerequisites:
 * 1. Set GITHUB_TOKEN environment variable
 * 2. Build the project: npm run build
 * 3. Run this example: node examples/basic-usage.js
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Execute MCP tool call
 */
async function executeTool(toolName, parameters) {
  return new Promise((resolve, reject) => {
    const serverPath = join(projectRoot, 'dist', 'index.js');
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let output = '';
    let errorOutput = '';

    server.stdout.on('data', (data) => {
      output += data.toString();
    });

    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    server.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Server exited with code ${code}\nError: ${errorOutput}`));
      }
    });

    // Send MCP request
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: parameters
      }
    };

    server.stdin.write(`${JSON.stringify(request)}\n`);
    server.stdin.end();

    // Timeout after 30 seconds
    setTimeout(() => {
      server.kill();
      reject(new Error('Request timeout'));
    }, 30000);
  });
}

/**
 * Example operations
 */
async function runExamples() {
  console.log('🚀 GitHub MCP Server - Basic Usage Examples\n');

  // Check if GitHub token is available
  if (!process.env.GITHUB_TOKEN) {
    console.error('❌ Error: GITHUB_TOKEN environment variable is not set');
    console.log('Please set your GitHub token:');
    console.log('export GITHUB_TOKEN="your_github_token_here"');
    process.exit(1);
  }

  try {
    console.log('📋 Example 1: List repositories\n');
    
    const listParams = {
      operation: 'list',
      type: 'owner',
      sort: 'updated',
      direction: 'desc',
      per_page: 5
    };

    console.log('Request parameters:');
    console.log(JSON.stringify(listParams, null, 2));
    console.log('\n⏳ Executing...\n');

    const listResult = await executeTool('gh_manage_repos', listParams);
    console.log('✅ Response:');
    console.log(listResult);
    console.log(`\n${'='.repeat(80)}\n`);

    // If you want to test repository creation (uncomment carefully!)
    /*
    console.log('📋 Example 2: Create a test repository\n');
    
    const createParams = {
      operation: 'create',
      name: `test-repo-${Date.now()}`,
      description: 'A test repository created by GitHub MCP server',
      private: true,
      auto_init: true,
      gitignore_template: 'Node'
    };

    console.log('Request parameters:');
    console.log(JSON.stringify(createParams, null, 2));
    console.log('\n⏳ Executing...\n');

    const createResult = await executeTool('gh_manage_repos', createParams);
    console.log('✅ Response:');
    console.log(createResult);
    console.log('\n' + '='.repeat(80) + '\n');
    */

    console.log('📋 Example 3: Get repository information\n');
    
    const getParams = {
      operation: 'get',
      owner: 'octocat',
      repo: 'Hello-World'
    };

    console.log('Request parameters:');
    console.log(JSON.stringify(getParams, null, 2));
    console.log('\n⏳ Executing...\n');

    const getResult = await executeTool('gh_manage_repos', getParams);
    console.log('✅ Response:');
    console.log(getResult);
    console.log(`\n${'='.repeat(80)}\n`);

    console.log('🎉 All examples completed successfully!');
    console.log('\n📚 Try modifying the parameters above or add your own examples.');
    console.log('📖 See docs/TOOL_SCHEMAS.md for complete parameter reference.');

  } catch (error) {
    console.error('❌ Error running examples:', error.message);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples();
} 