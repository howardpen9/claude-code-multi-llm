# Multi-LLM Toolkit for Claude Code

A Claude Code plugin that adds multi-LLM cross-checking and structured analysis commands. Spawn Codex (OpenAI), Kimi (Moonshot), and Gemini (Google) CLIs in parallel, then compare perspectives.

## What's Inside

### Commands (user-invoked via `/command-name`)

| Command | Description |
|---------|-------------|
| `/multi-llm` | Parallel multi-LLM analysis — spawn external CLIs, compare with Claude |
| `/thinkdeep` | Deep reasoning with confidence tracking |
| `/consensus` | Multi-perspective debate (FOR / AGAINST / NEUTRAL) |
| `/precommit` | Pre-commit review of staged changes |
| `/secaudit` | OWASP Top 10 security audit |
| `/debug-deep` | Systematic root-cause analysis with hypothesis tracking |
| `/planner` | Task decomposition into implementation plan |
| `/challenge` | Devil's advocate — challenge assumptions |
| `/apilookup` | Version-aware API/SDK documentation lookup |

### Skill (auto-triggered by Claude)

**analysis-router** — Automatically classifies tasks into tiers:

| Tier | When | Action |
|------|------|--------|
| 1 | Simple/obvious | Just answer |
| 2 | Needs rigor | Auto-apply structured methodology |
| 3 | Genuinely unsure | **Suggest** multi-LLM to user (asks first) |
| 4 | Big decision | Structured debate |

## Prerequisites

At least one external coding CLI installed:

| CLI | Install | Model |
|-----|---------|-------|
| [Codex CLI](https://github.com/openai/codex) | `npm install -g @openai/codex` | OpenAI GPT/O3 |
| [Kimi Code](https://github.com/MoonshotAI/kimi-cli) | `uv tool install kimi-cli` | Moonshot Kimi |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | `npm install -g @google/gemini-cli` | Google Gemini |

Each CLI requires its own API key configured separately.

## Installation

### Option A: Development mode (quick test)

```bash
git clone https://github.com/<your-username>/claude-code-multi-llm.git
claude --plugin-dir ./claude-code-multi-llm
```

### Option B: Copy commands only (no plugin needed)

```bash
git clone https://github.com/<your-username>/claude-code-multi-llm.git
cp claude-code-multi-llm/commands/*.md ~/.claude/commands/
```

This gives you the slash commands without the auto-routing skill.

## Usage

### Manual commands

```
> /multi-llm Should we use Redis or in-memory LRU for session cache?
> /thinkdeep Is this WebSocket reconnection logic correct?
> /secaudit server/routes/auth.ts
> /precommit
> /challenge We should migrate from Express to Fastify
```

### Auto-routing (with plugin installed)

The `analysis-router` skill automatically detects task complexity and applies the right methodology. For Tier 3 (multi-LLM), it will always ask before spawning external CLIs.

## Architecture

```
┌─────────────────────────────────────┐
│  Claude Code (YOU) = Judge + Player │
│                                     │
│  analysis-router skill auto-routes: │
│  Tier 1 → direct answer            │
│  Tier 2 → structured methodology   │
│  Tier 3 → spawn external CLIs ───┐ │
│  Tier 4 → structured debate      │ │
└──────────────────────────────────┼─┘
                                   │
           ┌───────────┬───────────┼──────────┐
           │           │           │          │
     ┌─────▼──┐  ┌────▼───┐  ┌───▼────┐  ┌──▼─────┐
     │ Claude │  │ Codex  │  │  Kimi  │  │ Gemini │
     │  (You) │  │(OpenAI)│  │(Moonsh)│  │(Google)│
     └────────┘  └────────┘  └────────┘  └────────┘
```

## Inspired By

Design patterns extracted from [PAL MCP Server](https://github.com/BeehiveInnovations/pal-mcp-server) (11K+ stars):

- **WorkflowTool** → confidence tracking in `/thinkdeep`, `/debug-deep`
- **Consensus stance injection** → FOR/AGAINST/NEUTRAL in `/consensus`
- **Challenge (no-model tool)** → pure prompt transformation in `/challenge`
- **Clink CLI bridge** → external CLI spawning in `/multi-llm`
- **OWASP structured checklist** → systematic audit in `/secaudit`

## License

MIT
