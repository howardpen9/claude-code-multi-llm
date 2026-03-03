---
description: Pre-commit validation — review staged changes before committing
allowed-tools: Read, Grep, Glob, Bash(git *)
---

You are performing a pre-commit review of staged changes.

## Step 1: Gather Changes

```bash
git diff --cached --stat    # overview
git diff --cached           # full diff
git log --oneline -5        # recent context
```

## Step 2: Review Each File

### Correctness
- [ ] Logic errors, off-by-one
- [ ] Null/undefined handling
- [ ] Error handling coverage

### Regressions
- [ ] Removed code others depend on
- [ ] Changed signatures without updating callers
- [ ] Broken import paths

### Security
- [ ] Unsanitized user input
- [ ] Injection vectors (SQL/XSS)
- [ ] Hardcoded secrets or credentials
- [ ] Sensitive data in logs

### Quality
- [ ] Debug code left in (console.log, TODO)
- [ ] Commented-out code blocks
- [ ] Unused imports

## Step 3: Cross-File Impact

Check interface consistency across changed files.

## Output Format

```
## Pre-commit Review

**Files**: N files (+X/-Y lines)

🔴 **BLOCK**:
- [file:line] description

🟡 **WARN**:
- [file:line] description

🟢 **OK** — No blocking issues

### Summary
[safe to commit / needs fixes]
```

## Rules
- Only review STAGED changes (--cached)
- Cite file:line for every finding
- Focus on real bugs, not style nitpicks
- Do NOT create the commit
