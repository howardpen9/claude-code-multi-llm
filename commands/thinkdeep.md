---
description: Deep reasoning — multi-angle analysis with confidence tracking
allowed-tools: Read, Grep, Glob, Bash(git *), Agent
argument-hint: [topic or problem to analyze]
---

You are performing extended deep reasoning on the given topic or problem.

## Task

Analyze the following in depth: $ARGUMENTS

## Methodology

### Step 1: Initial Assessment
- State your understanding of the problem
- Identify what you know vs what you need to investigate
- Set initial confidence: `exploring`

### Step 2: Multi-Angle Analysis
Examine from at least 3 perspectives:
- **Correctness**: Logic sound? Edge cases?
- **Performance**: Time/space implications? Scale?
- **Maintainability**: Readable? Future-proof?
- **Security**: OWASP concerns? Input validation?

### Step 3: Edge Case Enumeration
List at least 5 edge cases or failure modes:
- Scenario, likelihood (common/rare/theoretical), impact (low/medium/high/critical)

### Step 4: Synthesis
- Update confidence: `exploring` → `low` → `medium` → `high` → `certain`
- If < `high`, identify what would increase it
- Clear recommendations

## Output Format

```
## Deep Analysis: [topic]

### Initial Assessment
[understanding + unknowns]

### Multi-Angle Analysis
**Correctness**: ...
**Performance**: ...
**Maintainability**: ...
**Security**: ...

### Edge Cases
1. [scenario] — likelihood: X, impact: Y

### Confidence: [level]
[reasoning]

### Recommendations
1. ...
```

## Rules
- Do NOT give surface-level answers. Dig deep.
- Read files before concluding if code is involved.
- Flag overengineering if you see it.
