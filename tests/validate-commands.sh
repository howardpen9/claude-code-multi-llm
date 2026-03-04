#!/bin/bash
# validate-commands.sh — Unit tests for command structure and plugin integrity
# Validates: YAML frontmatter, required sections, plugin.json, file references
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

PASS=0
FAIL=0
WARN=0

pass() { PASS=$((PASS + 1)); printf "  %-40s \033[32mPASS\033[0m %s\n" "$1" "${2:-}"; }
fail() { FAIL=$((FAIL + 1)); printf "  %-40s \033[31mFAIL\033[0m %s\n" "$1" "$2"; }
warn() { WARN=$((WARN + 1)); printf "  %-40s \033[33mWARN\033[0m %s\n" "$1" "$2"; }

echo "=== Multi-LLM Toolkit: Validation Tests ==="
echo ""

# ─── 1. Plugin Manifest ───────────────────────────────────────

echo "## 1. Plugin Manifest"

if [ -f "$ROOT/.claude-plugin/plugin.json" ]; then
  pass "plugin.json exists"
else
  fail "plugin.json exists" "missing .claude-plugin/plugin.json"
fi

if python3 -m json.tool "$ROOT/.claude-plugin/plugin.json" > /dev/null 2>&1; then
  pass "plugin.json is valid JSON"
else
  fail "plugin.json is valid JSON" "parse error"
fi

if grep -q '"name"' "$ROOT/.claude-plugin/plugin.json"; then
  pass "plugin.json has name field"
else
  fail "plugin.json has name field" "missing"
fi

if grep -q '"description"' "$ROOT/.claude-plugin/plugin.json"; then
  pass "plugin.json has description field"
else
  fail "plugin.json has description field" "missing"
fi

echo ""

# ─── 2. Command Files ─────────────────────────────────────────

echo "## 2. Command Frontmatter & Structure"

COMMANDS_DIR="$ROOT/commands"
EXPECTED_COMMANDS="multi-llm thinkdeep consensus precommit secaudit debug-deep planner challenge apilookup"

for cmd in $EXPECTED_COMMANDS; do
  file="$COMMANDS_DIR/$cmd.md"

  if [ ! -f "$file" ]; then
    fail "$cmd.md exists" "file not found"
    continue
  fi
  pass "$cmd.md exists"

  # Check YAML frontmatter delimiters
  first_line=$(head -1 "$file")
  if [ "$first_line" = "---" ]; then
    # Find closing ---
    closing=$(awk 'NR>1 && /^---$/{print NR; exit}' "$file")
    if [ -n "$closing" ]; then
      pass "$cmd.md frontmatter delimiters"
    else
      fail "$cmd.md frontmatter delimiters" "no closing ---"
    fi
  else
    fail "$cmd.md frontmatter delimiters" "no opening ---"
  fi

  # Check required frontmatter fields
  if head -20 "$file" | grep -q '^description:'; then
    pass "$cmd.md has description"
  else
    fail "$cmd.md has description" "missing in frontmatter"
  fi

  if head -20 "$file" | grep -q '^allowed-tools:'; then
    pass "$cmd.md has allowed-tools"
  else
    warn "$cmd.md has allowed-tools" "missing (may be intentional)"
  fi

  # Check required content sections
  if grep -q '^## ' "$file"; then
    pass "$cmd.md has H2 sections"
  else
    fail "$cmd.md has H2 sections" "no ## headings found"
  fi

  # Check for output format section
  if grep -qi 'output' "$file"; then
    pass "$cmd.md defines output format"
  else
    warn "$cmd.md defines output format" "no output section found"
  fi
done

echo ""

# ─── 3. Skill Structure ──────────────────────────────────────

echo "## 3. Skill: analysis-router"

SKILL="$ROOT/skills/analysis-router/SKILL.md"

if [ -f "$SKILL" ]; then
  pass "SKILL.md exists"
else
  fail "SKILL.md exists" "missing skills/analysis-router/SKILL.md"
fi

if head -1 "$SKILL" | grep -q '^---'; then
  pass "SKILL.md has frontmatter"
else
  fail "SKILL.md has frontmatter" "missing opening ---"
fi

if head -20 "$SKILL" | grep -q '^name:'; then
  pass "SKILL.md has name field"
else
  fail "SKILL.md has name field" "missing"
fi

if head -20 "$SKILL" | grep -q '^description:'; then
  pass "SKILL.md has description field"
else
  fail "SKILL.md has description field" "missing"
fi

# Check for tier definitions
for tier in "Tier 1" "Tier 2" "Tier 3" "Tier 4"; do
  if grep -q "$tier" "$SKILL"; then
    pass "SKILL.md defines $tier"
  else
    fail "SKILL.md defines $tier" "missing"
  fi
done

echo ""

# ─── 4. Cross-References ─────────────────────────────────────

echo "## 4. Cross-References"

# Check that SKILL.md references match actual command files
for cmd in $EXPECTED_COMMANDS; do
  if grep -q "/$cmd" "$SKILL"; then
    pass "SKILL.md references /$cmd"
  else
    warn "SKILL.md references /$cmd" "not found in skill routing"
  fi
done

echo ""

# ─── 5. File Hygiene ─────────────────────────────────────────

echo "## 5. File Hygiene"

if [ -f "$ROOT/LICENSE" ]; then
  pass "LICENSE exists"
else
  fail "LICENSE exists" "missing"
fi

if [ -f "$ROOT/README.md" ]; then
  pass "README.md exists"
else
  fail "README.md exists" "missing"
fi

if [ -f "$ROOT/CHANGELOG.md" ]; then
  pass "CHANGELOG.md exists"
else
  warn "CHANGELOG.md exists" "missing"
fi

# Check for secrets or sensitive patterns
if grep -rq 'sk-[a-zA-Z0-9]' "$ROOT/commands/" "$ROOT/skills/" 2>/dev/null; then
  fail "No API keys in commands" "found sk-* pattern"
else
  pass "No API keys in commands"
fi

if grep -rq 'password\s*=' "$ROOT/commands/" "$ROOT/skills/" 2>/dev/null; then
  fail "No hardcoded passwords" "found password= pattern"
else
  pass "No hardcoded passwords"
fi

# Check no command exceeds 200 lines (keep prompts focused)
for file in "$COMMANDS_DIR"/*.md; do
  name=$(basename "$file")
  lines=$(wc -l < "$file" | tr -d ' ')
  if [ "$lines" -gt 200 ]; then
    warn "$name line count ($lines)" "exceeds 200 lines — consider trimming"
  else
    pass "$name line count ($lines)"
  fi
done

echo ""

# ─── Summary ──────────────────────────────────────────────────

echo "=== Results: $PASS pass / $FAIL fail / $WARN warn ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
