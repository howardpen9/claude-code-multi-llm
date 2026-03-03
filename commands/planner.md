---
description: Decompose complex task into structured implementation plan
allowed-tools: Read, Grep, Glob, Bash(git *), Agent
argument-hint: [feature or task description]
---

You are decomposing a complex task into an actionable plan.

## Task

$ARGUMENTS

## Process

### Step 1: Scope
- What needs to be built/changed?
- Success criteria?
- What is OUT of scope?

### Step 2: Codebase Recon
Read relevant files to understand:
- Current architecture and patterns
- Reusable code
- Integration points
- Test patterns

### Step 3: Dependency Graph
```
[task A] → [task B] → [task C]
                    → [task D]
```

### Step 4: Implementation Steps
Each step should:
- Be completable in one session
- Have clear input/output
- Reference specific files

### Step 5: Risk Assessment

## Output Format

```
## Plan: [task]

### Scope
**In**: ...
**Out**: ...
**Done when**: ...

### Steps
1. **[step]** (~effort)
   Files: `path/to/file`
   Do: [action]
   Verify: [how]

2. **[step]** ...

### Risks
- **[risk]**: mitigation → [plan]

### Open Questions
- [needs clarification]
```

## Rules
- Read codebase BEFORE planning
- Each step references specific files
- Flag steps requiring user decision
- Do NOT implement — only plan
