---
type: source
source_type: article
title: "WebMCP Challenge：來源核實與策略啟示"
author: "BunOS Research Note"
publication: "OpenAI / Devpost / WebMCP / Chrome / Shopify"
date_consumed: 2026-08-27
rating: 5
tags: [WebMCP, MCP, AI-Agent, Agentic-Web, OpenAI, Shopify, Web-Standards]
related_companies: [OpenAI, Google-Chrome, Shopify, Cloudflare, Vercel, Render, Netlify]
url: "https://openai.com/webmcp-challenge/"
---

# WebMCP Challenge：來源核實與策略啟示

> 核實日期：2026-08-27

## 一句總結

原文的核心消息大致正確：WebMCP 是仍在實驗／提案階段的開放網頁標準，OpenAI 正把它接入 ChatGPT 內建瀏覽器與 ChatGPT Sites，而 Shopify 已公開表示數百萬店面可供支援 WebMCP 的 agent 探索商品與建立購物車；不過活動時間、獎金組成、參賽資格和 WebMCP 與 MCP 的關係需要更精確表述。

## 核實結論

| 原文說法 | 結論 | 核實與修正 |
|---|---|---|
| OpenAI 舉辦 10 天 WebMCP Challenge | ✅ 已證實 | OpenAI 官方稱活動為期 10 天，合作方包括 Google Chrome、Cloudflare、Shopify、Vercel、Render、Netlify。 |
| WebMCP 是實驗性的開放標準 | ✅ 已證實 | OpenAI稱之為 experimental open standard；Chrome 仍稱 proposed standard，並透過 flag／origin trial 測試。因此不應寫成已完成或普遍採納的正式網頁標準。 |
| 網站可向 agent 暴露結構化工具 | ✅ 已證實 | 網頁可用 JavaScript 註冊工具，包含名稱、描述、輸入 schema 與執行函數；agent 可發現及呼叫工具。 |
| WebMCP 不需要 MCP server | ✅ 基本正確，但需補充 | WebMCP 工具在目前頁面／瀏覽器端執行，毋須為同一項前端功能另建遠端 MCP server；但它不是全面取代 MCP，亦不代表網站後端或 API 不再需要。 |
| OpenAI 已把支援加入 ChatGPT 桌面版內建瀏覽器及 Sites | ✅ 已證實 | 官方用語是「正在加入支援」；最新版桌面 app 的內建瀏覽器可直接測試相容網站。功能可能仍受版本及逐步推出影響。 |
| Codex 可自動使用相容網站提供的工具 | ✅ 已證實 | OpenAI表示，造訪相容網站時，ChatGPT 或 Codex 可使用網站工具完成任務。這不等於 agent 可無限制操作；網站暴露的工具、瀏覽器權限與使用者監督仍是邊界。 |
| Shopify 數百萬個店面已準備好 | ✅ 有直接公開聲明支持 | Shopify Distinguished Engineer Ilya Grigorik 公開表示數百萬 Shopify storefronts 已上線並可被 agent 探索目錄、建立購物車。Shopify 官方文件亦證實其 UCP／MCP 商務能力，但「數百萬店面已全面具備完全相同的 WebMCP 能力」目前主要依據仍是該工程主管的公開聲明。 |
| 以 UCP.new／UCP CLI 開發 Shopify 體驗 | ✅ 方向正確 | Shopify 官方文件提供 UCP CLI、AI Toolkit、Global Catalog MCP、Cart／Checkout 等能力。要注意 UCP/MCP 是商務協定與後端工具層，WebMCP 是頁面內工具層；三者可以配合，但不是同一標準。 |
| 報名 8 月 25 日中午 12 時開始 | ⚠️ 官方頁互相不一致 | OpenAI活動頁寫 12:00 p.m. PT；Devpost正式規則寫 11:00 a.m. PT。截止時間兩者同為 9 月 3 日 1:00 p.m. PT。實務上應以 Devpost正式規則及平台狀態為準。 |
| 9 月 23 日公布結果 | ✅ 基本正確 | 正式規則寫約於 9 月 23 日 2:00 p.m. PT；OpenAI並註明可能因提交數量而調整。 |
| 總獎金 $35,000；前十名各 $3,000 | ✅ 但表達易誤解 | OpenAI提供前十名各 $3,000，即 $30,000；Devpost另列 Netlify 每名得獎者 $500 現金，合計標示 $35,000 現金／獎金。其餘包括服務 credits、裝置、訂閱及周邊，不全是現金。 |
| 需要 live app、公開 repo、demo video | ✅ 已證實 | Repo 必須公開並附開源授權；影片需為公開 YouTube、有聲、少於 3 分鐘；亦需文字說明及可操作 live URL。 |
| 評審準則為實用性、原創性、執行品質、WebMCP 巧妙運用及人機互動 | ✅ 大致正確 | 建議提交前直接依 Devpost最新 judging criteria 逐項自評，因總覽文字與正式規則可能更新。 |
| 可用 ChatGPT 或 Chrome 測試 | ✅ 已證實 | ChatGPT in-app browser 原生支援；Chrome 可啟用 `chrome://flags/#enable-webmcp-testing`，或從 Chrome 149 參加 origin trial。 |

