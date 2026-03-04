---
name: analysis-router
description: This skill should be used when the user asks to "review code", "analyze architecture", "debug a bug", "audit security", "make a technical decision", "compare approaches", "plan a feature", or when the task involves code quality assessment, architectural trade-offs, security concerns, or complex debugging. It determines the right analysis depth and whether cross-model verification is needed.
version: 2026.3.4
---

# Analysis Router

Determines the right analysis depth for each task, whether to delegate to cheaper models, and whether to invoke multi-LLM cross-checking.

## MCP Tools Available

If the `multi-llm` MCP server is connected, you have these tools:

| Tool | Billing | Use for |
|------|---------|---------|
| `cli_ask` | Subscription (FREE) | Delegate subtasks via installed CLIs (codex/gemini/kimi) |
| `cli_status` | — | Check which CLIs are available |
| `ask` | API pay-per-token | Delegate subtasks to cheapest API model |
| `multi_ask` | API pay-per-token | Cross-validate with multiple API models in parallel |
| `list_models` | — | Show available models + pricing |
| `cost_report` | — | Show spending + savings |

## Decision Framework

### Tier 0: Delegate to Cheaper Model — SAVE TOKENS

**Before answering any Tier 1 task, check: can a cheaper model handle this?**

Delegate via `cli_ask` (free) or `ask` (cheap) when the task is:
- Translation or localization
- Summarization or reformatting
- JSON/CSV/data transformation
- Boilerplate code generation (CRUD, config files, types from schema)
- Explaining a concept (not analyzing specific code)
- Writing docs, comments, commit messages
- Simple Q&A that doesn't need codebase context
- Converting between formats (markdown ↔ HTML, YAML ↔ JSON)

**Priority**: `cli_ask` first (free subscription credits) → `ask` fallback (cheap API)

Example: User says "translate this README to Japanese"
→ Do NOT spend Opus tokens. Call `cli_ask` with prompt "translate to Japanese: ..."

Example: User says "generate TypeScript types from this JSON"
→ Call `ask` with the JSON. Router auto-picks cheapest model.

**Do NOT delegate** when the task requires:
- Reading/analyzing the user's specific codebase files
- Multi-step reasoning about the current project
- Tool use (Read, Grep, Glob, Bash)
- Context that only you (Claude) have from the conversation

### Tier 1: Single-Model (Claude only) — DEFAULT

Use for tasks that need codebase context or tool access.

- Bug fixes requiring file reads
- Code changes in the current project
- Questions about the specific codebase
- Tasks requiring conversation context
- Speed matters more than thoroughness

→ Just answer directly using your tools.

### Tier 2: Deep Analysis (structured methodology)

Needs rigor but not multiple perspectives.

| Scenario | Apply methodology from |
|----------|----------------------|
| Complex debugging, unclear root cause | `/debug-deep` |
| Pre-commit review | `/precommit` |
| Security-sensitive changes | `/secaudit` |
| Multi-step feature planning | `/planner` |
| API/SDK questions needing current docs | `/apilookup` |
| Need to challenge assumptions | `/challenge` |
| Deep reasoning with edge cases | `/thinkdeep` |

→ Apply the command's methodology inline. No need to literally type the slash command.

### Tier 3: Multi-LLM Cross-Check

Use ONLY when ALL of these are true:
1. **High stakes** — hard to reverse (architecture, security, data model)
2. **Genuine ambiguity** — 2+ reasonable approaches, non-obvious trade-offs
3. **Low confidence** — after initial analysis, you're not sure
4. **Time allows** — not a quick-answer request

Specific triggers:
- "Should we use X or Y?" with real trade-offs
- Security audit of auth/authorization code
- Code handling money, PII, critical infrastructure
- Concurrency bugs (race conditions, deadlocks)
- Performance optimization vs complexity trade-off
- You catch yourself writing "it depends"

Two options (ask user which):
- `multi_ask` — fast API parallel query (costs tokens but faster)
- `/multi-llm` — CLI spawn (uses subscription credits, slower)

→ **Ask the user first**: "Want me to cross-check with other models? I can use `multi_ask` (API, fast) or `/multi-llm` (CLI, free with subscription)."

**NEVER auto-invoke Tier 3** — always ask first.

### Tier 4: Structured Debate

For decisions affecting the whole codebase:
- "Should we rewrite X?"
- Technology migration
- Competing design principles

→ Apply `/consensus` methodology (FOR/AGAINST/NEUTRAL).
→ Optionally combine with Tier 3.

## Auto-Trigger Rules

```
Delegatable?        → Tier 0 (call cli_ask or ask, don't spend Opus tokens)
Needs codebase?     → Tier 1 (just answer with tools)
Needs rigor?        → Tier 2 (auto-apply methodology, no asking)
You're unsure?      → Tier 3 (SUGGEST to user, wait for OK)
Big decision?       → Tier 4 (structured debate)
```

## Challenge Check

After any Tier 2+ analysis, briefly ask yourself:
- "What assumption could be wrong?"
- "What would a skeptical senior engineer say?"

If this surfaces a genuine concern, mention it.

## Available CLIs

| CLI | Command | Model | Subscription |
|-----|---------|-------|-------------|
| Codex | `codex exec "..."` | OpenAI | ChatGPT Pro/Max |
| Kimi | `kimi -p "..." --print --final-message-only` | Moonshot | Kimi subscription |
| Gemini | `gemini -p "..."` | Google | AI Studio free tier |
