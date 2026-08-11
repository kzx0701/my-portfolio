# 部署到 Cloudflare Pages（连接 GitHub 自动部署）

> 目标：把 `my-portfolio`（Vue3 工作台）部署到 Cloudflare Pages，并绑定 `kouzixuan.tech` 域名。
> 效果：以后每次 `git push` 到 GitHub `main` 分支，Cloudflare 自动重新构建部署。

---

## 前置条件

- 已在 GitHub 拥有仓库 `kzx0701/my-portfolio`（代码已 push）。
- 已登录 [Cloudflare Dashboard](https://dash.cloudflare.com)。
- 项目根目录已有 `public/_redirects`（SPA 路由回退，已创建）。

---

## 第 1 步：创建 Pages 项目并连接 Git

1. 登录 Cloudflare Dashboard。
2. 左侧菜单 → **Workers & Pages**。
3. 点右上角 **Create application** → 选 **Pages** 选项卡 → 点 **Connect to Git**。
4. 若未连接 GitHub：点授权，用 GitHub 账号授权 Cloudflare 访问仓库。
5. 选择仓库 `kzx0701/my-portfolio` → 点 **Begin setup**。

---

## 第 2 步：填写构建配置（关键）

在 **Set up builds and deployments** 页面，填写：

| 配置项 | 值 |
|--------|-----|
| Production branch | `main` |
| Framework preset | **Vite**（若无，选 None 并手动填） |
| Build command | `pnpm install --frozen-lockfile && pnpm build` |
| Build output directory | `dist` |
| Root directory | （留空） |
| Node.js 版本 | 选 **22** 或最新的 LTS |

> ⚠️ 必须用 `pnpm install`，因为项目使用 pnpm 管理依赖（有 `pnpm-lock.yaml`）。如果只写 `pnpm build`，Cloudflare 默认先跑 `npm install`，会装不上依赖。

---

## 第 3 步：配置环境变量（部署必需）

展开 **Environment variables**，添加两个变量（值来自本地 `.env`，**未提交到 git**，必须在网页填）：

| 变量名 | 值 |
|--------|-----|
| `VITE_SUPABASE_URL` | `https://uctfnwsprgiozsvcrjvm.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_lASvhU4q87lczcUxcqKpEA_NZHQlqZl` |

> 不填这两个变量，线上前端无法连接 Supabase，登录和接单都会失败。

---

## 第 4 步：保存并部署

1. 点 **Save and Deploy**。
2. 等待构建完成（Cloudflare 会从 GitHub 拉代码 → pnpm install → pnpm build → 部署）。
3. 成功后获得预览域名：`<project-name>.pages.dev`。

---

## 第 5 步：绑定自定义域名 kouzixuan.tech

部署成功后：

1. 进入该 Pages 项目的 **Custom domains**（自定义域名）。
2. 点 **Set up a custom domain**。
3. 输入 `kouzixuan.tech`，点 **Continue**。
4. 按提示处理 DNS：
   - 若 `kouzixuan.tech` 在 Cloudflare 管理：会自动提示加记录，确认即可。
   - 若不在：Cloudflare 会给出 CNAME 记录，到你的域名注册商处添加。

---

## 第 6 步：验证

- 浏览器访问 `https://kouzixuan.tech` 应能打开登录页。
- 访问任意子路由（如 `https://kouzixuan.tech/orders`）不应 404（依赖 `_redirects`）。
- 注册/登录账号后，应能正常新建、管理接单项目。

---

## 后续更新

- 本地改完代码 → `git add`、`git commit`、`git push` → Cloudflare 自动重新部署。
- 环境变量若变更，需在 Cloudflare 页面里同步修改。