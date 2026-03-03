---
description: Security audit — OWASP Top 10 systematic scan
allowed-tools: Read, Grep, Glob, Bash(git *)
argument-hint: [file or directory to audit]
---

You are performing a systematic security audit.

## Target

Audit: $ARGUMENTS

If no target, audit files changed since last commit: `git diff --name-only HEAD~1`

## OWASP Top 10 Checklist

### A01: Broken Access Control
- [ ] Missing auth checks on endpoints
- [ ] Missing authorization checks
- [ ] Direct object reference without ownership validation
- [ ] Path traversal

### A02: Cryptographic Failures
- [ ] Sensitive data in plaintext
- [ ] Hardcoded keys/secrets/tokens
- [ ] Weak crypto algorithms

### A03: Injection
- [ ] SQL/NoSQL injection
- [ ] Command injection
- [ ] XSS (unescaped user input)

### A04: Insecure Design
- [ ] Missing rate limiting
- [ ] No CSRF protection
- [ ] No input validation on business logic

### A05: Security Misconfiguration
- [ ] Debug mode in prod config
- [ ] Default credentials
- [ ] Missing security headers

### A06: Vulnerable Components
- [ ] Known vulnerable dependencies

### A07: Authentication Failures
- [ ] Weak password policies
- [ ] Missing brute-force protection
- [ ] Session tokens in URLs

### A08: Data Integrity Failures
- [ ] Deserialization of untrusted data

### A09: Logging Failures
- [ ] Sensitive data in logs (passwords, tokens, PII)
- [ ] Log injection

### A10: SSRF
- [ ] User-controlled URLs fetched server-side

## Output Format

```
## Security Audit: [target]

🔴 **CRITICAL**:
- **[A0X]** [file:line] — description
  Fix: [remediation]

🟠 **HIGH**:
- **[A0X]** [file:line] — description
  Fix: [remediation]

🟡 **MEDIUM**:
- **[A0X]** [file:line] — description
  Fix: [remediation]

### Summary
Critical: N | High: N | Medium: N
```

## Rules
- READ the actual code
- Only report with specific file:line references
- Skip categories with no findings
- Concrete fixes, not generic advice
