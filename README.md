# 轩屿工作台（my-portfolio）

基于 **Vue 3 + Vite + TypeScript** 的个人工作台，当前包含**接单平台**模块，并预留多模块扩展（项目、日志、仪表盘等）。

## 技术栈

- **框架**：Vue 3（`<script setup>` SFC）+ Vue Router 4（history 模式）+ Pinia
- **样式**：Tailwind CSS v4 + 自封装 shadcn 风格组件
- **图标**：@lucide/vue
- **数据层**：Supabase（Auth + PostgreSQL + RLS）
- **部署**：Cloudflare Pages（Direct Upload，通过 `wrangler pages deploy dist/` 部署）

## 本地开发

```bash
pnpm install
pnpm dev          # 启动开发服务器
pnpm build        # 生产构建 → dist/
pnpm preview      # 本地预览生产构建
```

## 部署

项目使用 Direct Upload 方式部署，每次本地构建后通过 wrangler 推送：

```bash
pnpm build
npx wrangler pages deploy dist/ --project-name my-portfolio --branch main
```

> 部署前需已执行 `npx wrangler login` 完成 Cloudflare 认证。

## 模块

| 模块 | 状态 | 路由 |
|------|------|------|
| 接单平台 | ✅ 已上线 | `/orders` |
| 项目展示 | 🔜 待开发 | 预留 |
| 日志 | 🔜 待开发 | 预留 |
| 仪表盘 | 🔜 待开发 | 预留 |

模块注册表：`src/modules/registry.ts`

## Supabase

数据库 schema 与 RLS 策略位于 `supabase/schema.sql`。需要 Supabase 项目 URL 与 publishable key，写入根目录 `.env`：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Cloudflare Pages Direct Upload 不支持运行时环境变量，因此 Supabase 密钥在**构建时**被 Vite 静态嵌入 `dist/` 产物。请确保 `VITE_SUPABASE_PUBLISHABLE_KEY` 为 publishable key（sb_publishable_ 开头），而非 service_role 密钥。
