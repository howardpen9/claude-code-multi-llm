#!/bin/bash
# Smoke test: verify all external CLIs work
# Usage: bash tests/smoke-test.sh
# Works on macOS (no GNU coreutils required)

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; NC='\033[0m'
PASS=0; FAIL=0; SKIP=0

result() {
  if [ "$1" = "pass" ]; then echo -e "${GREEN}PASS${NC} $2"; ((PASS++));
  elif [ "$1" = "fail" ]; then echo -e "${RED}FAIL${NC} $2"; ((FAIL++));
  else echo -e "${YELLOW}SKIP${NC} $2"; ((SKIP++)); fi
}

echo "=== Multi-LLM Toolkit Smoke Tests ==="
echo ""
echo "## 1. CLI Detection"

for cli in codex kimi gemini; do
  printf "  %-10s " "$cli"
  if command -v $cli &>/dev/null; then
    result pass "$(command -v $cli)"
  elif [ -x "$HOME/.local/bin/$cli" ]; then
    result pass "$HOME/.local/bin/$cli"
  else
    result skip "not installed"
  fi
done

echo ""
echo "## 2. Non-Interactive Output (2+2 test)"

PROMPT="What is 2+2? Reply with ONLY the digit."

# Codex
printf "  %-10s " "codex"
if command -v codex &>/dev/null; then
  GIT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || echo "/tmp")
  OUT=$(cd "$GIT_DIR" && codex exec "$PROMPT" 2>&1)
  echo "$OUT" | grep -q '4' && result pass "contains 4" || result fail "no 4 found"
else
  result skip "not installed"
fi

# Kimi
printf "  %-10s " "kimi"
KIMI_BIN=$(command -v kimi 2>/dev/null || echo "$HOME/.local/bin/kimi")
if [ -x "$KIMI_BIN" ]; then
  OUT=$("$KIMI_BIN" -p "$PROMPT" --print --final-message-only 2>&1)
  echo "$OUT" | grep -q '4' && result pass "contains 4" || result fail "no 4 found"
else
  result skip "not installed"
fi

# Gemini
printf "  %-10s " "gemini"
if command -v gemini &>/dev/null; then
  OUT=$(gemini -p "$PROMPT" 2>&1)
  echo "$OUT" | grep -q '4' && result pass "contains 4" || result fail "no 4 found"
else
  result skip "not installed"
fi

echo ""
echo "## 3. Parallel Execution (timing)"

PROMPT_FILE="/tmp/multi-llm-prompt.txt"
echo "Name 2 benefits of TypeScript in one sentence." > "$PROMPT_FILE"

printf "  spawning... "
START=$(date +%s)
pids=()

GIT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || echo "/tmp")

if command -v codex &>/dev/null; then
  (cd "$GIT_DIR" && codex exec "$(cat $PROMPT_FILE)" > /tmp/_ml_codex.txt 2>&1) & pids+=($!)
fi

KIMI_BIN=$(command -v kimi 2>/dev/null || echo "$HOME/.local/bin/kimi")
if [ -x "$KIMI_BIN" ]; then
  ("$KIMI_BIN" -p "$(cat $PROMPT_FILE)" --print --final-message-only > /tmp/_ml_kimi.txt 2>&1) & pids+=($!)
fi

if command -v gemini &>/dev/null; then
  (gemini -p "$(cat $PROMPT_FILE)" > /tmp/_ml_gemini.txt 2>&1) & pids+=($!)
fi

for pid in "${pids[@]}"; do wait "$pid" 2>/dev/null || true; done
END=$(date +%s)

echo -e "${GREEN}DONE${NC} — ${#pids[@]} CLIs in $((END-START))s (parallel)"

for f in /tmp/_ml_*.txt; do
  [ -f "$f" ] && printf "    %-15s %s bytes\n" "$(basename $f .txt | sed 's/_ml_//')" "$(wc -c < "$f" | tr -d ' ')"
done

rm -f "$PROMPT_FILE" /tmp/_ml_*.txt

echo ""
echo "=== Results: ${PASS} pass / ${FAIL} fail / ${SKIP} skip ==="
[ "$FAIL" -eq 0 ]
