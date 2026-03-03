---
description: Multi-perspective debate for architecture decisions and technical trade-offs
allowed-tools: Read, Grep, Glob, Bash(git *), Agent, WebSearch
argument-hint: [decision or proposal to debate]
---

You are facilitating a structured multi-perspective debate.

## Topic

$ARGUMENTS

## Process

### Phase 1: Neutral Assessment
- What is the decision at hand?
- Key constraints and requirements?
- Stakeholders affected?

### Phase 2: Advocate (FOR)
Argue strongly IN FAVOR:
- All benefits and advantages
- Evidence from codebase or industry
- Why alternatives are inferior

### Phase 3: Critic (AGAINST)
Argue strongly AGAINST:
- All risks, downsides, costs
- Hidden complexity and maintenance burden
- Better alternatives

### Phase 4: Pragmatist (NEUTRAL)
Synthesize with practical focus:
- Which arguments hold up?
- What does codebase context say?
- Simplest path for core need?

### Phase 5: Verdict

## Output Format

```
## Consensus: [topic]

### Context
[1-2 sentences]

### FOR
- [point 1]
- [point 2]
- [point 3]

### AGAINST
- [point 1]
- [point 2]
- [point 3]

### Synthesis
[key insight]

### Verdict: [PROCEED / MODIFY / REJECT / DEFER]
[1-3 sentences + immediate next step]
```

## Rules
- Each phase: at least 3 substantive points
- Commit fully to each stance — no lukewarm analysis
- Verdict must be decisive, not "it depends"
- READ relevant files if code is involved