## 最重要的修正

### 1. WebMCP 並不是「瀏覽器版本的完整 MCP」

這個比喻有助入門，但技術上過度簡化。

- **MCP**：AI 平台或 client 連接遠端／本機 MCP server，適合後端資料、服務與可在網頁之外執行的工作。
- **WebMCP**：正在瀏覽的頁面把現有前端功能註冊成結構化工具，特別適合人仍看着 UI、與 agent 共同操作的流程。
- **兩者關係**：互補而非替代。WebMCP 官方 explainer 明確把取代 backend integrations、全自動 headless 工作列為非目標。

最準確的說法是：

> MCP 令 agent 連接服務；WebMCP 令 agent 在使用者正在看的網頁內，可靠地使用該頁面明確提供的操作。

## WebMCP 實際怎樣運作

1. 網頁以 `document.modelContext.registerTool()` 註冊工具。
2. 工具提供名稱、用途、輸入 schema 和執行函數。
3. 瀏覽器內的 agent 發現目前頁面可用的工具。
4. Agent 以結構化參數呼叫工具，而不是猜 CSS selector、按鈕位置或畫面座標。
5. 網頁執行既有 client-side logic，更新畫面、呼叫後端 API，並回傳結構化結果。
6. 使用者仍可在同一 UI 看到、審閱或繼續修改結果。

## 為甚麼值得留意

### 1. 網站會由「給人閱讀」變成「同時給人與 agent 操作」

過去網站主要做好 responsive design、SEO 與 accessibility。下一層可能是 **agent readiness**：網站除了頁面和 API，也需要明確說明 agent 能做甚麼、需要甚麼輸入、哪些步驟必須由人確認。

### 2. 它降低脆弱的 UI automation

傳統 browser agent 要讀 screenshot、DOM 或 accessibility tree，再模擬點擊。版面稍改、按鈕重命名或出現彈窗，流程便可能失敗。WebMCP 把重要操作變成有 schema 的工具，理論上會更快、準確和容易測試。

### 3. 網頁 UI 不再被 agent 完全繞過

純後端 agent integration 容易把品牌、內容脈絡、登入狀態和使用者眼前的工作狀態抽離。WebMCP 的設計重心是 human-in-the-loop：agent 在網頁內工作，結果亦可直接呈現在原有 UI。

### 4. Shopify 是真正的放大器

如果大量 Shopify 店面已能讓 agent 結構化搜尋產品和建立購物車，WebMCP 便不只是一個 demo 標準，而是有機會迅速產生大規模、可觀察的商務使用案例。不過付款、身份、授權、退款及交易責任仍需 UCP、MCP、checkout 和商戶政策等其他層處理。

## 不應忽略的限制與風險

- **仍屬實驗階段**：API 名稱、瀏覽器支援和安全模型仍可能改變，不宜把現行寫法視為穩定 production contract。
- **不是任意網站都可用**：網站必須主動實作工具，瀏覽器／agent 亦須支援。
- **工具描述也是安全介面**：網站若暴露過強或驗證不足的工具，agent 的錯誤呼叫可能造成真實後果。
- **高風險動作仍應確認**：付款、刪除、提交法律文件、發送訊息或公開發布，應提供 review／confirm／undo 邊界。
- **網頁狀態有生命週期**：換頁、重新載入、跨 origin、iframe 與長時間工作都比 server-side MCP 更複雜。
- **可用工具不等於可完成所有工作**：官方仍容許在工具不足時退回一般 browser automation。

## 對 BunOS 與現有項目的啟示

### BunOS

