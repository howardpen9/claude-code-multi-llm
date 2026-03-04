# Multi-LLM Toolkit for Claude Code

**English** | [繁體中文](./README.zh-TW.md)

Save tokens by routing subtasks to cheaper models. Claude Code stays as the top-level brain — simple tasks get delegated to Gemini Flash-Lite ($0.10/M) or GPT-4.1-mini ($0.40/M) instead of using Opus ($25/M output) for everything.

## Three Modes

### 1. CLI Subscription Mode (free if you have a subscription)

Use your existing ChatGPT Pro / Google AI Studio / Kimi subscriptions — **zero extra cost**:

| Tool | Description |
|------|-------------|
| `cli_ask` | Send prompt via installed CLI (codex/gemini/kimi) using subscription credits |
| `cli_status` | Check which CLIs are installed and available |

### 2. API Router Mode (pay-per-token, auto-routed to cheapest)

6 MCP tools that call LLM APIs directly — costs per-token but auto-picks the cheapest model:

| Tool | Description |
|------|-------------|
| `ask` | Route a prompt to the cheapest capable API model |
| `multi_ask` | Query multiple API models in parallel, compare responses |
| `list_models` | Show available models with pricing |
| `cost_report` | Spending analytics + savings vs Opus baseline |
| `route_explain` | Debug: explain routing decision without calling any LLM |
| `configure` | Adjust router settings for this session |

### 3. Slash Commands (deep analysis + cross-checking)

9 commands for structured analysis and multi-LLM cross-checking:

| Command | Description |
|---------|-------------|
| `/multi-llm` | Parallel multi-LLM analysis — spawn Codex, Kimi, Gemini CLIs |
| `/thinkdeep` | Deep reasoning with confidence tracking |
| `/consensus` | Multi-perspective debate (FOR / AGAINST / NEUTRAL) |
| `/precommit` | Pre-commit review of staged changes |
| `/secaudit` | OWASP Top 10 security audit |
| `/debug-deep` | Systematic root-cause analysis with hypothesis tracking |
| `/planner` | Task decomposition into implementation plan |
| `/challenge` | Devil's advocate — challenge assumptions |
| `/apilookup` | Version-aware API/SDK documentation lookup |

## When to Use What

```
Have a subscription (ChatGPT Pro, Google AI Studio)?
  → cli_ask (FREE, uses subscription credits)

No subscription, but have API keys?
  → ask (auto-routes to cheapest API model, pay-per-token)

Need cross-validation from multiple models?
  → multi_ask (API, parallel) or /multi-llm (CLI, parallel)
```

## Setup

### 1. Install

```bash
git clone https://github.com/<your-username>/claude-code-multi-llm.git
cd claude-code-multi-llm
npm install && npm run build
```

### 2. Configure

**For CLI mode** (subscription credits) — just install the CLIs:

```bash
npm i -g @openai/codex        # ChatGPT Pro subscription
npm i -g @google/gemini-cli   # Google AI Studio (free tier available)
uv tool install kimi-cli       # Kimi subscription
```

**For API mode** (pay-per-token) — set API keys:

```bash
cp .env.example .env
# Edit .env: OPENAI_API_KEY and/or GOOGLE_API_KEY
```

### 3. Connect to Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "multi-llm": {
      "command": "node",
      "args": ["/path/to/claude-code-multi-llm/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "GOOGLE_API_KEY": "AI..."
      }
    }
  }
}
```

Or use npx after publishing:

```json
{
  "mcpServers": {
    "multi-llm": {
      "command": "npx",
      "args": ["-y", "claude-code-multi-llm"]
    }
  }
}
```

### 4. Slash Commands (optional)

```bash
cp commands/*.md ~/.claude/commands/
```

## How Routing Works

```
Claude Code (Opus) receives a task
        │
        ├─ Complex reasoning? → Claude handles it directly
        │
        ├─ Simple subtask + has CLI subscription?
        │     → cli_ask (FREE, uses subscription credits)
        │
        ├─ Simple subtask + API keys only?
        │     → ask (auto-routes to cheapest API model)
        │           │
        │     Router classifies prompt:
        │     ┌──────────────────────────────────────────────┐
        │     │ BASIC:    translate, format, JSON             │ → Gemini Flash-Lite ($0.10/M)
        │     │ STANDARD: Q&A, explain, write                │ → GPT-4.1-mini ($0.40/M)
        │     │ ADVANCED: review, debug, security            │ → Gemini Flash ($0.15/M)
        │     │ FRONTIER: deep reasoning, novel              │ → o3-mini ($1.10/M)
        │     └──────────────────────────────────────────────┘
        │
        └─ Need cross-validation? → /multi-llm or multi_ask
```

## Billing Comparison

| Mode | Billing | Cost | Speed | Token Tracking |
|------|---------|------|-------|----------------|
| `cli_ask` | Subscription credits | **$0** (included) | Slower (CLI overhead) | No |
| `ask` | API pay-per-token | $0.10–15/M | Fast (direct API) | Yes |
| `/multi-llm` | Subscription credits | **$0** | Slowest (parallel CLI spawn) | No |

## Model Pricing — API Mode (v1)

| Model | Provider | Tier | Input $/M | Output $/M |
|-------|----------|------|-----------|------------|
| Gemini 2.5 Flash-Lite | Google | STANDARD | $0.10 | $0.40 |
| Gemini 2.5 Flash | Google | ADVANCED | $0.15 | $0.60 |
| GPT-4.1 Mini | OpenAI | STANDARD | $0.40 | $1.60 |
| GPT-4.1 | OpenAI | ADVANCED | $2.00 | $8.00 |
| Gemini 2.5 Pro | Google | ADVANCED | $2.50 | $10.00 |
| o3-mini | OpenAI | FRONTIER | $1.10 | $4.40 |
| GPT-5 | OpenAI | FRONTIER | $2.50 | $15.00 |
| **Claude Opus 4** | **Baseline** | - | **$5.00** | **$25.00** |

API mode savings: 98% on BASIC tasks, 94-97% on STANDARD, 60-96% on ADVANCED.

## Inspired By

- [PAL MCP Server](https://github.com/BeehiveInnovations/pal-mcp-server) — Provider abstraction, multi-model orchestration
- [RouteLLM](https://github.com/lm-sys/RouteLLM) — Cost-aware routing research

## License

MIT
