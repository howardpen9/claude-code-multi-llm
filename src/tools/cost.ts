import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { CostTracker } from '../cost-tracker.js'

export function registerCostTool(server: McpServer, costTracker: CostTracker) {
  server.tool(
    'cost_report',
    `Show spending analytics and savings. Compares actual cost of routed requests vs what they would have cost using Claude Opus 4 ($5/$25 per M tokens).

Use periodically to see how much money the router is saving.`,
    {
      period: z
        .enum(['session', 'today', 'all'])
        .optional()
        .describe('Time period. session: current MCP session. today: last 24h. all: everything.'),
    },
    async ({ period }) => {
      const count = costTracker.getEntryCount()
      if (count === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No requests tracked yet. Use the `ask` or `multi_ask` tools first.',
            },
          ],
        }
      }

      let filter: { from?: number; to?: number } | undefined
      if (period === 'today') {
        filter = { from: Date.now() - 24 * 60 * 60 * 1000 }
      }
      // 'session' and 'all' both return everything in memory

      const report = costTracker.getReport(filter)

      const lines = [
        '## Cost Report',
        '',
        `**Total requests**: ${report.totalRequests}`,
        `**Actual cost**: $${report.totalCostUsd.toFixed(6)}`,
        `**Opus baseline**: $${report.totalBaselineCostUsd.toFixed(6)}`,
        `**Saved**: $${report.savingsUsd.toFixed(6)} (${report.savingsPercent}%)`,
        '',
        '### By Model',
        '| Model | Requests | Cost |',
        '|-------|----------|------|',
      ]

      for (const [model, data] of Object.entries(report.byModel)) {
        lines.push(`| ${model} | ${data.requests} | $${data.costUsd.toFixed(6)} |`)
      }

      if (Object.keys(report.byTool).length > 1) {
        lines.push('', '### By Tool', '| Tool | Requests | Cost |', '|------|----------|------|')
        for (const [tool, data] of Object.entries(report.byTool)) {
          lines.push(`| ${tool} | ${data.requests} | $${data.costUsd.toFixed(6)} |`)
        }
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] }
    },
  )
}
