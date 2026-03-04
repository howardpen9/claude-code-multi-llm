---
description: Parallel multi-LLM analysis — spawn Codex + Kimi + Gemini CLIs, compare with Claude
allowed-tools: Bash(codex *), Bash(kimi *), Bash(gemini *), Bash(which *), Bash(cat *), Bash(mktemp *), Bash(rm *), Bash(git *), Agent, Read, Grep, Glob
argument-hint: [analysis question or task]
---

You are orchestrating a multi-LLM analysis. You will send a prompt to external AI coding CLIs in parallel, analyze it yourself, and synthesize a comparison.

## Task

$ARGUMENTS

## Architecture

```
┌─────────────────────────────────────┐
│  Claude Code (YOU) = Judge + Player │
│                                     │
│  1. Prepare prompt                  │
│  2. Spawn external CLIs in parallel │
│  3. Analyze the same task yourself  │
│  4. Compare all results             │
└───────┬──────────┬──────────┬───────┘
        │          │          │
  ┌─────▼──┐  ┌───▼────┐  ┌──▼─────┐
  │ Codex  │  │  Kimi  │  │ Gemini │
  │(OpenAI)│  │(Moonsh)│  │(Google)│
  └────────┘  └────────┘  └────────┘
```

You (Claude) are BOTH a participant AND the judge. Be transparent about it.

## Process

### Step 1: Detect Available CLIs

Run in parallel:
```bash
which codex 2>/dev/null && echo "CODEX_OK" || echo "CODEX_NOT_FOUND"
(which kimi 2>/dev/null || ls ~/.local/bin/kimi 2>/dev/null) && echo "KIMI_OK" || echo "KIMI_NOT_FOUND"
which gemini 2>/dev/null && echo "GEMINI_OK" || echo "GEMINI_NOT_FOUND"
```

At least 1 external CLI must be found. If none, tell the user to install one.

### Step 2: Prepare the Prompt

Craft a self-contained analysis prompt:
- If code is involved, READ the relevant files first
- Include key code excerpts inline (external CLIs cannot read your files)
- One clear question or analysis request
- End with: "Be specific. Cite line numbers where relevant."

Write the prompt to a DETERMINISTIC temp file path:
```bash
PROMPT_FILE="/tmp/multi-llm-prompt.txt"
cat > "$PROMPT_FILE" << 'PROMPT_EOF'
<your crafted prompt>
PROMPT_EOF
```

### Step 3: Parallel Execution

Launch ALL available CLIs in parallel using the Agent tool (single message, multiple agents).

Each Agent must use the EXACT path `/tmp/multi-llm-prompt.txt` to read the shared prompt.

**Agent A — Codex CLI (if available):**
```bash
# Codex MUST run inside a git repo. Find one:
GIT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || echo "/tmp")
cd "$GIT_DIR" && codex exec "$(cat /tmp/multi-llm-prompt.txt)" 2>&1
```

**Agent B — Kimi Code CLI (if available):**
```bash
# Kimi may be at ~/.local/bin/kimi — use full path as fallback
KIMI_BIN=$(which kimi 2>/dev/null || echo "$HOME/.local/bin/kimi")
"$KIMI_BIN" -p "$(cat /tmp/multi-llm-prompt.txt)" --print --final-message-only 2>&1
```

**Agent C — Gemini CLI (if available):**
```bash
gemini -p "$(cat /tmp/multi-llm-prompt.txt)" 2>&1
```

**Simultaneously — Your Own Analysis:**
While agents run, perform YOUR OWN analysis using Read, Grep, Glob.

IMPORTANT: Launch ALL agents in a SINGLE message for true parallelism.

### Step 4: Synthesize

## Output Format

```
## Multi-LLM Analysis: [topic]

### Prompt
> [the exact prompt sent]

---

### 🟣 Claude (Anthropic)
[your analysis — max 15 lines]

### 🟢 Codex (OpenAI)
[summary — max 15 lines]

### 🔴 Kimi (Moonshot)
[summary — max 15 lines]

### 🔵 Gemini (Google)
[summary — max 15 lines, or "not available"]

---

### Comparison

| Aspect | Claude | Codex | Kimi | Gemini |
|--------|--------|-------|------|--------|
| Approach | ... | ... | ... | ... |
| Unique insight | ... | ... | ... | ... |
| Blind spot | ... | ... | ... | ... |

### Agreement (High Confidence)
[what ALL models agree on]

### Disagreements
[where they diverge + which is stronger]

### Final Recommendation
[synthesized answer, citing which model contributed what]
```

## CLI Quick Reference

| CLI | Non-interactive command | Constraint |
|-----|----------------------|------------|
| Codex | `codex exec "<prompt>"` | Must be inside git repo |
| Kimi | `kimi -p "<prompt>" --print --final-message-only` | May need full path `~/.local/bin/kimi` |
| Gemini | `gemini -p "<prompt>"` | None |

## Error Handling

### CLI Not Found
If a CLI is not found in Step 1, skip it silently. Minimum 1 CLI required. If zero found:
```
⚠️ No external CLIs detected. Install at least one:
  npm install -g @openai/codex    (Codex)
  uv tool install kimi-cli        (Kimi)
  npm install -g @google/gemini-cli (Gemini)
```

### CLI Timeout
If an Agent does not return within 120 seconds:
1. Note the timeout in the comparison table: `[TIMEOUT after 120s]`
2. Continue with available results — do NOT retry
3. Your own analysis is always available as fallback

### CLI Error / Garbage Output
If a CLI returns an error (non-zero exit) or empty/malformed output:
1. Log the error briefly: `Codex returned error: <first 100 chars>`
2. Mark as `[ERROR]` in comparison table
3. Continue synthesis with remaining models
4. Do NOT re-run the failed CLI

### Partial Results
If only 1 of 3 CLIs succeeds:
- Still produce the full comparison table (mark failed CLIs)
- Your own analysis fills the gap — you become both participant and fallback
- Explicitly note: "Only N/3 external CLIs responded. Results may be less diverse."

### Prompt File Cleanup
ALWAYS clean up temp files, even if errors occur:
```bash
rm -f /tmp/multi-llm-prompt.txt /tmp/_ml_*.txt
```

## Rules
- Launch external CLIs via PARALLEL Agent calls (single message, multiple agents)
- Include code context inline in the prompt (external CLIs cannot read your files)
- Highlight when another model catches something you missed
- Timeout: 120 seconds per Agent
- Clean up temp files ALWAYS (even on error)
