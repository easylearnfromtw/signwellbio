# SIGN WELL → Danny / signwellbio

程式基底：R10.3 Subscriber360 Foundation（2026-09-30）。
公開資料：980510linz/signwell 目前預設分支；文章與主題索引均為空陣列。

- 公開網站：https://easylearnfromtw.github.io/signwellbio/
- CMS：https://easylearnfromtw.github.io/signwellbio/cms/
- CMS 保留原登入流程，公開導覽無入口，CMS 頁面設定 noindex。
- 公開站 Service Worker 不攔截或快取 cms 路徑。
- 獨立路徑不等於伺服器端存取控制；知道網址仍能打開登入頁。

## 尚需完成的外部設定

1. 程式碼目標為既有的 easylearnfromtw/signwellbio（main）。
2. GitHub Pages 設為 main、根目錄。
3. Apps Script 後端 GitHub owner/repo/branch 改為 easylearnfromtw/signwellbio/main，public URL 與 CMS canonical URL 改成上列網址；設定具目標 repo 寫入權限的後端憑證。
4. 後端允許的 CMS origin 改成 https://easylearnfromtw.github.io；若啟用 Passkey，更新 Worker 的 RP ID/origin 並重新註冊 Passkey。原站 Passkey 不可直接跨網域使用。
5. 確認訂閱／電子報後端的確認信與退訂連結採新網址。本包未修改遠端 Apps Script 或 Worker。
6. 登入、建立草稿、發布測試文章，確認只寫入新 repo，再確認公開頁面。

此包尚未做線上登入或文章發布驗證；不代表 DNS 或原 signwell.com.tw 網域已移轉。
Subscriber360 保留原本停用設定。
