# 轩屿工作台

一个面向个人使用的 Vue 3 工作台，集中管理接单项目、健康记录、知识文件、AI 工具与对话。

## 技术栈

- Vue 3 + TypeScript + Vite
- Pinia + Vue Router
- Tailwind CSS v4 + Reka UI
- Supabase Auth / Database / Storage / Edge Functions
- ECharts

## 本地开发

```bash
pnpm install
cp .env.example .env
pnpm dev
```

`.env` 需要配置：

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

浏览器只能使用 Supabase Publishable Key。第三方 AI API Key 保存在数据库中，并由鉴权后的 `ai-chat-proxy` Edge Function 读取；前端无权查询密钥明文。

## 质量检查

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm format:check
```

## 项目结构

```text
src/
  components/          通用组件与 UI 基础组件
  layouts/             全局工作台布局
  modules/             orders / health / knowledge / ai / ai-chat 业务模块
  router/              路由与认证守卫
  stores/              全局认证状态
  views/               路由页面
supabase/
  functions/           Edge Functions
  migrations/          数据库迁移
  config.toml           本地 Supabase 配置
```

## 数据库

首次本地启动 Supabase：

```bash
pnpm dlx supabase start
pnpm dlx supabase db reset
```

新增数据库变更时：

```bash
pnpm dlx supabase migration new descriptive_change
```

当前线上项目早于本地迁移目录创建。第一次连接现有线上项目后，应先登记基线，避免重复执行整套 schema：

```bash
pnpm dlx supabase link --project-ref uctfnwsprgiozsvcrjvm
pnpm dlx supabase migration repair --status applied 20260824070223
```

不要只修改远端数据库；迁移文件、`schema.sql` 和 `database.types.ts` 应同步更新。

## 部署

前端部署说明见 [DEPLOY.md](./DEPLOY.md)。生产环境还需要部署 `supabase/functions/ai-chat-proxy`，并保持 JWT 验证开启。
