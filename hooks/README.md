# Monitoring Hooks for Claude Code

Passive monitoring of how Claude Code uses the multi-llm MCP tools.

## What it monitors

- Every `mcp__multi-llm__*` tool call (ask, cli_ask, multi_ask, etc.)
- Captures: timestamp, session ID, tool name, prompt excerpt
- Writes to `~/.llm-router/hooks-log.jsonl`

## Setup

Copy the hooks config to your project's Claude settings:

```bash
# In your target project directory (not in claude-code-multi-llm):
mkdir -p .claude
cp /path/to/claude-code-multi-llm/hooks/settings.json .claude/settings.json
```

Or merge into existing settings manually.

## Log location

- Hooks log: `~/.llm-router/hooks-log.jsonl`
- Cost tracker log: `~/.llm-router/cost-log.jsonl`
- Analysis: `npx claude-code-multi-llm analyze` (or `npm run analyze` from toolkit dir)
