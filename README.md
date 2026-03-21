# Multi-LLM Toolkit for Claude Code

[![npm version](https://img.shields.io/npm/v/claude-code-multi-llm)](https://www.npmjs.com/package/claude-code-multi-llm)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)

**English** | [繁體中文](./README.zh-TW.md)

An MCP server that lets Claude Code delegate routine subtasks to cheaper models. Claude stays the brain — grunt work goes to Gemini Flash-Lite ($0.10/M) or GPT-4.1-mini ($0.40/M) instead of Opus ($25/M).

> Cut 60-98% of token costs on routine subtasks without leaving Claude Code.

## Three Modes

### 1. CLI Subscription Mode (free)

Use existing ChatGPT Pro / Google AI Studio / Kimi subscriptions — zero extra cost.

| Tool | Description |
|------|-------------|
| `cli_ask` | Send prompt via installed CLI using subscription credits |
| `cli_status` | Check which CLIs are available |

### 2. API Router Mode (pay-per-token)

Auto-routes to the cheapest capable model:

| Tool | Description |
|------|-------------|
| `ask` | Route prompt to cheapest API model |
| `multi_ask` | Query multiple models in parallel |
| `cost_report` | Spending analytics vs Opus baseline |
| `route_explain` | Debug routing decisions |
| `list_models` | Available models + pricing |
| `configure` | Adjust router settings |

### 3. Slash Commands (deep analysis)

| Command | Description |
|---------|-------------|
| `/multi-llm` | Parallel multi-LLM cross-check via CLIs |
| `/thinkdeep` | Deep reasoning with confidence tracking |
| `/consensus` | Multi-perspective debate |
| `/precommit` | Pre-commit review |
| `/secaudit` | OWASP Top 10 security audit |
| `/debug-deep` | Root-cause analysis |
| `/planner` | Task decomposition |
| `/challenge` | Devil's advocate |
| `/apilookup` | API/SDK doc lookup |

## When to Use What

| Task | Tool | Cost |
|------|------|------|
| Translate / format / summarize | `cli_ask` or `ask` | $0 or ~$0.001 |
| Code review / debug | `ask` (advanced) | ~$0.005 |
| Architecture decisions | `multi_ask` | ~$0.01 |
| Cross-validate | `/multi-llm` | $0 (subscription) |
| Deep reasoning | Claude directly | — |

## Setup

```bash
# 1. Install
git clone https://github.com/howardpen9/claude-code-multi-llm.git
cd claude-code-multi-llm && npm install && npm run build

# 2a. CLI mode — install any CLI you have a subscription for
npm i -g @openai/codex        # ChatGPT Pro
npm i -g @google/gemini-cli   # Google AI Studio
uv tool install kimi-cli       # Kimi

# 2b. API mode — set keys
cp .env.example .env  # Edit: OPENAI_API_KEY, GOOGLE_API_KEY

# 3. Slash commands (optional)
cp commands/*.md ~/.claude/commands/
```

Add to `.mcp.json`:

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

## How Routing Works

```
Claude Code (Opus) receives a task
        │
        ├─ Complex reasoning? → Claude handles directly
        │
        ├─ Simple + CLI subscription? → cli_ask (FREE)
        │
        ├─ Simple + API keys? → ask (auto-route to cheapest)
        │     ┌─────────────────────────────────────────┐
        │     │ BASIC    → Gemini Flash-Lite  ($0.10/M) │
        │     │ STANDARD → GPT-4.1-mini      ($0.40/M) │
        │     │ ADVANCED → Gemini Flash       ($0.15/M) │
        │     │ FRONTIER → o3-mini           ($1.10/M) │
        │     └─────────────────────────────────────────┘
        │
        └─ Need cross-validation? → /multi-llm or multi_ask
```

## Model Pricing (API Mode)

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

Savings vs Opus baseline: **98%** on BASIC, **94%** on STANDARD, **60-96%** on ADVANCED.

## FAQ

**Does this replace Claude Code?**
No. Claude is always the top-level brain. This just delegates cheap subtasks.

**Is `cli_ask` really free?**
Yes — it uses your existing subscriptions (ChatGPT Pro, Google AI Studio, etc).

**Can I use this without API keys?**
Yes — CLI mode only needs installed CLIs + subscriptions.

## Roadmap

### Honest Status

The router is a **regex-based heuristic** — keyword matching to guess task complexity. It works for obvious cases but has known limitations:

- Savings numbers (60-98%) are **theoretical**, not measured from real sessions
- Keyword classifier can misroute (e.g., "debug this simple typo" → ADVANCED)
- We haven't validated Claude Code's actual delegation behavior with MCP tools

### TODO

**Router Improvements**
- [ ] Upgrade from regex to embedding-based classification (e.g., sentence-transformers or cheap LLM pre-classification via Flash-Lite)
- [ ] Add confidence scores to routing decisions — enable fallback on low-confidence classifications
- [ ] Multi-signal fusion — incorporate conversation history, file type, code block presence (not just prompt keywords)
- [ ] Explore [vLLM Semantic Router](https://docs.vllm.ai/)-style signal-driven architecture as a reference for next-gen routing
- [ ] Resolve keyword collision problem (e.g., "debug" + "simple" + "format" triggering conflicting tiers)

**Measurement & Validation**
- [ ] Session-level token logging — capture actual MCP tool call frequency and token counts
- [ ] Real-world benchmark suite — 20 common dev tasks, measure actual vs baseline cost
- [ ] A/B measurement framework — same prompts with/without toolkit, compare cost + quality
- [ ] Claude Code behavior study — when does Claude actually choose to delegate vs handle directly?

**Provider & Model Expansion**
- [ ] Add DeepSeek, Mistral, Qwen providers
- [ ] Support local models via Ollama for zero-cost offline routing
- [ ] Auto-update pricing from provider APIs instead of hardcoded values

**Architecture**
- [ ] Adaptive routing — learn from `cost_report` data which model performs best per task type
- [ ] Multi-turn context awareness — route based on conversation state, not just single prompt
- [ ] Quality scoring — cheapest model that meets a quality threshold, not just cheapest overall
- [ ] Skill-based mode as alternative to MCP — zero token overhead when not in use

**Community**
- [ ] Shared benchmark dataset — task + model + quality scores from real usage
- [ ] Plugin system for custom routing rules
- [ ] Dashboard UI for cost analytics

### Contributing

The biggest help right now is **real-world usage data**:
- Which tools you actually use most
- Cases where routing made the wrong choice
- Your actual savings from `cost_report`

## Inspired By

- [PAL MCP Server](https://github.com/BeehiveInnovations/pal-mcp-server) — Provider abstraction, multi-model orchestration
- [RouteLLM](https://github.com/lm-sys/RouteLLM) — Cost-aware routing research

## License

MIT
