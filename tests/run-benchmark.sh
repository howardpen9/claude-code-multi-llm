#!/bin/bash
# run-benchmark.sh — Measure actual token savings: baseline (Claude-only) vs toolkit (multi-llm)
# Usage: ./run-benchmark.sh [scenario] [target-dir]
# Scenarios: s1-secaudit, s2-consensus, s3-debug, s4-precommit, s5-multi-llm
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="$SCRIPT_DIR/results"
DATE=$(date +%Y-%m-%d)
SCENARIO="${1:-s5-multi-llm}"
TARGET="${2:-$(pwd)}"

mkdir -p "$RESULTS_DIR"

# ─── Token Counter ────────────────────────────────────────────

count_tokens() {
  local prompt="$1"
  shift

  # Check if claude CLI is available
  if ! command -v claude &>/dev/null; then
    echo '{"error": "claude CLI not found", "input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "cost_usd": 0}'
    return 1
  fi

  claude -p "$prompt" --output-format stream-json "$@" 2>/dev/null | \
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
}

# ─── Scenario Prompts ─────────────────────────────────────────

declare -A BASELINE_PROMPTS
declare -A TOOLKIT_PROMPTS

BASELINE_PROMPTS[s1-secaudit]="Perform a full OWASP Top 10 security audit of the server/ directory. Check all 10 categories. For each finding, cite exact file:line. Severity: CRITICAL/HIGH/MEDIUM."
TOOLKIT_PROMPTS[s1-secaudit]="/secaudit server/"

BASELINE_PROMPTS[s2-consensus]="Should we migrate from Express to Fastify? Consider performance, middleware ecosystem, TypeScript support, migration effort, team learning curve. Argue FOR, then AGAINST, then synthesize a verdict."
TOOLKIT_PROMPTS[s2-consensus]="/multi-llm Should we migrate from Express to Fastify? Consider performance, middleware, TypeScript, migration cost, learning curve."

BASELINE_PROMPTS[s3-debug]="Debug: The /api/sessions endpoint returns empty array though sessions.json has 5 active sessions. Worked yesterday. Recent change: refactored route registration. Form 3+ hypotheses, investigate each, find root cause with file:line."
TOOLKIT_PROMPTS[s3-debug]="/debug-deep /api/sessions returns empty array though sessions.json has data. Worked yesterday. Recent change: refactored route registration in server/index.ts."

BASELINE_PROMPTS[s4-precommit]="Review all staged changes for correctness, regressions, security, quality. Check logic errors, null handling, injection, secrets, debug code. Cite file:line for every finding. Verdict: BLOCK/WARN/OK."
TOOLKIT_PROMPTS[s4-precommit]="/precommit"

BASELINE_PROMPTS[s5-multi-llm]="Analyze this project from 4 perspectives: (1) Architecture quality, (2) Bug hunting, (3) Security (OWASP), (4) Performance. Be specific with file paths and line numbers. At least 5 findings per perspective."
TOOLKIT_PROMPTS[s5-multi-llm]="/multi-llm Review architecture quality, potential bugs, security posture, and performance. Be specific with file paths and line numbers."

# ─── Validation ───────────────────────────────────────────────

if [ -z "${BASELINE_PROMPTS[$SCENARIO]+x}" ]; then
  echo "Unknown scenario: $SCENARIO"
  echo "Available: s1-secaudit, s2-consensus, s3-debug, s4-precommit, s5-multi-llm"
  exit 1
fi

echo "=== Multi-LLM Benchmark: $SCENARIO ==="
echo "Target: $TARGET"
echo "Date:   $DATE"
echo ""

# ─── Run Baseline ─────────────────────────────────────────────

echo ">>> Running BASELINE (Claude-only)..."
START_B=$(date +%s)
BASELINE_RESULT=$(cd "$TARGET" && count_tokens "${BASELINE_PROMPTS[$SCENARIO]}" 2>&1) || true
END_B=$(date +%s)
WALL_B=$((END_B - START_B))
echo "    Done in ${WALL_B}s"
echo "    $BASELINE_RESULT"
echo ""

# ─── Run Toolkit ──────────────────────────────────────────────

echo ">>> Running TOOLKIT (with multi-llm offloading)..."
START_T=$(date +%s)
TOOLKIT_RESULT=$(cd "$TARGET" && count_tokens "${TOOLKIT_PROMPTS[$SCENARIO]}" --plugin-dir "$ROOT" 2>&1) || true
END_T=$(date +%s)
WALL_T=$((END_T - START_T))
echo "    Done in ${WALL_T}s"
echo "    $TOOLKIT_RESULT"
echo ""

# ─── Calculate Savings ────────────────────────────────────────

RESULT_FILE="$RESULTS_DIR/${DATE}-${SCENARIO}.json"

python3 -c "
import json, sys

try:
    baseline = json.loads('$BASELINE_RESULT')
    toolkit = json.loads('$TOOLKIT_RESULT')
except json.JSONDecodeError as e:
    print(json.dumps({'error': str(e), 'baseline_raw': '$BASELINE_RESULT', 'toolkit_raw': '$TOOLKIT_RESULT'}, indent=2))
    sys.exit(1)

if baseline.get('error') or toolkit.get('error'):
    print(json.dumps({
        'scenario': '$SCENARIO',
        'date': '$DATE',
        'target': '$TARGET',
        'error': baseline.get('error', '') or toolkit.get('error', ''),
        'baseline': baseline,
        'toolkit': toolkit
    }, indent=2))
    sys.exit(0)

b_total = baseline['total_tokens'] or 1
t_total = toolkit['total_tokens'] or 1
savings = 1 - (t_total / b_total)

result = {
    'scenario': '$SCENARIO',
    'date': '$DATE',
    'target': '$TARGET',
    'baseline': {**baseline, 'wall_time_s': $WALL_B},
    'toolkit': {**toolkit, 'wall_time_s': $WALL_T},
    'savings_ratio': round(savings, 4),
    'savings_pct': f'{savings*100:.1f}%',
    'cost_saved_usd': round(baseline['cost_usd'] - toolkit['cost_usd'], 4),
    'speed_ratio': round($WALL_B / max($WALL_T, 1), 2)
}
print(json.dumps(result, indent=2))
" > "$RESULT_FILE"

echo "=== Results ==="
cat "$RESULT_FILE"
echo ""
echo "Saved to: $RESULT_FILE"
