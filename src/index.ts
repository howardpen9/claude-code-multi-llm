#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { loadConfig } from './config.js'
import { ProviderRegistry } from './providers/registry.js'
import { CostTracker } from './cost-tracker.js'
import { registerAskTool } from './tools/ask.js'
import { registerMultiAskTool } from './tools/multi-ask.js'
import { registerModelsTool } from './tools/models.js'
import { registerCostTool } from './tools/cost.js'
import { registerExplainTool } from './tools/explain.js'
import { registerConfigureTool } from './tools/configure.js'
import { registerCLIAskTool } from './tools/cli-ask.js'

const config = loadConfig()
const registry = new ProviderRegistry(config)
const costTracker = new CostTracker(config.costLogPath)

const server = new McpServer({
  name: 'claude-code-multi-llm',
  version: '1.0.0',
})

// Register all tools
registerAskTool(server, registry, costTracker, config)
registerMultiAskTool(server, registry, costTracker)
registerModelsTool(server, registry)
registerCostTool(server, costTracker)
registerExplainTool(server, registry, config)
registerConfigureTool(server, config)
registerCLIAskTool(server, costTracker)

// Start
const transport = new StdioServerTransport()
await server.connect(transport)
