# Multi-LLM Toolkit for Claude Code

[![npm version](https://img.shields.io/npm/v/claude-code-multi-llm)](https://www.npmjs.com/package/claude-code-multi-llm)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)

[English](./README.md) | **繁體中文**

Claude Code 的 **MCP Server**，透過路由子任務到便宜模型來節省 Token 費用。Claude Code 永遠是頂層大腦 — 簡單任務自動分派給 Gemini Flash-Lite ($0.10/M) 或 GPT-4.1-mini ($0.40/M)，而不是所有事都用 Opus ($25/M output)。

> 適合已有 Claude Code 訂閱、想進一步節省 60-98% Token 成本的開發者。

## 三種模式

### 1. CLI 訂閱模式（有訂閱就免費）

使用你現有的 ChatGPT Pro / Google AI Studio / Kimi 訂閱 — **零額外費用**：

| 工具 | 說明 |
|------|------|
| `cli_ask` | 透過已安裝的 CLI (codex/gemini/kimi) 發送 prompt，使用訂閱額度 |
| `cli_status` | 檢查哪些 CLI 已安裝可用 |

### 2. API 路由模式（按 Token 計費，自動選最便宜）

6 個 MCP 工具直接呼叫 LLM API — 按 Token 計費但自動挑最便宜的模型：

| 工具 | 說明 |
|------|------|
| `ask` | 路由 prompt 到最便宜的 API 模型 |
| `multi_ask` | 同時查詢多個 API 模型，比較回答 |
| `list_models` | 顯示可用模型及定價 |
| `cost_report` | 花費分析 + 相比 Opus 省了多少 |
| `route_explain` | Debug：解釋路由決策（不呼叫任何 LLM） |
| `configure` | 調整本次 session 的路由設定 |

### 3. 斜線指令（深度分析 + 交叉驗證）

9 個指令用於結構化分析和多模型交叉驗證：

| 指令 | 說明 |
|------|------|
| `/multi-llm` | 平行多模型分析 — 同時啟動 Codex、Kimi、Gemini CLI |
| `/thinkdeep` | 深度推理，附帶信心度追蹤 |
| `/consensus` | 多角度辯論（正方 / 反方 / 中立） |
| `/precommit` | 提交前程式碼審查 |
| `/secaudit` | OWASP Top 10 安全稽核 |
| `/debug-deep` | 系統性根因分析，假說驅動除錯 |
| `/planner` | 將複雜任務拆解為實作計畫 |
| `/challenge` | 魔鬼代言人 — 挑戰預設假設 |
| `/apilookup` | 版本感知的 API/SDK 文件查詢 |

## 決策對照表

| 你的任務 | 推薦工具 | 費用 |
|---------|---------|------|
| 翻譯 / 摘要 / 格式化 | `cli_ask`（訂閱）或 `ask` | $0 或 ~$0.001 |
| 解釋程式碼 / 簡單問答 | `ask` | ~$0.001 |
| Code review / debug 分析 | `ask` (tier: advanced) | ~$0.005 |
| 架構決策 / 比較方案 | `multi_ask`（2-3 個模型） | ~$0.01 |
| 用 CLI 模型交叉驗證 | `/multi-llm` | $0（訂閱額度） |
| 提交前驗證 | `/precommit` | Claude 直接處理 |
| 安全稽核 | `/secaudit` | Claude 直接處理 |
| 深度推理 / 全新問題 | Claude Opus 直接處理 | — |

## 安裝

### 1. 安裝

```bash
git clone https://github.com/howardpen9/claude-code-multi-llm.git
cd claude-code-multi-llm
npm install && npm run build
```

### 2. 設定

**CLI 模式**（訂閱額度）— 只要安裝 CLI：

```bash
npm i -g @openai/codex        # ChatGPT Pro 訂閱
npm i -g @google/gemini-cli   # Google AI Studio（有免費額度）
uv tool install kimi-cli       # Kimi 訂閱
```

**API 模式**（按 Token 計費）— 設定 API Key：

```bash
cp .env.example .env
# 編輯 .env：填入 OPENAI_API_KEY 和/或 GOOGLE_API_KEY
```

### 3. 連接 Claude Code

在你的專案 `.mcp.json` 加入：

```json
{
  "mcpServers": {
    "multi-llm": {
      "command": "node",
      "args": ["/path/to/claude-code-multi-llm/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "GOOGLE_API_KEY": "AI..."
      }
    }
  }
}
```

或用 npx：

```json
{
  "mcpServers": {
    "multi-llm": {
      "command": "npx",
      "args": ["-y", "claude-code-multi-llm"]
    }
  }
}
```

### 4. 斜線指令（選用）

```bash
cp commands/*.md ~/.claude/commands/
```

## 路由機制

```
Claude Code (Opus) 收到任務
        |
        +-- 複雜推理？ -> Claude 自己處理
        |
        +-- 簡單子任務 + 有 CLI 訂閱？
        |     -> cli_ask（免費，使用訂閱額度）
        |
        +-- 簡單子任務 + 只有 API Key？
        |     -> ask（自動路由到最便宜模型）
        |           |
        |     路由器分類 prompt：
        |     +----------------------------------------------+
        |     | BASIC:    翻譯、格式化、JSON                  | -> Gemini Flash-Lite ($0.10/M)
        |     | STANDARD: 問答、解釋、寫作                    | -> GPT-4.1-mini ($0.40/M)
        |     | ADVANCED: review、debug、安全                 | -> Gemini Flash ($0.15/M)
        |     | FRONTIER: 深度推理、全新問題                  | -> o3-mini ($1.10/M)
        |     +----------------------------------------------+
        |
        +-- 需要交叉驗證？ -> /multi-llm 或 multi_ask
```

## 計費比較

| 模式 | 計費方式 | 費用 | 速度 | Token 追蹤 |
|------|---------|------|------|-----------|
| `cli_ask` | 訂閱額度 | **$0**（包含在訂閱內） | 較慢（CLI 啟動開銷） | 無 |
| `ask` | API 按 Token 計費 | $0.10–15/M | 快（直接 API 呼叫） | 有 |
| `/multi-llm` | 訂閱額度 | **$0** | 最慢（平行 CLI 啟動） | 無 |

## 模型定價 — API 模式

| 模型 | 供應商 | 等級 | 輸入 $/M | 輸出 $/M |
|------|--------|------|----------|----------|
| Gemini 2.5 Flash-Lite | Google | STANDARD | $0.10 | $0.40 |
| Gemini 2.5 Flash | Google | ADVANCED | $0.15 | $0.60 |
| GPT-4.1 Mini | OpenAI | STANDARD | $0.40 | $1.60 |
| GPT-4.1 | OpenAI | ADVANCED | $2.00 | $8.00 |
| Gemini 2.5 Pro | Google | ADVANCED | $2.50 | $10.00 |
| o3-mini | OpenAI | FRONTIER | $1.10 | $4.40 |
| GPT-5 | OpenAI | FRONTIER | $2.50 | $15.00 |
| **Claude Opus 4** | **基準線** | - | **$5.00** | **$25.00** |

API 模式節省：BASIC 任務省 98%，STANDARD 省 94-97%，ADVANCED 省 60-96%。

## 實際範例

### 範例 1：用訂閱額度翻譯文件（免費）

```
你（對 Claude Code）：把這份 README 翻譯成日文

Claude Code 判斷：「翻譯是 Tier 0 任務 — 分派給便宜模型」
Claude Code 呼叫：cli_ask(prompt: "Translate to Japanese: ...", cli: "gemini")

-> Gemini CLI 使用你的 Google AI Studio 訂閱執行
-> 費用：$0（訂閱額度）
-> 節省：約 $0.50 的 Opus Token
```

### 範例 2：自動路由簡單問題（API 模式）

```
你（對 Claude Code）：useEffect 和 useLayoutEffect 有什麼差別？

Claude Code 判斷：「簡單問答，不需要我的程式碼上下文」
Claude Code 呼叫：ask(prompt: "Explain useEffect vs useLayoutEffect in React")

-> 路由器分類為 STANDARD 等級
-> 路由到 Gemini Flash-Lite ($0.10/M) — 最便宜的可用模型
-> 回傳答案 + meta: { saved_percent: 97.8% }
```

### 範例 3：交叉驗證架構決策

```
你（對 Claude Code）：我們該用 Redis 還是 PostgreSQL 做 session store？

Claude Code 判斷：「架構決策有取捨 — Tier 3」
Claude Code 問你：「要我用其他模型交叉驗證嗎？」
你：好，用 multi_ask

Claude Code 呼叫：multi_ask(prompt: "Compare Redis vs PostgreSQL for session storage...")

-> 同時查詢 Gemini Flash + GPT-4.1-mini
-> 回傳 2 個觀點 + 費用摘要
-> Claude 綜合出最終建議
```

### 範例 4：安全稽核搭配深度分析

```
你（對 Claude Code）：/secaudit

-> Claude Code 執行 OWASP Top 10 稽核（Tier 2，結構化方法論）
-> 針對特定漏洞檢查，分派給 ask(tier: "advanced")
-> Claude 綜合成優先排序的報告
```

## FAQ

**Q：這會取代 Claude Code 嗎？**
A：不會。Claude 永遠是頂層大腦，這套工具只是讓 Claude 可以「外包」簡單任務給便宜模型。

**Q：`cli_ask` 真的免費嗎？**
A：是的 — 它啟動 CLI 工具（codex/gemini/kimi），使用你現有的訂閱（ChatGPT Pro、Google AI Studio 等）。不消耗 API 額度。

**Q：我的 API Key 安全嗎？**
A：Key 只在本地使用。MCP Server 作為本地程序運行 — 除了 LLM API 呼叫本身，不會發送到任何外部伺服器。

**Q：可以不用任何 API Key 嗎？**
A：可以 — 安裝 CLI 工具後，只用 `cli_ask` / `/multi-llm` 搭配訂閱額度即可。API Key 只有 `ask` / `multi_ask` 才需要。

## 路線圖與待驗證問題

### 誠實現況

目前的路由器是基於 **regex 關鍵字比對** — 偵測到 "translate" 就分 BASIC、"debug" 就分 ADVANCED。顯而易見的情況可以正確處理，但有明確的局限：

- 我們尚未驗證 Claude Code 是否真的會根據 `analysis-router` SKILL.md 的指示去分派任務
- 節省數字 (60-98%) 是**理論計算** — 基於定價數學，不是從真實 session 量測的
- 關鍵字分類器會誤判：「debug 這個簡單 typo」不應該走 ADVANCED 等級
- 我們還不了解 Claude Code 內部如何決定要不要使用 MCP 工具

### 需要研究的問題

| 問題 | 為什麼重要 | 如何測試 |
|------|-----------|---------|
| Claude 真的會在 SKILL.md 的引導下呼叫 `ask`/`cli_ask` 嗎？ | 如果不會，整個路由層都沒有用 | 紀錄 50+ 次真實 session 的 MCP 工具呼叫 |
| Claude 送多少 context 給 MCP 工具？ | 影響實際 Token 費用 | 擷取每次呼叫的 input/output token 數 |
| Regex 分類夠準嗎？ | 誤路由會浪費錢或品質 | 用 200 個 prompt 比較 regex 等級 vs 人工標註等級 |
| 真實節省 vs 理論節省差多少？ | 需要誠實的數字，不是行銷數字 | A/B 測試：同樣任務有/沒有 toolkit 的費用比較 |
| Claude 什麼時候選擇自己處理 vs 分派？ | 理解決策邊界 | 分析 session log 的分派模式 |

### 計劃改進

**短期 (v2026.4)**
- [ ] Session 層級 Token 紀錄 — 擷取 MCP 工具實際呼叫頻率和 Token 用量
- [ ] 真實場景 benchmark — 20 個常見開發任務，量測實際 vs 基準費用
- [ ] 更聰明的分類器 — 考慮用便宜 LLM (Flash-Lite) 做分類取代 regex
- [ ] 擴充供應商 — DeepSeek、Mistral

**中期**
- [ ] A/B 量測框架 — 同樣的 prompt 有/無 toolkit，比較費用 + 品質
- [ ] Claude Code 行為研究 — 理解 Claude 何時/為何決定使用 MCP 工具
- [ ] 自適應路由 — 從歷史請求學習哪個模型在哪種任務表現最好
- [ ] 品質評分 — 不只選最便宜，而是「夠品質的最便宜」

**長期願景**
- [ ] 自我改進路由 — 用 cost_report 資料回訓路由決策
- [ ] 多輪對話感知 — 根據對話狀態路由，不只看單一 prompt
- [ ] 社群 benchmark — 共享的「任務 → 模型 → 品質分數」資料集

### 參與貢獻

目前最需要的是**真實使用數據**。如果你有使用這個 toolkit，我們想知道：
- 你最常用哪些工具（`cli_ask`？`ask`？斜線指令？）
- 路由判斷錯誤的案例
- 你從 `cost_report` 看到的實際節省數字

歡迎到 [github.com/howardpen9/claude-code-multi-llm](https://github.com/howardpen9/claude-code-multi-llm) 開 issue 或 PR。

## 靈感來源

- [PAL MCP Server](https://github.com/BeehiveInnovations/pal-mcp-server) — Provider 抽象層、多模型編排
- [RouteLLM](https://github.com/lm-sys/RouteLLM) — 成本感知路由研究

## 授權

MIT
