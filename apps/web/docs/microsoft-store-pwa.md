# Microsoft Store PWA 上架流程

## 仓库内自动化

1. 在 GitHub Actions 手动运行 `PWA Store Build`。
2. 确认 `production_url` 是最终公开 HTTPS 地址，例如 `https://cs.houlang.cloud/`。
3. workflow 会执行 `pnpm run build:store`，生成并校验 `dist/manifest.webmanifest`、`dist/sw.js`、图标、截图和 HTML PWA hint。
4. 下载 `classworks-pwa-dist` 和 `microsoft-store-handoff` artifacts，作为 PWABuilder 或 Partner Center 提交前的构建记录。

## 提交到 Microsoft Store

1. 确保生产站点已部署最新构建，并可通过 HTTPS 访问。
2. 使用 PWABuilder 或 Microsoft Partner Center 指向生产 URL。
3. 填写商店资料：应用分类、年龄分级、隐私政策、支持链接、截图和发布者信息。
4. 如果 manifest、图标、service worker 或公开资源有变更，重新运行 `PWA Store Build`。

## 本地校验

```bash
pnpm run build:store
```

该命令会先刷新音频资源清单，再构建 Vite 应用，最后执行 PWA 构建校验。
