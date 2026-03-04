# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.0.0] - 2026-03-04

### Added

- **TypeScript MCP server** — cost-aware LLM router that runs alongside existing slash commands
- **CLI subscription mode** (`cli_ask`, `cli_status`) — spawn Codex/Gemini/Kimi CLIs to use
  subscription credits (ChatGPT Pro, Google AI Studio, etc.) instead of API pay-per-token billing
- **API router mode** — 6 MCP tools for pay-per-token usage with automatic cheapest-model routing:
  - `ask` — delegate prompts to cheapest capable model
  - `multi_ask` — query multiple models in parallel
  - `list_models` — show available models with pricing
  - `cost_report` — spending analytics + savings vs Opus baseline
  - `route_explain` — debug routing decisions without calling any LLM
  - `configure` — adjust router settings for current session
- **Rule-based task classifier** (4 quality tiers: BASIC → STANDARD → ADVANCED → FRONTIER)
- **Provider support**: OpenAI (GPT-5, GPT-4.1, o3-mini) + Google (Gemini 2.5 Pro/Flash/Flash-Lite)
- **Cost tracker** with per-request JSONL logging and savings calculation vs Claude Opus baseline
- **CLI auto-detection** for codex, gemini, kimi with non-interactive spawning
- 23 unit tests (router classifier + cost tracker)

### Changed

- README restructured around three modes: CLI subscription, API router, slash commands
- Billing comparison table added to documentation
- Project now includes both Markdown commands (zero-code) and TypeScript MCP server

## [1.1.0] - 2026-03-04

### Added

- **繁體中文說明** (`README.zh-TW.md`) — Full Traditional Chinese documentation with language switcher
- **Token savings test specification** (`tests/token-savings-test-spec.md`) — 5 scenarios (S1-S5) with baseline vs toolkit token measurements, edge cases (E1-E5), decision matrix, and reproducible test harness
- **Optimization roadmap** (`OPTIMIZATION.md`) — 7 improvement recommendations inspired by Rig framework's agentic design patterns (Agent-as-Tool, Op composability, parallel dispatch, Prompt Routing, Evaluator-Optimizer)

### Changed

- `README.md` — Added language switcher link (English | 繁體中文)

## [1.0.0] - 2026-03-03

### Added

- **9 slash commands** for Claude Code:
  - `/multi-llm` — Parallel multi-LLM analysis: spawn Codex, Kimi, and Gemini CLIs alongside Claude
  - `/thinkdeep` — Deep reasoning with multi-angle analysis and confidence tracking
  - `/consensus` — Structured debate with FOR / AGAINST / NEUTRAL perspectives
  - `/precommit` — Pre-commit validation of staged changes (correctness, security, quality)
  - `/secaudit` — OWASP Top 10 systematic security audit
  - `/debug-deep` — Hypothesis-driven root-cause analysis
  - `/planner` — Task decomposition into implementation plans with dependency graphs
  - `/challenge` — Devil's advocate: challenge assumptions and prevent blind agreement
  - `/apilookup` — Version-aware API/SDK documentation lookup (searches current docs)
- **`analysis-router` skill** — Auto-classifies tasks into 4 tiers (direct answer → structured methodology → multi-LLM suggestion → structured debate)
- **Plugin manifest** (`.claude-plugin/plugin.json`) for Claude Code plugin system
- **Smoke test** (`tests/smoke-test.sh`) — CLI detection, output verification, parallel execution timing
- **Benchmark template** (`tests/benchmark.md`) — 4 benchmark prompts with 5-point scoring rubric
- MIT license

### Fixed

- Addressed Kimi Code review findings (prompt clarity, edge case handling)
