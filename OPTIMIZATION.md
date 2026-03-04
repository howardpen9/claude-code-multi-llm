# Optimization Roadmap

Improvement opportunities inspired by [Rig](https://github.com/0xPlaygrounds/rig) (Rust LLM framework, 6200+ stars) agentic design patterns.

## Key Patterns from Rig

| Rig Pattern | Description | Applicable To |
|-------------|-------------|---------------|
| Agent-as-Tool | Inner agent acts as tool for outer agent | analysis-router → commands delegation |
| Op Composability | Reusable atomic operations composed in pipelines | Shared methodology fragments across commands |
| `parallel!` Macro | Same input dispatched to multiple Ops in parallel | `/consensus`, `/thinkdeep` phase parallelization |
| Prompt Routing | Structured classification → route to specialist | analysis-router tier classification |
| Evaluator-Optimizer | Output → evaluate → feedback loop | Self-check after Tier 2+ analysis |
| Orchestrator-Worker | Central coordinator delegates to sub-agents | Composite multi-command workflows |

## Recommendations

### P0 — High Impact, Low Effort

#### 1. Structured Classification in analysis-router

**Problem**: The router is a static lookup table. Claude must pattern-match free text against scenario descriptions.

**Rig Inspiration**: Prompt Routing pattern — classify input into structured categories before routing.

**Change**: Add explicit decision steps to `skills/analysis-router/SKILL.md`:

```markdown
## Step 0: Classify

Before routing, answer these 4 questions:
1. Is this a YES/NO or simple factual question? → Tier 1
2. Does it involve security/debugging/planning/review? → Tier 2 + pick command
3. Am I genuinely uncertain after initial analysis? → Tier 3
4. Does this affect entire codebase architecture? → Tier 4

Output: Tier [1/2/3/4] + Command [if Tier 2]
```

#### 2. Extract Shared Methodology Fragments

**Problem**: 7 of 9 commands repeat similar patterns (confidence tracking, code-recon, git context).

**Rig Inspiration**: `Op` trait — define once, reuse across pipelines.

**Duplicated patterns found**:

| Fragment | Appears In | Current State |
|----------|-----------|---------------|
| Confidence scale (`exploring → low → medium → high → certain`) | `thinkdeep`, `debug-deep` | Defined twice, slightly different wording |
| "Read code before concluding" prerequisite | 7/9 commands | Each uses different phrasing |
| Git context gathering (`git log`, `git diff`) | `debug-deep`, `precommit`, `secaudit` | Each defines different git commands |

**Change**: Standardize wording. Each command references a canonical scale rather than redefining:

```markdown
# Before (in thinkdeep.md) — 5 lines describing confidence levels
# Before (in debug-deep.md) — 4 lines describing same thing differently

# After (both files):
Confidence: exploring → low → medium → high → certain
```

### P1 — Medium Impact

#### 3. Self-Check Feedback Loop

**Problem**: All commands are single-pass — no quality validation.

**Rig Inspiration**: Evaluator-Optimizer pattern.

**Change**: Add 3-line self-check to `thinkdeep`, `debug-deep`, `secaudit`:

```markdown
## Self-Check
- Did I cite actual file:line, or reason abstractly? If abstract → go read the code.
- Is every claim backed by evidence? If not → lower confidence.
- What would a skeptical senior engineer challenge?
```

#### 4. Explicit Delegation in analysis-router

**Problem**: Tier 2 says "Apply the command's methodology inline" — Claude must reconstruct the methodology from memory.

**Rig Inspiration**: Agent-as-Tool — explicitly invoke inner agent.

**Change**: Router should tell Claude to USE the command, not paraphrase it:

```markdown
# Before:
Tier 2: Apply the command's methodology inline.

# After:
Tier 2: Apply the EXACT process from the matched command.
        State: "Applying /debug-deep methodology" before proceeding.
```

### P2 — Future Improvements

#### 5. Parallel Phase Execution

**Problem**: `/consensus` runs FOR → AGAINST → NEUTRAL sequentially. `/thinkdeep` runs 4 angles sequentially. These phases are independent.

**Rig Inspiration**: `parallel!` macro — dispatch same input to multiple Ops concurrently.

**Change**: Add parallelization hint to commands:

```markdown
# In consensus.md:
OPTIMIZATION: Phases 2-4 (FOR/AGAINST/NEUTRAL) are independent.
Use Agent tool to run all three in parallel when possible.
```

#### 6. Composite Command Pipeline

**Problem**: No built-in way to chain commands (e.g., `secaudit` → `debug-deep` → `planner`).

**Rig Inspiration**: Orchestrator-Worker pattern.

**Change**: Document in analysis-router that compound tasks can chain methodologies:

```markdown
## Compound Analysis
If a task spans multiple domains (e.g., "audit and fix"):
1. Identify relevant commands (secaudit → debug-deep → planner)
2. Run sequentially, passing findings forward
3. Produce unified report
```

#### 7. Output Pattern Standardization

**Problem**: 9 commands define similar output structures independently.

**Three archetypes identified**:

| Pattern | Commands | Structure |
|---------|----------|-----------|
| Analysis | thinkdeep, debug-deep, secaudit, precommit | Header → Findings + Severity → Confidence → Recommendations |
| Debate | consensus, challenge | Header → Stances → Synthesis → Verdict |
| Tool | multi-llm, apilookup, planner | Header → Data/Results → Comparison → Summary |

Naming these patterns reduces cognitive overhead for Claude.

## Priority Matrix

| Priority | Recommendation | Impact | Effort |
|----------|---------------|--------|--------|
| **P0** | #1 Structured classification | All auto-routing improved | Add 5 lines to SKILL.md |
| **P0** | #2 Shared fragments | 7/9 commands simplified | Edit wording in each |
| **P1** | #3 Self-check loop | Analysis quality up | Add 3 lines to 3 commands |
| **P1** | #4 Explicit delegation | Router reliability up | Reword router section |
| **P2** | #5 Parallel phases | Speed + token savings | Add hint lines |
| **P2** | #6 Composite pipeline | Complex task support | Add section to router |
| **P3** | #7 Output patterns | Cognitive overhead down | Add pattern labels |

## References

- [Rig GitHub](https://github.com/0xPlaygrounds/rig) — Rust LLM framework
- [Rig Agentic Design Patterns](https://dev.to/joshmo_dev/implementing-design-patterns-for-agentic-ai-with-rig-rust-1o71)
- [Rig Pipelines Docs](https://docs.rig.rs/docs/concepts/chains)
- [Agent-as-Tool Example](https://github.com/0xPlaygrounds/rig/blob/main/rig/rig-core/examples/agent_with_agent_tool.rs)
