# Multi-LLM Benchmark

Compare analysis quality across Claude, Codex, Kimi, and Gemini on a real codebase.

## How to Run

```bash
# 1. Open Claude Code in your target project directory
cd /path/to/your/project

# 2. Run with the plugin loaded
claude --plugin-dir /path/to/claude-code-multi-llm

# 3. Execute the benchmark
> /multi-llm <paste one of the prompts below>
```

## Benchmark Prompts

### B1: Architecture Review (tests breadth)
```
Review the overall architecture of this project. Identify: 1) the main entry points, 2) how data flows through the system, 3) the top 3 architectural risks. Be specific with file paths.
```

### B2: Bug Hunt (tests depth)
```
Find potential bugs in this codebase. Focus on: null/undefined errors, race conditions, error handling gaps, and edge cases. Cite exact file:line for each finding.
```

### B3: Security Audit (tests domain knowledge)
```
Perform a security audit of this codebase focusing on OWASP Top 10. Check for injection, broken auth, sensitive data exposure, and SSRF. Cite exact file:line for each finding.
```

### B4: Trade-off Decision (tests reasoning)
```
Should this project add Redis for caching, or is in-memory caching sufficient? Analyze the current codebase to determine data access patterns, expected scale, and trade-offs.
```

## Scoring Rubric

For each benchmark, rate each model 1-5:

| Criteria | Description |
|----------|-------------|
| **Accuracy** | Are the findings correct? (verify against actual code) |
| **Specificity** | Does it cite exact files and lines? |
| **Completeness** | Did it find things others missed? |
| **Actionability** | Are recommendations concrete and implementable? |
| **False Positives** | How many findings are wrong? (lower = better) |

## Results Template

```markdown
### Benchmark: [B1/B2/B3/B4]
**Target**: [repo name + description]
**Date**: YYYY-MM-DD

| Criteria | Claude | Codex | Kimi | Gemini |
|----------|--------|-------|------|--------|
| Accuracy | /5 | /5 | /5 | /5 |
| Specificity | /5 | /5 | /5 | /5 |
| Completeness | /5 | /5 | /5 | /5 |
| Actionability | /5 | /5 | /5 | /5 |
| False Positives | /5 | /5 | /5 | /5 |
| **Total** | /25 | /25 | /25 | /25 |

### Unique Findings
- **Only Claude found**: ...
- **Only Codex found**: ...
- **Only Kimi found**: ...
- **Only Gemini found**: ...

### Consensus (all agreed)
- ...

### Verdict
[which model performed best and why]
```
