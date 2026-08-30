# Classworks

![GitHub](https://img.shields.io/github/license/ZeroCatDev/Classworks?style=flat-square)
![GitHub stars](https://img.shields.io/github/stars/ZeroCatDev/Classworks?style=flat-square)
![GitHub forks](https://img.shields.io/github/forks/ZeroCatDev/Classworks?style=flat-square)
![GitHub issues](https://img.shields.io/github/issues/ZeroCatDev/Classworks?style=flat-square)
![Classworks](./images/banner.png)

适用于班级大屏的作业板小工具

请打开 [https://cs.houlangs.com](https://cs.houlang.cloud) 立刻使用

## 项目结构

本仓库是 **pnpm monorepo**，包含以下应用和共享包：

| 包名                    | 路径              | 说明                                      |
| ----------------------- | ----------------- | ----------------------------------------- |
| `@classworks/web`       | `apps/web`        | 作业板 PWA（Vue 3 + Vuetify 3）           |
| `@classworks/server`    | `apps/server`     | KV 后端（Express 5 + Prisma + Socket.IO） |
| `@classworks/dashboard` | `apps/dashboard`  | 管理面板（Vue 3 + Tailwind 4）            |
| `@classworks/shared`    | `packages/shared` | 共享常量（请求头、服务器地址）            |

## 交流

QQ：[964979747](https://qm.qq.com/q/4RX45b1Oac)

## 📦 快速开始

### 环境准备

- Node.js 20+
- pnpm 9+

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/ZeroCatDev/Classworks.git
cd Classworks

# 安装依赖
pnpm install

# 启动所有开发服务器
pnpm run dev

# 或启动单个应用
pnpm run dev:web          # 作业板 PWA (localhost:3031)
pnpm run dev:server       # KV 后端 (localhost:3000)
pnpm run dev:dashboard    # 管理面板

# 构建生产版本
pnpm run build

# 代码检查
pnpm run lint
pnpm run format:check
```

### 后端配置

`apps/server` 需要 PostgreSQL 数据库。复制环境变量模板后配置：

```bash
cp apps/server/.env.example apps/server/.env
# 编辑 .env 设置 DATABASE_URL 等
```

### Docker 部署

```bash
docker build -f apps/server/Dockerfile -t classworks .
docker run -p 3000:3000 -e DATABASE_URL=your_db_url classworks
```

## 🤝 参与贡献

Classworks 非常欢迎你的加入！[提一个 Issue](https://github.com/ZeroCatDev/Classworks/issues/new) 或者提交一个 Pull Request。对于小白问题，最好在 qq 群里问，我们会尽量回答。

ZeroCat 的项目 遵循 [Contributor Covenant](http://contributor-covenant.org/version/1/3/0/) 行为规范
<br/>孙悟元 希望你遵循 [提问的智慧](https://github.com/ryanhanwu/How-To-Ask-Questions-The-Smart-Way/blob/main/README-zh_CN.md)

## 👥 联系我们

- QQ交流群：964979747
- 开发者：[@SunWuyuan](https://github.com/Sunwuyuan)
- 官网：[ZeroCat](https://zerocat.dev)

## 🙏 致谢

感谢所有为项目做出贡献的开发者！

## 📄 开源协议

ZeroCat 社区项目遵循 [AGPL-3.0 许可证](LICENSE)。

Copyright (C) 2020-2026 Sunwuyuan.
