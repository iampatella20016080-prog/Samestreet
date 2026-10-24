# ANTIGRAVITY.md：《同一條街》專案規則

給 AI 協作者（Claude、Codex 等）的補充規則。

## 開始前必讀
1. `遊戲製作說明.md`：技術與互動以此為準
2. `同一條街_劇本.md`：台詞與流程以此為準（衝突時台詞聽劇本）
3. `game/CHANGELOG.md`：特別是其他 AI 的最新修改，避免覆蓋美術改動

## 規則
- 不用 npm／Vite 等建置工具；雙擊 `game/index.html` 用 Chrome 就要能跑
- 本地 JS 用一般 `<script src>`，透過全域 `window.SS` 溝通，不用 ES module
- Three.js 固定 `three@0.149.0` UMD 版
- 每次修改後更新 `game/CHANGELOG.md`：做了什麼、改了哪些檔案、還沒做什麼
- 大改前先備份原檔到 `普社/` 根目錄（命名如 `xxx備份_HHMMSS.js`）
- 修改後用 Chrome 實際載入驗證，console 不能有紅字

## 第二大腦
- 專案空間：`~/Library/Mobile Documents/com~apple~CloudDocs/secondbrain/專案/普社報告-同一條街/README.md`

## 版本控制
- 2026-10-24 起用 Git（在 Mac 上初始化）；`*.zip` 不進版控
- 倉庫在 iCloud Drive 裡：若出現 `* 2.*` 之類的衝突副本，先別 commit，回報再處理
