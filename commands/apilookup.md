---
description: Look up current API/SDK documentation with version awareness
allowed-tools: WebSearch, WebFetch, Read, Grep
argument-hint: [API or SDK name + question]
---

You are looking up current, accurate API/SDK documentation.

## Query

$ARGUMENTS

## Process

### Step 1: Identify Context
- What API/SDK?
- What version is the project using? (check package.json, requirements.txt, etc.)
- What specific aspect? (setup, method, config, migration)

### Step 2: Search Current Docs
Search with CURRENT YEAR (2026) to avoid outdated results.

Priority: official docs > GitHub repo > blog posts > release notes

### Step 3: Version-Aware Response
- Match docs to project version
- Flag breaking changes between project and latest
- Note deprecated APIs

## Output Format

```
## [API/SDK] — [topic]

**Project version**: [detected]
**Latest version**: [current]

### Answer
[direct answer]

### Code Example
[working snippet for project's version]

### Breaking Changes
[relevant changes, or "None"]

### Sources
- [links]
```

## Rules
- Check project's actual version first
- Include year in searches
- Working code examples, not just descriptions
