# Multi-LLM Toolkit for Claude Code

[English](./README.md) | **繁體中文**

Claude Code 的多模型交叉驗證與結構化分析插件。平行啟動 Codex (OpenAI)、Kimi (Moonshot)、Gemini (Google) CLI，比較不同 AI 的觀點。

## 內容一覽

### 指令（透過 `/指令名` 手動呼叫）

| 指令 | 說明 |
|------|------|
| `/multi-llm` | 平行多模型分析 — 同時啟動外部 CLI，與 Claude 比較 |
| `/thinkdeep` | 深度推理，附帶信心度追蹤 |
| `/consensus` | 多角度辯論（正方 / 反方 / 中立） |
| `/precommit` | 提交前程式碼審查 |
| `/secaudit` | OWASP Top 10 安全稽核 |
| `/debug-deep` | 系統性根因分析，假說驅動除錯 |
| `/planner` | 將複雜任務拆解為實作計畫 |
| `/challenge` | 魔鬼代言人 — 挑戰預設假設 |
| `/apilookup` | 版本感知的 API/SDK 文件查詢 |

### Skill（Claude 自動觸發）

**analysis-router** — 自動判斷任務複雜度並分級處理：

| 層級 | 時機 | 動作 |
|------|------|------|
| Tier 1 | 簡單/明顯 | 直接回答 |
| Tier 2 | 需要嚴謹分析 | 自動套用結構化方法論 |
| Tier 3 | 真的不確定 | **建議**使用多模型驗證（會先詢問） |
| Tier 4 | 重大決策 | 結構化辯論 |

## 前置需求

至少安裝一個外部 coding CLI：

| CLI | 安裝方式 | 模型 |
|-----|----------|------|
| [Codex CLI](https://github.com/openai/codex) | `npm install -g @openai/codex` | OpenAI GPT/O3 |
| [Kimi Code](https://github.com/MoonshotAI/kimi-cli) | `uv tool install kimi-cli` | Moonshot Kimi |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | `npm install -g @google/gemini-cli` | Google Gemini |

每個 CLI 需要各自設定 API key。

## 安裝方式

### 方式 A：開發模式（快速測試）

```bash
git clone https://github.com/howardpen9/claude-code-multi-llm.git
claude --plugin-dir ./claude-code-multi-llm
```

### 方式 B：只複製指令（不需要插件）

```bash
git clone https://github.com/howardpen9/claude-code-multi-llm.git
cp claude-code-multi-llm/commands/*.md ~/.claude/commands/
```

這樣可以使用斜線指令，但不會有自動路由 skill。

## 使用範例

### 手動指令

```
> /multi-llm 我們該用 Redis 還是 in-memory LRU 做 session cache？
> /thinkdeep 這個 WebSocket 重連邏輯正確嗎？
> /secaudit server/routes/auth.ts
> /precommit
> /challenge 我們應該從 Express 遷移到 Fastify
```

### 自動路由（需安裝插件）

`analysis-router` skill 會自動偵測任務複雜度並套用對應方法。Tier 3（多模型）一定會先詢問才會啟動外部 CLI。

## 架構

```
┌─────────────────────────────────────┐
│  Claude Code (YOU) = 裁判 + 選手    │
│                                     │
│  analysis-router skill 自動路由:    │
│  Tier 1 → 直接回答                 │
│  Tier 2 → 結構化方法論             │
│  Tier 3 → 啟動外部 CLI ─────────┐  │
│  Tier 4 → 結構化辯論             │  │
└──────────────────────────────────┼──┘
                                   │
           ┌───────────┬───────────┼──────────┐
           │           │           │          │
     ┌─────▼──┐  ┌────▼───┐  ┌───▼────┐  ┌──▼─────┐
     │ Claude │  │ Codex  │  │  Kimi  │  │ Gemini │
     │  (你)  │  │(OpenAI)│  │(Moonsh)│  │(Google)│
     └────────┘  └────────┘  └────────┘  └────────┘
```

## 靈感來源

設計模式參考自 [PAL MCP Server](https://github.com/BeehiveInnovations/pal-mcp-server)（11K+ stars）：

- **WorkflowTool** → `/thinkdeep`、`/debug-deep` 的信心度追蹤
- **Consensus stance injection** → `/consensus` 的正方/反方/中立
- **Challenge (no-model tool)** → `/challenge` 的純 prompt 轉換
- **Clink CLI bridge** → `/multi-llm` 的外部 CLI 調用
- **OWASP structured checklist** → `/secaudit` 的系統化稽核

## 授權

MIT