不要急於把整個 Obsidian vault 暴露給 agent。較合理的第一步是把幾個高價值、低風險動作工具化，例如：

- 搜尋已確認概念；
- 建立 inbox capture 草稿；
- 建議 project／company／category，但由 Bun 確認後才歸檔；
- 根據 Source-of-Truth 產生一份可審閱的更新差異。

### Tangible Coding

可做一個 teacher-facing lesson studio 概念驗證：教師在同一頁面選年級、學習目標、班級需要及器材數量，agent 呼叫明確工具產生 lesson outline、分組方案、SEND differentiation 和 worksheet 草稿。這比讓 agent 任意操控後台更容易展示 WebMCP 的「人與 agent 共用 UI」價值。

### TenantSide

WebMCP 很適合協助使用者逐步整理 repair timeline、communication log 或 roommate agreement，但法律提交、發送給房東及任何付款／簽署動作必須設明確確認點。TenantSide 的 privacy-first 定位反而可成為參賽差異：只暴露完成任務所需的最少工具與資料。

## Bun 的實際參賽判斷

你以英國／蘇格蘭居民身份原則上屬可參賽地區；正式規則卻明確排除香港居民。因此若參賽，應以你在英國的真實居住與參賽身份填報，不應以香港公司或香港居民身份提交而未先核實資格。

考慮只有約一星期開發時間，最合適的策略不是做大型平台，而是：

1. 選一個你已有 domain knowledge 的單頁工作流；
2. 限定 3–5 個工具；
3. 讓畫面清楚顯示 agent 做過甚麼、等待甚麼確認；
4. 展示「沒有 WebMCP 時很脆弱，有 WebMCP 時很可靠」的對比；
5. 預留時間完成 live deployment、開源 repo、license 與 3 分鐘內 demo。

若以勝算與現有資產衡量，**Tangible Coding Teacher Lesson Studio** 比完整 TenantSide 更適合這次 10 天 challenge：範圍較小、視覺效果清楚、風險較低，而且能具體表達教師與 agent 的共同創作。

## Takeaway

WebMCP 最關鍵的意義，不是「AI 終於可以幫人按網站按鈕」，而是網站開始擁有一層正式的 **agent interaction contract**：開發者定義可做的動作、輸入格式與執行邊界；agent 不再只能從畫面猜測。

短期看，它仍是實驗標準，不能假設跨瀏覽器普及，也不能取代 MCP 或後端 API。中期看，若 ChatGPT、Chrome、Shopify 和部署平台持續共同推進，網站的產品規格很可能由：

> UI + API + accessibility

逐步變成：

> UI + API + accessibility + agent tools

對你的項目而言，最值得現在採取的行動不是全面重構，而是選擇一個低風險、高頻、可審閱的工作流，做 WebMCP prototype，測試它是否真的比現有 browser automation 更可靠。

## 主要來源

- [OpenAI — The WebMCP Challenge](https://openai.com/webmcp-challenge/)
- [Devpost — WebMCP Challenge overview and submission requirements](https://webmcp.devpost.com/)
- [Devpost — Official Rules](https://webmcp.devpost.com/rules)
- [WebMCP GitHub repository and explainer](https://github.com/webmachinelearning/webmcp)
- [Chrome for Developers — WebMCP](https://developer.chrome.com/docs/ai/webmcp)
- [Chrome for Developers — WebMCP origin trial](https://developer.chrome.com/blog/ai-webmcp-origin-trial)
- [Shopify — Build commerce agents with UCP](https://shopify.dev/docs/agents)
- [Shopify — Global Catalog MCP](https://shopify.dev/docs/agents/catalog/global-catalog)
- [Ilya Grigorik — Shopify storefronts WebMCP announcement](https://x.com/igrigorik/status/2092346368438472993)

## Worth re-reading?

**Y。** WebMCP 目前仍快速演進，應在 Chrome origin trial 結束、API 進入穩定版，或 Shopify 公布更完整技術文件時重新核實。

---
**FILING BLOCK:**
SUGGESTED FILENAME: WebMCP Challenge - Source Verification and Takeaway - 2026-08-27.md
LANDS IN: +Inbox/
EVENTUAL DESTINATION: Atlas/Sources/Articles/
NOTES FOR THURSDAY SORT: 可把「Agent Interaction Contract」提升為 Atlas/Concepts/EdTech 或 Business 概念；WebMCP、MCP、UCP 應保持為三個互補但不同的技術層。
---
