#!/bin/bash
# install.sh — Copy multi-llm commands to ~/.claude/commands/
# Usage: claude-code-multi-llm (via npx) or bash bin/install.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

# Find the package root (handles both npx and direct invocation)
if [ -d "$ROOT/commands" ]; then
  PKG_DIR="$ROOT"
elif [ -d "$SCRIPT_DIR/../commands" ]; then
  PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
else
  echo "Error: Cannot find commands/ directory"
  exit 1
fi

CLAUDE_DIR="$HOME/.claude"
CMD_DIR="$CLAUDE_DIR/commands"
SKILL_DIR="$CLAUDE_DIR/skills"

echo "=== claude-code-multi-llm installer ==="
echo ""

# ─── Install Commands ─────────────────────────────────────────

mkdir -p "$CMD_DIR"

count=0
for file in "$PKG_DIR/commands/"*.md; do
  name=$(basename "$file")
  cp "$file" "$CMD_DIR/$name"
  echo "  ✓ $name → $CMD_DIR/$name"
  count=$((count + 1))
done

echo ""
echo "Installed $count commands to $CMD_DIR"

# ─── Install Skill (optional) ────────────────────────────────

echo ""
read -r -p "Also install analysis-router skill? [Y/n] " response < /dev/tty 2>/dev/null || response="y"
response=${response:-y}

if [[ "$response" =~ ^[Yy]$ ]]; then
  mkdir -p "$SKILL_DIR/analysis-router"
  cp "$PKG_DIR/skills/analysis-router/SKILL.md" "$SKILL_DIR/analysis-router/SKILL.md"
  echo "  ✓ analysis-router → $SKILL_DIR/analysis-router/SKILL.md"
fi

# ─── Check CLIs ───────────────────────────────────────────────

echo ""
echo "=== External CLI Status ==="

check_cli() {
  local name="$1" cmd="$2" install="$3"
  if command -v "$cmd" &>/dev/null || [ -x "$HOME/.local/bin/$cmd" ]; then
    printf "  %-10s \033[32m✓ installed\033[0m\n" "$name"
  else
    printf "  %-10s \033[33m✗ not found\033[0m  → %s\n" "$name" "$install"
  fi
}

check_cli "Codex" "codex" "npm install -g @openai/codex"
check_cli "Kimi" "kimi" "uv tool install kimi-cli"
check_cli "Gemini" "gemini" "npm install -g @google/gemini-cli"

echo ""
echo "Done! Use /multi-llm, /thinkdeep, /secaudit, etc. in Claude Code."
