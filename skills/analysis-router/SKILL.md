---
name: analysis-router
description: This skill should be used when the user asks to "review code", "analyze architecture", "debug a bug", "audit security", "make a technical decision", "compare approaches", "plan a feature", or when the task involves code quality assessment, architectural trade-offs, security concerns, or complex debugging. It determines the right analysis depth and whether cross-model verification is needed.
version: 1.0.0
---

# Analysis Router

Determines the right analysis depth for each task and whether to invoke multi-LLM cross-checking.

## Decision Framework

### Tier 1: Single-Model (Claude only) — DEFAULT

Use for most tasks. No special methodology needed.

- Clear question with obvious answer
- Simple bug fix or typo
- Code style, formatting, naming
- Straightforward feature with known patterns
- Reading/explaining code
- Speed matters more than thoroughness

→ Just answer directly.

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

### Tier 3: Multi-LLM Cross-Check (external CLIs)

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

→ **Ask the user first**: "This looks like a good case for multi-LLM cross-check. Want me to run `/multi-llm` to get Codex and Kimi perspectives?"

**NEVER auto-invoke Tier 3** — external CLIs cost 15-30s + API tokens.

### Tier 4: Structured Debate

For decisions affecting the whole codebase:
- "Should we rewrite X?"
- Technology migration
- Competing design principles

→ Apply `/consensus` methodology (FOR/AGAINST/NEUTRAL).
→ Optionally combine with Tier 3.

## Auto-Trigger Rules

```
Simple/obvious?     → Tier 1 (just answer)
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

| CLI | Command | Model |
|-----|---------|-------|
| Codex | `codex exec "..."` | OpenAI |
| Kimi | `kimi -p "..." --print --final-message-only` | Moonshot |
| Gemini | `gemini -p "..."` | Google (may not be installed) |
