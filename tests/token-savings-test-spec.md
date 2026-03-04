# Multi-LLM Toolkit: Token Savings Test Specification

**Version**: 1.0.0
**Date**: 2026-03-04
**Purpose**: Prove and quantify Claude Code token savings when offloading work to external CLIs (Codex, Kimi, Gemini) via the multi-llm toolkit.

---

## Table of Contents

1. [Token Counting Methodology](#1-token-counting-methodology)
2. [Test Scenarios](#2-test-scenarios)
   - S1: Security Audit (secaudit)
   - S2: Architecture Decision (consensus + multi-llm)
   - S3: Deep Debugging (debug-deep)
   - S4: Pre-commit Review (precommit)
   - S5: Multi-Perspective Analysis (multi-llm)
3. [Edge Cases: When Offloading Does NOT Save Tokens](#3-edge-cases-when-offloading-does-not-save-tokens)
4. [Expected Savings Summary](#4-expected-savings-summary)
5. [Test Harness Implementation](#5-test-harness-implementation)
6. [Reproducibility Notes](#6-reproducibility-notes)

---

## 1. Token Counting Methodology

### 1.1 What We Measure

For every test, we capture two runs of the same task:

| Run | Description |
|-----|-------------|
| **Baseline** | Claude Code does the entire task itself (no external CLIs) |
| **Toolkit** | Claude Code delegates sub-tasks to external CLIs, then synthesizes |

For each run, record:

| Metric | How to Capture |
|--------|---------------|
| `claude_input_tokens` | From Claude Code's `--output-format stream-json` events: sum all `input_tokens` in `result` messages |
| `claude_output_tokens` | Same source: sum all `output_tokens` in `result` messages |
| `claude_total_tokens` | `claude_input_tokens + claude_output_tokens` |
| `external_cli_wall_time` | Bash `time` wrapper around each CLI invocation |
| `total_wall_time` | End-to-end from prompt to final output |
| `claude_api_cost_usd` | `(input_tokens / 1M * $15) + (output_tokens / 1M * $75)` for Opus |

The key metric is:

```
token_savings_ratio = 1 - (toolkit_claude_total_tokens / baseline_claude_total_tokens)
```

A positive ratio means the toolkit used fewer Claude tokens.

### 1.2 Token Counting Script

Run Claude Code with `--output-format stream-json` and pipe through a counter:

```bash
#!/bin/bash
# usage: ./count-tokens.sh "prompt text" [--plugin-dir path]
PROMPT="$1"
shift

claude -p "$PROMPT" --output-format stream-json "$@" 2>/dev/null | \
  python3 -c "
import sys, json
inp = out = 0
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try:
        obj = json.loads(line)
        if 'usage' in obj:
            inp += obj['usage'].get('input_tokens', 0)
            out += obj['usage'].get('output_tokens', 0)
        elif obj.get('type') == 'result':
            inp += obj.get('input_tokens', 0)
            out += obj.get('output_tokens', 0)
    except json.JSONDecodeError:
        pass
print(json.dumps({
    'input_tokens': inp,
    'output_tokens': out,
    'total_tokens': inp + out,
    'cost_usd': round(inp / 1e6 * 15 + out / 1e6 * 75, 4)
}))
"
```

### 1.3 What Counts as "Claude Tokens"

- Only tokens consumed by the Claude API (Anthropic).
- Tokens consumed by Codex (OpenAI), Kimi (Moonshot), or Gemini (Google) are **external costs** and are tracked separately but NOT included in the savings ratio.
- The thesis is: "for users on a Claude subscription or API budget, offloading work to cheaper/free CLIs reduces Claude spend."

### 1.4 Token Budget Components in Each Approach

**Baseline (Claude-only):**

```
claude_tokens = system_prompt
              + user_prompt
              + tool_calls (Read, Grep, Glob, Bash)
              + tool_results (file contents, grep output)
              + assistant_output (full analysis)
```

**Toolkit (with offloading):**

```
claude_tokens = system_prompt
              + user_prompt
              + prompt_preparation (Read files, craft sub-prompt)        [OVERHEAD]
              + spawn_commands (Bash tool calls for CLI invocation)      [SMALL]
              + cli_output_ingestion (reading CLI responses)             [OVERHEAD]
              + synthesis_output (compare + merge, shorter than full)    [SAVINGS]

external_tokens = codex_tokens + kimi_tokens + gemini_tokens            [NOT COUNTED]
```

The savings come from the fact that Claude does NOT need to:
- Read and process every file for the full analysis (external CLIs do this)
- Generate the full detailed analysis text (external CLIs produce the bulk)
- Claude only writes the synthesis/comparison (much shorter)

---

## 2. Test Scenarios

### Target Codebase

All tests use a consistent target: a medium-sized Express + React project (e.g., `nexus-dashboard` or equivalent with 50-200 source files, 10K-50K LoC).

---

### S1: Security Audit (`/secaudit`)

**Rationale**: Security audits require reading many files and checking each against a 10-category OWASP checklist. This is token-intensive because Claude must read every file and reason about each check.

#### S1-A: Baseline (Claude-only)

```
Prompt: "Perform a full OWASP Top 10 security audit of the server/ directory.
Check all 10 categories. For each finding, cite the exact file and line number.
Provide severity ratings and specific remediation."
```

Expected Claude behavior:
- Glob for all files in `server/` (~30-60 files)
- Read each file (tool call + tool result for each)
- Reason through 10 OWASP categories per file
- Generate findings report

Expected token profile:
| Component | Estimated Tokens |
|-----------|-----------------|
| System prompt | ~2,000 |
| File reads (30 files x ~200 lines avg) | ~90,000 input |
| OWASP reasoning (10 categories x 30 files) | ~15,000 output |
| Findings report | ~3,000 output |
| **Total** | **~110,000** |

#### S1-B: Toolkit (offload to external CLIs)

```
Prompt: "/secaudit server/"
(internally, multi-llm delegates scanning to external CLIs)
```

Offloading strategy — Claude prepares a prompt like:

```
"Here is the source code of server/routes/auth.ts:
<code>
...250 lines...
</code>

Check for OWASP Top 10 violations: A01 (Broken Access Control),
A02 (Cryptographic Failures), A03 (Injection), A07 (Auth Failures).
Cite exact line numbers for each finding."
```

This prompt is sent to Codex and Kimi in parallel. Claude reads the CLI outputs (~500 tokens each) and synthesizes.

Expected token profile:
| Component | Estimated Tokens |
|-----------|-----------------|
| System prompt | ~2,000 |
| File reads (to craft prompts) | ~30,000 input |
| Prompt preparation output | ~5,000 output |
| CLI invocation (Bash tool calls) | ~500 |
| CLI result ingestion | ~3,000 input |
| Synthesis output | ~2,000 output |
| **Total** | **~42,500** |

**Expected savings ratio: ~60%**

The savings are large because the heavy per-file reasoning is offloaded. Claude only reads files once (to embed in prompts), and the detailed OWASP analysis happens externally.

#### S1 Test Matrix

| Test ID | Variant | Files | Expected Baseline | Expected Toolkit | Savings |
|---------|---------|-------|-------------------|------------------|---------|
| S1-1 | Single file (auth.ts) | 1 | ~8,000 | ~5,500 | ~30% |
| S1-2 | One directory (routes/) | 10 | ~45,000 | ~20,000 | ~55% |
| S1-3 | Full server/ | 30+ | ~110,000 | ~42,500 | ~60% |
| S1-4 | Full project | 80+ | ~250,000 | ~85,000 | ~66% |

**Key insight**: Savings scale super-linearly with codebase size because Claude's context window fills with file contents in baseline, but in toolkit mode, that burden is distributed.

---

### S2: Architecture Decision (`/consensus` + `/multi-llm`)

**Rationale**: Architecture decisions require Claude to argue multiple perspectives (FOR, AGAINST, NEUTRAL). With multi-llm, each perspective can be assigned to a different CLI, so Claude does not need to generate all three stances.

#### S2-A: Baseline (Claude-only `/consensus`)

```
Prompt: "Should we migrate our REST API to GraphQL? We have 25 endpoints,
3 mobile clients, and a React dashboard. Current pain points: over-fetching
on mobile, 6 BFF endpoints just for aggregation. Consider performance,
team learning curve, and migration cost."
```

Expected Claude behavior:
- Read relevant route files to understand current API
- Generate Phase 1 (Neutral Assessment): ~800 tokens
- Generate Phase 2 (FOR argument): ~1,200 tokens
- Generate Phase 3 (AGAINST argument): ~1,200 tokens
- Generate Phase 4 (Pragmatist): ~800 tokens
- Generate Phase 5 (Verdict): ~500 tokens

Expected token profile:
| Component | Estimated Tokens |
|-----------|-----------------|
| System prompt + command template | ~2,500 |
| Codebase reads (routes, schema) | ~15,000 input |
| Multi-phase reasoning output | ~4,500 output |
| **Total** | **~22,000** |

#### S2-B: Toolkit (offload perspectives to CLIs)

```
Prompt: "/multi-llm Should we migrate our REST API to GraphQL?
We have 25 endpoints, 3 mobile clients, and a React dashboard.
Pain points: over-fetching on mobile, 6 BFF aggregation endpoints."
```

Offloading strategy:
- Claude reads key files, crafts a self-contained prompt
- Codex argues FOR GraphQL
- Kimi argues AGAINST GraphQL
- Claude provides the NEUTRAL/Pragmatist perspective + synthesis

Expected token profile:
| Component | Estimated Tokens |
|-----------|-----------------|
| System prompt + command template | ~2,500 |
| Codebase reads (to embed in prompt) | ~8,000 input |
| Prompt crafting output | ~2,000 output |
| CLI result ingestion (2 CLIs) | ~3,000 input |
| Synthesis + verdict output | ~1,500 output |
| **Total** | **~17,000** |

**Expected savings ratio: ~23%**

Savings are moderate because the consensus command already produces relatively compact output. The main saving is that Claude does not need to generate the FOR and AGAINST arguments — those are offloaded.

#### S2 Test Matrix

| Test ID | Variant | Expected Baseline | Expected Toolkit | Savings |
|---------|---------|-------------------|------------------|---------|
| S2-1 | Pure reasoning (no code) | ~12,000 | ~10,000 | ~17% |
| S2-2 | With codebase context | ~22,000 | ~17,000 | ~23% |
| S2-3 | Complex (3+ alternatives) | ~30,000 | ~20,000 | ~33% |

---

### S3: Deep Debugging (`/debug-deep` + external hypothesis investigation)

**Rationale**: Debug-deep forms 3+ hypotheses and investigates each sequentially. Each investigation requires reading files, tracing execution paths, and checking git history. With multi-llm, each hypothesis can be investigated by a different CLI in parallel.

#### S3-A: Baseline (Claude-only)

```
Prompt: "Users report that WebSocket connections drop after exactly 30 seconds
of inactivity. The client sends pings every 25s but the server still disconnects.
Error: 'connection timeout'. Debug this systematically."
```

Expected Claude behavior:
- Phase 1: Understand symptom (read config, WS handler)
- Phase 2: Form 3 hypotheses
- Phase 3: Investigate each — read WS server code, proxy config, timeout settings
- Phase 4: Root cause
- Phase 5: Fix recommendation

Each hypothesis investigation reads 2-5 files and produces analysis:

Expected token profile:
| Component | Estimated Tokens |
|-----------|-----------------|
| System prompt + command template | ~2,500 |
| File reads (3 hypotheses x 3 files avg) | ~27,000 input |
| Hypothesis tracking + reasoning | ~6,000 output |
| Root cause + fix | ~1,500 output |
| **Total** | **~37,000** |

#### S3-B: Toolkit (parallel hypothesis investigation)

```
Prompt: "/debug-deep WebSocket connections drop after 30s of inactivity
despite 25s ping interval. Error: 'connection timeout'."
```

Offloading strategy:
- Claude forms hypotheses (Phase 1-2) — this is cheap
- Each hypothesis prompt is crafted with relevant code embedded:
  - Codex investigates H1 (server-side timeout config)
  - Kimi investigates H2 (reverse proxy / load balancer timeout)
  - Claude investigates H3 (client ping implementation)
- Claude synthesizes findings from all sources

Expected token profile:
| Component | Estimated Tokens |
|-----------|-----------------|
| System prompt + command template | ~2,500 |
| Initial reads (to form hypotheses) | ~6,000 input |
| Hypothesis formation output | ~1,500 output |
| Prompt preparation (embed code for CLIs) | ~4,000 output |
| CLI result ingestion (2 CLIs) | ~4,000 input |
| Own H3 investigation (1 hypothesis) | ~5,000 input + ~1,500 output |
| Synthesis + root cause | ~2,000 output |
| **Total** | **~26,500** |

**Expected savings ratio: ~28%**

The savings come from parallel investigation — Claude only deeply investigates 1 of 3 hypotheses instead of all 3.

#### S3 Test Matrix

| Test ID | Variant | Hypotheses | Expected Baseline | Expected Toolkit | Savings |
|---------|---------|------------|-------------------|------------------|---------|
| S3-1 | Simple (2 hypotheses) | 2 | ~22,000 | ~18,000 | ~18% |
| S3-2 | Standard (3 hypotheses) | 3 | ~37,000 | ~26,500 | ~28% |
| S3-3 | Complex (5 hypotheses) | 5 | ~58,000 | ~34,000 | ~41% |
| S3-4 | With git bisect needed | 3+ | ~50,000 | ~32,000 | ~36% |

**Key insight**: Savings scale linearly with number of hypotheses because each additional hypothesis is a full investigation offloaded.

---

### S4: Pre-commit Review (`/precommit`)

**Rationale**: Pre-commit reviews must check every staged file for correctness, regressions, security, and quality. With many changed files, this is token-intensive.

#### S4-A: Baseline (Claude-only)

```
Prompt: "/precommit"
(reviews 8 staged files, ~400 lines of diff)
```

Expected Claude behavior:
- `git diff --cached --stat` — see changed files
- `git diff --cached` — read full diff (~400 lines)
- For each file: check correctness, regressions, security, quality
- Cross-file impact analysis
- Generate findings report

Expected token profile:
| Component | Estimated Tokens |
|-----------|-----------------|
| System prompt + command template | ~2,000 |
| Git diff output ingestion | ~6,000 input |
| Per-file analysis (8 files) | ~8,000 output |
| Cross-file analysis | ~1,000 output |
| Summary | ~500 output |
| **Total** | **~17,500** |

#### S4-B: Toolkit (offload file-by-file review)

```
Prompt: "/precommit"
(with multi-llm offloading of individual file reviews)
```

Offloading strategy:
- Claude gets the diff, splits by file
- Files 1-3 sent to Codex for review
- Files 4-6 sent to Kimi for review
- Files 7-8 reviewed by Claude directly
- Claude does cross-file analysis + synthesis

Expected token profile:
| Component | Estimated Tokens |
|-----------|-----------------|
| System prompt + command template | ~2,000 |
| Git diff ingestion | ~6,000 input |
| Prompt splitting + formatting | ~2,000 output |
| CLI result ingestion (2 CLIs) | ~3,000 input |
| Own review (2 files) | ~2,000 output |
| Cross-file + synthesis | ~1,500 output |
| **Total** | **~16,500** |

**Expected savings ratio: ~6%**

**Note**: Savings are minimal for small diffs because the overhead of preparing prompts for external CLIs roughly equals the savings from not analyzing those files. Pre-commit is a **break-even** scenario for small changes.

#### S4 Test Matrix

| Test ID | Variant | Files Changed | Diff Lines | Expected Baseline | Expected Toolkit | Savings |
|---------|---------|---------------|------------|-------------------|------------------|---------|
| S4-1 | Tiny (1-2 files) | 2 | ~50 | ~6,000 | ~7,500 | **-25%** (overhead) |
| S4-2 | Small (3-5 files) | 5 | ~200 | ~12,000 | ~12,000 | ~0% (break-even) |
| S4-3 | Medium (8-12 files) | 10 | ~500 | ~22,000 | ~18,000 | ~18% |
| S4-4 | Large (20+ files) | 25 | ~1,500 | ~55,000 | ~30,000 | ~45% |

**Key insight**: Pre-commit offloading only pays off beyond ~8 changed files. Below that threshold, prompt preparation overhead exceeds savings.

---

### S5: Full Multi-LLM Analysis (`/multi-llm`)

**Rationale**: This is the core command. Claude acts as both participant and judge. The question is how much Claude token budget is saved by having external CLIs produce independent analyses instead of Claude generating all perspectives.

#### S5-A: Baseline (Claude-only equivalent)

```
Prompt: "Analyze this project from 4 perspectives:
1. Architecture quality (entry points, data flow, risks)
2. Bug hunting (null errors, race conditions, error handling)
3. Security (OWASP Top 10)
4. Performance (bottlenecks, scaling concerns)
Be specific with file paths and line numbers."
```

Expected Claude behavior:
- Read 20-40 files across the project
- Produce 4 comprehensive analyses
- Each analysis: 15-25 lines of detailed findings

Expected token profile:
| Component | Estimated Tokens |
|-----------|-----------------|
| System prompt | ~2,000 |
| File reads (25 files avg) | ~75,000 input |
| 4 analyses x ~2,000 tokens each | ~8,000 output |
| Comparison/summary | ~1,000 output |
| **Total** | **~86,000** |

#### S5-B: Toolkit (`/multi-llm`)

```
Prompt: "/multi-llm Analyze this project's architecture quality, potential bugs,
security posture, and performance. Be specific with file paths."
```

Offloading strategy:
- Claude reads key files, embeds code in a shared prompt (~2,000 tokens)
- Codex does architecture + bug analysis
- Kimi does security + performance analysis
- Claude does its own analysis (architecture focus)
- Claude synthesizes comparison table + consensus + disagreements

Expected token profile:
| Component | Estimated Tokens |
|-----------|-----------------|
| System prompt + command template | ~3,000 |
| File reads (to embed in prompt) | ~20,000 input |
| Prompt crafting output | ~3,000 output |
| CLI spawning (Bash tool calls) | ~500 |
| CLI result ingestion (2 CLIs x ~1,500) | ~3,000 input |
| Own analysis (1 perspective, not 4) | ~2,000 output |
| Synthesis + comparison table | ~2,500 output |
| **Total** | **~34,000** |

**Expected savings ratio: ~60%**

This is where the toolkit shines most. Instead of Claude producing 4 full perspectives, it produces 1 perspective + a synthesis. The bulk of the analytical output is generated externally.

#### S5 Test Matrix

| Test ID | Variant | CLIs Available | Expected Baseline | Expected Toolkit | Savings |
|---------|---------|----------------|-------------------|------------------|---------|
| S5-1 | 1 CLI (Codex only) | 1 | ~86,000 | ~55,000 | ~36% |
| S5-2 | 2 CLIs (Codex + Kimi) | 2 | ~86,000 | ~34,000 | ~60% |
| S5-3 | 3 CLIs (all) | 3 | ~86,000 | ~28,000 | ~67% |
| S5-4 | Trade-off decision | 2 | ~30,000 | ~17,000 | ~43% |

---

## 3. Edge Cases: When Offloading Does NOT Save Tokens

### E1: Small, Focused Tasks (Negative Savings)

**Scenario**: Simple question that Claude can answer in <500 output tokens.

```
Prompt: "/multi-llm What does the `shouldFallback()` function do?"
```

| Component | Baseline | Toolkit |
|-----------|----------|---------|
| System prompt | 2,000 | 3,000 (larger with multi-llm template) |
| File read | 1,000 | 1,000 |
| Analysis output | 500 | 500 (prompt crafting) |
| CLI overhead | 0 | 2,000 (spawn + ingest) |
| Synthesis | 0 | 800 |
| **Total** | **3,500** | **7,300** |

**Savings: -109% (toolkit costs 2x more)**

**Why**: The overhead of preparing prompts, spawning CLIs, and synthesizing results exceeds the savings when the original task is trivial. The analysis-router skill correctly identifies this as Tier 1 and should NOT invoke multi-llm.

### E2: Highly Context-Dependent Tasks (Marginal Savings)

**Scenario**: Bug that requires deep understanding of internal state flow that external CLIs cannot access.

```
Prompt: "/multi-llm Why does the broadcastToSession() function
sometimes send messages to the wrong session?"
```

Problem: External CLIs need the full codebase context embedded in the prompt. If the bug spans 10+ files with complex interdependencies, the prompt preparation alone consumes as many tokens as just doing the analysis.

| Component | Baseline | Toolkit |
|-----------|----------|---------|
| System prompt | 2,000 | 3,000 |
| File reads | 30,000 | 30,000 (same — must read to embed) |
| Embedding code in prompt | 0 | 8,000 (output to write prompt) |
| CLI ingestion | 0 | 4,000 |
| Analysis output | 5,000 | 2,500 (synthesis only) |
| **Total** | **37,000** | **47,500** |

**Savings: -28% (toolkit costs more)**

**Why**: Claude had to read the same files AND re-output their contents into the prompt for external CLIs. This "double handling" of file content erases savings.

### E3: Prompt Formatting Overhead

Each external CLI invocation has fixed overhead:

| Overhead Component | Estimated Tokens |
|--------------------|-----------------|
| `which codex/kimi/gemini` detection | ~200 |
| Temp file creation (`cat > /tmp/...`) | ~300 |
| CLI invocation bash command | ~150 |
| Agent tool call wrapper | ~200 |
| CLI output parsing + error handling | ~300 |
| Cleanup (`rm -f`) | ~50 |
| **Per-CLI overhead** | **~1,200** |

With 3 CLIs: ~3,600 tokens of pure overhead.

**Break-even point**: Offloading only saves tokens when the offloaded work would have cost Claude >1,200 tokens per CLI. For analysis tasks, this threshold is easily met (typical analysis = 2,000-5,000 output tokens). For simple questions, it is not.

### E4: CLI Failure / Retry Scenarios

When an external CLI fails (timeout, API error, malformed output), Claude must:
1. Detect the failure (~200 tokens)
2. Decide whether to retry or do it itself (~300 tokens)
3. If self-recovery: do the analysis anyway (~full baseline cost)

Worst case: CLI fails silently, produces garbage output. Claude ingests garbage (wasted input tokens), then redoes the analysis itself.

| Scenario | Extra Token Cost |
|----------|-----------------|
| Clean failure (exit code != 0) | +700 (detect + fallback to self) |
| Timeout (120s) | +700 + wasted wall time |
| Garbage output | +2,000 (ingest garbage) + full redo |
| All CLIs fail | Full baseline + 3,600 overhead = **-10%** |

### E5: Already-Cached Context

When Claude has already read files in the current conversation (e.g., previous questions about the same codebase), the baseline is cheaper because cached input tokens are discounted. But the toolkit still needs to embed code in prompts for external CLIs that have no cache.

```
Savings_with_cache = savings_without_cache - cache_discount_lost
```

Anthropic's prompt caching gives ~90% discount on cached input tokens. If 50,000 tokens of file reads are cached, baseline cost drops significantly, reducing the relative savings of offloading.

---

## 4. Expected Savings Summary

### By Scenario

| Scenario | Best Case Savings | Typical Savings | Worst Case | Key Factor |
|----------|------------------|-----------------|------------|------------|
| S1: Security Audit | 66% | 55% | 30% | Number of files |
| S2: Architecture Decision | 33% | 23% | 10% | Complexity of alternatives |
| S3: Deep Debug | 41% | 28% | 15% | Number of hypotheses |
| S4: Pre-commit Review | 45% | 10% | -25% | Number of changed files |
| S5: Multi-LLM Analysis | 67% | 55% | 36% | Number of CLIs available |

### By Codebase Size

| Codebase Size | Files Read (Baseline) | Typical Savings |
|---------------|----------------------|-----------------|
| Tiny (<10 files) | 5-10 | 0-10% (often negative) |
| Small (10-30 files) | 10-20 | 15-30% |
| Medium (30-100 files) | 20-40 | 30-55% |
| Large (100+ files) | 40-80 | 50-67% |

### When to Offload (Decision Matrix)

```
                         Task Complexity
                    Low          Medium         High
                 +-----------+-----------+-----------+
Codebase    Low  | NEVER     | MAYBE     | YES       |
Size      Med   | MAYBE     | YES       | YES       |
          High  | YES       | YES       | ALWAYS    |
                 +-----------+-----------+-----------+

NEVER  = Offloading costs more than baseline (overhead > savings)
MAYBE  = Break-even zone; depends on number of CLIs and task structure
YES    = Clear savings (>20%)
ALWAYS = Maximum savings (>50%)
```

---

## 5. Test Harness Implementation

### 5.1 Directory Structure

```
tests/
  token-savings-test-spec.md      (this file)
  count-tokens.sh                 (token counting wrapper)
  run-scenario.sh                 (runs baseline + toolkit for one scenario)
  scenarios/
    s1-secaudit-baseline.txt      (baseline prompt)
    s1-secaudit-toolkit.txt       (toolkit prompt)
    s2-consensus-baseline.txt
    s2-consensus-toolkit.txt
    s3-debug-baseline.txt
    s3-debug-toolkit.txt
    s4-precommit-baseline.txt
    s4-precommit-toolkit.txt
    s5-multi-llm-baseline.txt
    s5-multi-llm-toolkit.txt
  results/
    YYYY-MM-DD-results.json       (auto-generated)
```

### 5.2 Scenario Runner (Pseudocode)

```bash
#!/bin/bash
# run-scenario.sh <scenario-id> <target-dir>
# Example: ./run-scenario.sh s1 ~/Projects/nexus-dashboard

SCENARIO=$1
TARGET=$2
PLUGIN_DIR="/tmp/claude-code-multi-llm"
RESULTS_DIR="tests/results"
DATE=$(date +%Y-%m-%d)

mkdir -p "$RESULTS_DIR"

echo "=== Running Baseline ==="
BASELINE=$(cd "$TARGET" && bash tests/count-tokens.sh \
  "$(cat tests/scenarios/${SCENARIO}-baseline.txt)" \
  2>&1)

echo "=== Running Toolkit ==="
TOOLKIT=$(cd "$TARGET" && bash tests/count-tokens.sh \
  "$(cat tests/scenarios/${SCENARIO}-toolkit.txt)" \
  --plugin-dir "$PLUGIN_DIR" \
  2>&1)

# Calculate savings
python3 -c "
import json, sys
baseline = json.loads('$BASELINE')
toolkit = json.loads('$TOOLKIT')
savings = 1 - (toolkit['total_tokens'] / baseline['total_tokens'])
print(json.dumps({
    'scenario': '$SCENARIO',
    'date': '$DATE',
    'target': '$TARGET',
    'baseline': baseline,
    'toolkit': toolkit,
    'savings_ratio': round(savings, 4),
    'savings_pct': f'{savings*100:.1f}%',
    'cost_saved_usd': round(baseline['cost_usd'] - toolkit['cost_usd'], 4)
}, indent=2))
" > "$RESULTS_DIR/${DATE}-${SCENARIO}.json"

cat "$RESULTS_DIR/${DATE}-${SCENARIO}.json"
```

### 5.3 Test Prompts

#### S1: Security Audit

**Baseline** (`s1-secaudit-baseline.txt`):
```
Perform a full OWASP Top 10 security audit of the server/ directory.
Check all 10 categories systematically. For each finding, cite the exact
file path and line number. Provide severity ratings (CRITICAL/HIGH/MEDIUM)
and specific remediation steps. Do not skip any category.
```

**Toolkit** (`s1-secaudit-toolkit.txt`):
```
/secaudit server/
```

(The `/secaudit` command template handles the structured approach. When combined with analysis-router Tier 3 for auth-sensitive code, it will suggest multi-llm offloading.)

#### S2: Architecture Decision

**Baseline** (`s2-consensus-baseline.txt`):
```
Should we migrate from Express to Fastify for our API server?
Consider performance benchmarks, middleware ecosystem, TypeScript support,
migration effort, and team learning curve. Read the current server code
to understand our middleware usage. Argue FOR, then AGAINST, then provide
a pragmatic synthesis and a decisive verdict.
```

**Toolkit** (`s2-consensus-toolkit.txt`):
```
/multi-llm Should we migrate from Express to Fastify for our API server?
Consider performance benchmarks, middleware ecosystem, TypeScript support,
migration effort, and team learning curve.
```

#### S3: Deep Debug

**Baseline** (`s3-debug-baseline.txt`):
```
Debug this issue: The /api/sessions endpoint returns an empty array even though
sessions.json contains 5 active sessions. The endpoint worked yesterday.
Recent changes: refactored route registration in server/index.ts.
Form at least 3 hypotheses, investigate each one by reading the relevant code,
and identify the root cause with file:line references.
```

**Toolkit** (`s3-debug-toolkit.txt`):
```
/debug-deep The /api/sessions endpoint returns an empty array even though
sessions.json contains 5 active sessions. The endpoint worked yesterday.
Recent changes: refactored route registration in server/index.ts.
```

(When Claude forms hypotheses, it can offload individual hypothesis investigation to external CLIs via Agent sub-tasks.)

#### S4: Pre-commit Review

**Baseline** (`s4-precommit-baseline.txt`):
```
Review all staged changes for correctness, regressions, security issues,
and code quality. Check for logic errors, null handling, broken imports,
injection vectors, hardcoded secrets, and debug code. Cite file:line for
every finding. Provide a BLOCK/WARN/OK verdict.
```

**Toolkit** (`s4-precommit-toolkit.txt`):
```
/precommit
```

#### S5: Multi-LLM Full Analysis

**Baseline** (`s5-multi-llm-baseline.txt`):
```
Analyze this project comprehensively from 4 perspectives:
1. Architecture: main entry points, data flow, top 3 structural risks
2. Bugs: potential null errors, race conditions, error handling gaps
3. Security: OWASP Top 10 violations with file:line references
4. Performance: bottlenecks, scaling concerns, optimization opportunities
For each perspective, provide at least 5 specific findings with file paths.
```

**Toolkit** (`s5-multi-llm-toolkit.txt`):
```
/multi-llm Review this project's architecture quality, potential bugs,
security posture, and performance characteristics. Be specific with
file paths and line numbers.
```

---

## 6. Reproducibility Notes

### 6.1 Variables That Affect Results

| Variable | Impact | Mitigation |
|----------|--------|------------|
| Model version | Different models produce different output lengths | Pin model version in test metadata |
| Temperature | Higher temp = longer/shorter responses unpredictably | Use `temperature: 0` if API allows |
| Codebase state | File changes between runs affect reads | Pin to a specific git commit |
| Prompt caching | Repeated runs on same codebase get cache discount | Run baseline and toolkit in separate sessions |
| CLI availability | Missing CLIs change offloading strategy | Record which CLIs were available |
| CLI response time | Timeouts trigger fallback (extra tokens) | Set consistent 120s timeout |
| Network latency | Affects wall time but not tokens | Record wall time separately |

### 6.2 Statistical Validity

Each scenario should be run **at minimum 3 times** to account for output variance. Report:
- Mean savings ratio
- Standard deviation
- Min/max range

Token counts may vary 10-20% between runs due to non-deterministic model output. A savings claim is valid if the mean exceeds the overhead threshold (1,200 tokens per CLI) consistently.

### 6.3 Cost Model Assumptions (March 2026)

| Model | Input ($/1M tokens) | Output ($/1M tokens) |
|-------|---------------------|----------------------|
| Claude Opus 4 | $15.00 | $75.00 |
| Claude Sonnet 4 | $3.00 | $15.00 |
| GPT-4o (Codex) | $2.50 | $10.00 |
| Kimi k2 | ~$1.00 | ~$4.00 |
| Gemini 2.5 Pro | $1.25 | $10.00 |

The cost arbitrage is significant: offloading $75/M output work from Claude Opus to Codex ($10/M) or Kimi ($4/M) represents a 7-18x cost reduction per offloaded token, in addition to the token savings on the Claude side.

### 6.4 Validation Checklist

For each test run, verify:

- [ ] Both runs target the same git commit
- [ ] Both runs start from a fresh Claude Code session (no cached context)
- [ ] Token counts are captured from `stream-json` output, not estimated
- [ ] External CLI outputs are captured and stored for quality comparison
- [ ] Wall time is recorded for both approaches
- [ ] Any CLI failures are logged with error details
- [ ] The toolkit run's final output quality is compared against baseline (savings are meaningless if quality drops)

### 6.5 Quality Gate

Token savings are only meaningful if the toolkit output maintains acceptable quality. For each scenario, score both outputs on:

| Quality Criterion | Weight | Threshold |
|-------------------|--------|-----------|
| Accuracy (findings are real) | 30% | >80% of baseline |
| Completeness (nothing major missed) | 30% | >75% of baseline |
| Specificity (file:line references) | 20% | >70% of baseline |
| Actionability (concrete fixes) | 20% | >80% of baseline |

If toolkit output scores below threshold on any criterion, the savings claim is invalidated for that scenario — cheaper is not better if it misses critical findings.

---

## Appendix A: Token Savings Formula Reference

```
savings_ratio = 1 - (T_toolkit / T_baseline)

Where:
  T_baseline = SP + UP + FR_b + AO_b
  T_toolkit  = SP + UP + FR_t + PP + CI + SO

  SP   = system prompt tokens (constant, cancels out)
  UP   = user prompt tokens (constant, cancels out)
  FR_b = file reads in baseline (all files, full analysis)
  FR_t = file reads in toolkit (subset, for prompt preparation)
  AO_b = analysis output in baseline (full multi-perspective)
  PP   = prompt preparation output (crafting prompts for CLIs)
  CI   = CLI output ingestion (reading external results)
  SO   = synthesis output (comparison + verdict, shorter than AO_b)

Net savings come from:
  (FR_b - FR_t) + (AO_b - PP - SO) - CI > 0
   ^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^   ^^^
   fewer file       less Claude output    overhead
   reads needed     (synthesis < full)    cost
```

## Appendix B: Quick Reference — Offloading ROI by Command

| Command | Offloads What | To Whom | ROI Threshold | Sweet Spot |
|---------|---------------|---------|---------------|------------|
| `/secaudit` | Per-file OWASP scanning | Codex, Kimi | >5 files | 20+ files, auth-heavy code |
| `/multi-llm` | Independent perspective analysis | All CLIs | Always (by design) | Complex trade-off decisions |
| `/consensus` | FOR/AGAINST arguments | Codex (FOR), Kimi (AGAINST) | >3 alternatives | Architecture migration debates |
| `/debug-deep` | Hypothesis investigation | 1 CLI per hypothesis | >2 hypotheses | Concurrency bugs, multi-file issues |
| `/precommit` | File-by-file review | Batch to CLIs | >8 files changed | Large refactors, 20+ file commits |
| `/thinkdeep` | Edge case enumeration | Codex, Kimi | Rarely worth it | Only if >5 perspectives needed |
| `/planner` | Codebase recon sub-tasks | Codex | >10 files to survey | Greenfield features in large codebases |
| `/challenge` | Counter-arguments | Kimi (natural contrarian) | Rarely worth it | High-stakes irreversible decisions |
| `/apilookup` | Documentation search | Gemini (web access) | Always worth it | Version migration questions |
