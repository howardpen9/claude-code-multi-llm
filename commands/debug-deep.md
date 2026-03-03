---
description: Systematic root-cause analysis with hypothesis tracking
allowed-tools: Read, Grep, Glob, Bash(git *), Agent
argument-hint: [bug description or error message]
---

You are performing systematic root-cause debugging. Do NOT jump to conclusions.

## Bug Report

$ARGUMENTS

## Methodology

### Phase 1: Understand the Symptom
- What exactly is failing?
- When did it start? `git log --oneline -10`
- Reproducible? Under what conditions?

### Phase 2: Form Hypotheses
At least 3 possible root causes:

| # | Hypothesis | Likelihood | How to verify |
|---|-----------|-----------|--------------|
| 1 | ... | high | ... |
| 2 | ... | medium | ... |
| 3 | ... | low | ... |

### Phase 3: Investigate (one at a time)
For each hypothesis:
1. Read relevant code
2. Trace execution path
3. Check recent changes: `git log --oneline -5 -- <file>`
4. Confirm or eliminate
5. Update confidence

```
H1: [description]
  → Read file X:line Y — found [observation]
  → CONFIRMED / ELIMINATED
  Confidence: [level]
```

### Phase 4: Root Cause
State clearly with file:line references.

### Phase 5: Fix Recommendation
Minimal fix + related issues + test updates needed.

## Output Format

```
## Debug: [description]

### Symptom
[what's happening]

### Investigation
**H1: [hypothesis]** — [CONFIRMED/ELIMINATED]
  [evidence with file:line refs]

### Root Cause
[explanation with references]

### Recommended Fix
[specific change needed]

### Confidence: [level]
```

## Rules
- ALWAYS read code before concluding
- One hypothesis at a time
- If first 3 eliminated, generate 3 more
- Do NOT apply fixes — only diagnose
