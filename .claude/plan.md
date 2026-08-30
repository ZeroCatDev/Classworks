# Monorepo 完善计划

## 现状

仓库已有基础 monorepo 结构（`apps/web`、`apps/server`、`apps/dashboard`），但存在以下问题：

- `packages/` 声明了但为空 — 没有共享包
- CI 工作流中重复的 setup 步骤（checkout + corepack + node + pnpm install）出现 6 次
- Dockerfile 仍用 `npm install`，未利用 monorepo 上下文和 Docker 层缓存
- Dashboard 含无用的 React 依赖（`@radix-ui/react-slot`、`lucide-react`）
- Server dev 脚本有 typo：`nodemon node .bin/www` → `nodemon ./bin/www`
- 共享常量（服务器 URL、请求头名称）在 17+ 个文件中硬编码
- CLAUDE.md 仍描述单应用结构
- README.md 未反映 monorepo

---

## Phase 1: 创建共享包 `packages/shared`

**新建 `packages/shared` (`@classworks/shared`)**

```
packages/shared/
├── package.json
├── index.js
├── constants.js     # 服务器 URL、请求头名称、API 路径前缀
└── headers.js       # HTTP header 常量
```

内容：

- `HEADER_APP_TOKEN = 'x-app-token'`
- `HEADER_SITE_KEY = 'x-site-key'`
- `HEADER_DEVICE_UUID = 'x-device-uuid'`
- `DEFAULT_KV_SERVER = 'https://kv-service.wuyuan.dev'`
- `DEFAULT_LOCAL_SERVER = 'http://localhost:3030'`
- `CLOUD_SERVERS` 列表

然后在 `apps/web`、`apps/dashboard`、`apps/server` 的 package.json 中添加 `"@classworks/shared": "workspace:*"` 依赖，并逐步替换硬编码的字符串引用。

## Phase 2: CI 统一

**创建 `.github/actions/setup-pnpm/action.yml`** — 可复用的 composite action：

- checkout
- enable corepack
- setup node 22 + pnpm cache
- `pnpm install --frozen-lockfile`

在 `ci.yml`、`deploy.yml`、`store-pwa.yml`、`docker-publish.yml` 中使用此 action 替代重复步骤。

**新增 `deploy-dashboard.yml`** — Dashboard 部署工作流（当 `apps/dashboard/**` 变更时构建并部署）。

## Phase 3: Docker 改进

更新 `apps/server/Dockerfile`：

- 使用 pnpm 代替 npm
- 正确的层缓存（先 COPY package.json + lockfile，再 install，最后 COPY 源码）
- 多阶段构建减小镜像体积

更新 `apps/server/docker-compose.yml` 适配。

## Phase 4: 清理与修复

1. **移除 Dashboard 的 React 依赖**：从 `apps/dashboard/package.json` 中删除 `@radix-ui/react-slot` 和 `lucide-react`
2. **修复 Server dev 脚本**：`"dev": "nodemon node .bin/www"` → `"dev": "nodemon ./bin/www"`
3. **Server 缺少 build 脚本**：添加 `"build": "prisma generate"` 供 CI 使用

## Phase 5: 更新文档

1. **CLAUDE.md** — 重写为 monorepo 结构描述，涵盖所有应用和共享包
2. **README.md** — 更新为 monorepo 概览，包含各应用说明、快速开始、贡献指南
3. **Dependabot** — 添加 `packages/shared` 条目

## Phase 6: 运行验证

- `pnpm install` 验证 workspace 依赖解析
- `pnpm run lint` 验证所有包通过 lint
- `pnpm run build` 验证所有应用可构建（web + dashboard，server 无构建步骤但有 prisma generate）

---

## 不做的事

- **不抽取 `@classworks/api-client`**：Dashboard 的 API client 和 Web 的 API 调用模式差异大，强制统一会增加复杂度。保留各自的实现。
- **不抽取 `@classworks/eslint-config`**：根目录 ESLint 配置是标准 monorepo 模式，单独包化增加复杂度无明显收益。
- **不迁移 TypeScript**：项目明确使用 JavaScript，不引入类型系统。
