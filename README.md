# 威拓星耀 (Vectoflare) — 全球市场开发方案集成商

基于 **Astro v6** + **Tailwind CSS v4** 构建的品牌官网，为外贸企业提供一站式全球市场开发服务展示平台。

- ✅ **Production-ready** — Google PageSpeed 评分 90+
- ✅ **Tailwind CSS v4** — 支持暗黑模式
- ✅ **SEO 友好博客** — 自动 RSS 生成、MDX 支持、分类与标签、社交分享
- ✅ **图片优化** — Astro Assets + Unpic CDN
- ✅ **站点地图** — 自动生成 sitemap
- ✅ **Open Graph** — 社交媒体分享标签
- ✅ **搜索功能** — 全站内容搜索
- ✅ **多页面路由** — 品牌展示、服务说明、套餐定价、博客新闻等

## 目录

- [快速开始](#快速开始)
  - [项目结构](#项目结构)
  - [常用命令](#常用命令)
  - [配置说明](#配置说明)
- [页面导航](#页面导航)
- [内容管理](#内容管理)
  - [博客文章](#博客文章)
  - [产品数据](#产品数据)
- [自定义样式](#自定义样式)
- [部署](#部署)
- [许可证](#许可证)

---

## 快速开始

> **要求:** Node.js >= 22.12.0

```shell
npm install
npm run dev
```

访问 `http://localhost:4321/` 查看开发服务器。

### 项目结构

```
/
├── public/                     # 静态资源（robots.txt, _headers 等）
├── src/
│   ├── assets/
│   │   ├── favicons/           # 网站图标
│   │   ├── images/             # 图片资源
│   │   └── styles/
│   │       └── tailwind.css    # Tailwind CSS v4 配置
│   ├── components/
│   │   ├── blog/               # 博客组件（列表、详情、分页、标签等）
│   │   ├── common/             # 通用组件（搜索、主题切换、元数据、图片等）
│   │   ├── ui/                 # UI 基础组件（按钮、表单、时间线等）
│   │   ├── widgets/            # 页面区块组件（Hero、Features、FAQ、CTA 等）
│   │   ├── CustomStyles.astro  # CSS 变量（颜色、字体）
│   │   ├── Favicons.astro      # Favicon 加载
│   │   └── Logo.astro          # Logo 组件
│   ├── content.config.ts       # 内容集合定义（博客、产品）
│   ├── data/
│   │   ├── post/               # 博客文章 (.md / .mdx)
│   │   └── product/            # 产品数据（可扩展）
│   ├── layouts/                # 页面布局
│   │   ├── Layout.astro        # 基础布局
│   │   ├── PageLayout.astro    # 标准页面布局
│   │   └── MarkdownLayout.astro # Markdown 文章布局
│   ├── pages/                  # 页面路由
│   │   ├── [...blog]/          # 博客路由（列表/文章/分类/标签）
│   │   ├── products/           # 产品路由（分类/详情）
│   │   ├── about.astro         # 关于我们
│   │   ├── brand-service.astro # 品牌推广
│   │   ├── contact.astro       # 联系我们
│   │   ├── GEO-service.astro   # GEO 优化
│   │   ├── index.astro         # 首页
│   │   ├── pricing.astro       # 服务套餐
│   │   ├── services.astro      # 服务项目
│   │   └── ...                 # 其他页面
│   ├── utils/                  # 工具函数
│   │   ├── blog.ts             # 博客数据查询
│   │   ├── product.ts          # 产品数据查询
│   │   ├── permalinks.ts       # URL 生成
│   │   ├── images.ts           # 图片处理
│   │   ├── utils.ts            # 通用工具（日期格式化等）
│   │   └── frontmatter.ts      # Markdown 处理
│   ├── config.yaml             # 站点全局配置
│   ├── navigation.ts           # 导航菜单配置
│   └── types.d.ts              # TypeScript 类型定义
├── astro.config.ts             # Astro 构建配置
└── package.json
```

### 常用命令

| 命令                  | 说明                                |
| --------------------- | ----------------------------------- |
| `npm run dev`         | 启动开发服务器 `localhost:4321`     |
| `npm run build`       | 构建生产版本到 `./dist/`            |
| `npm run preview`     | 本地预览生产构建                     |
| `npm run check`       | 运行 Astro 检查 + ESLint + Prettier |
| `npm run fix`         | 自动修复 ESLint + Prettier 问题     |
| `npm run astro ...`   | 运行 Astro CLI 命令                 |

### 配置说明

主要配置文件 `src/config.yaml`：

```yaml
site:
  name: Vectoflare                    # 站点名称
  site: 'https://vectoflare.com'      # 站点域名
  base: '/'                           # 基础路径
  trailingSlash: false                 # URL 是否以 / 结尾

metadata:
  title:
    default: Vectoflare                # 默认标题
    template: '%s — Vectoflare'        # 标题模板
  description: "..."                   # 默认描述
  robots: { index: true, follow: true }
  openGraph:
    site_name: Vectoflare
    images: [{ url: '~/assets/images/default.png', width: 1200, height: 628 }]
    type: website
  twitter:
    handle: '@Vectoflare'
    site: '@Vectoflare'
    cardType: summary_large_image

i18n:
  language: zh-CN                      # 语言
  textDirection: ltr                   # 文字方向

apps:
  blog:
    isEnabled: true                    # 启用博客
    postsPerPage: 6                    # 每页文章数
    post:
      isEnabled: true
      permalink: '/%slug%'             # 文章链接格式
    list:
      isEnabled: true
      pathname: 'news'                 # 博客路径
    category:
      isEnabled: true
      pathname: 'category'
    tag:
      isEnabled: true
      pathname: 'tag'
    isRelatedPostsEnabled: true
    relatedPostsCount: 4

analytics:
  vendors:
    googleAnalytics: { id: null }      # Google Analytics ID

ui:
  theme: 'system'                      # 主题：system | light | dark
```

---

## 页面导航

导航菜单定义在 `src/navigation.ts`，分为顶部导航和页脚导航：

### 顶部导航

| 菜单       | 子菜单                                                      |
| ---------- | ----------------------------------------------------------- |
| 首页       | 网站服务 / 客户数据库搭建 / GEO优化 / 品牌推广              |
| 研发中心   | —                                                            |
| 产品中心   | 工作流定制 / 专业工具定制                                   |
| 技术支持   | 关于我们 / 联系我们 / 新闻                                  |
| 社交媒体   | —                                                            |

### 页脚导航

| 产品服务             | 关于               | 支持               |
| -------------------- | ------------------ | ------------------ |
| 工作流定制           | 关于我们           | 联系我们           |
| 专业工具定制         | 研发中心           | 服务条款           |
|                      | 新闻               | 隐私政策           |

---

## 内容管理

### 博客文章

文章文件位于 `src/data/post/`，支持 `.md` 和 `.mdx` 格式。

**Frontmatter 字段：**

```yaml
---
title: 文章标题              # 必填
publishDate: 2025-01-15     # 发布日期
updateDate: 2025-06-01      # 更新日期（可选）
draft: false                # 是否为草稿
excerpt: 文章摘要            # 文章摘要
image: /path/to/image.jpg   # 封面图片
category: Tutorials         # 分类
tags:                       # 标签
  - 标签1
  - 标签2
author: 威拓星耀             # 作者
metadata:                   # SEO 元数据（可选）
  title: 自定义标题
  description: 自定义描述
---
```

**内置分类：** `documentation`、`tutorials`、`news`

**特性：**
- 自动生成 RSS 订阅（`/rss.xml`）
- 支持分类和标签筛选（`/category/`、`/tag/`）
- 相关文章推荐
- 阅读时间估算
- 社交分享

### 产品数据

产品数据位于 `src/data/product/`，支持 `.md` 和 `.mdx` 格式。通过 Astro Content Collections 动态加载，自动生成产品分类页和详情页。

**Frontmatter 字段：**

```yaml
---
title: 产品名称
category: 产品分类            # 用于分组和分类页
description: 产品描述
images:
  - /path/to/image1.jpg
  - /path/to/image2.jpg
specifications:
  - label: 规格1
    value: 参数1
  - label: 规格2
    value: 参数2
applications: 应用领域说明
features:
  - 特性1
  - 特性2
draft: false
---
```

**路由：**
- `/products/` — 产品分类列表
- `/products/[category]/` — 某分类下的产品列表
- `/products/[category]/[slug]/` — 产品详情页

---

## 自定义样式

所有样式基于 Tailwind CSS v4，采用 CSS-first 配置方式。

### 主题颜色和字体

- `src/components/CustomStyles.astro` — CSS 变量定义（颜色、字体）
- `src/assets/styles/tailwind.css` — Tailwind 主题令牌（`@theme`）、自定义工具类（`@utility`）、插件

### 暗黑模式

基于 class 的暗黑模式切换，通过右上角主题切换按钮控制。支持 `system`、`light`、`dark` 三种模式。

---

## 部署

### 生产构建

```shell
npm run build
```

构建产物位于 `dist/` 目录，可直接部署到任何静态托管服务。

### 支持的托管平台

- **Cloudflare Pages** — 自动部署（项目已配置 Cloudflare CI）
- **Netlify** — 连接 GitHub 仓库自动部署
- **Vercel** — 连接 GitHub 仓库自动部署
- **任何静态托管** — 上传 `dist/` 目录即可

---

## 许可证

本项目基于原始 [AstroWind](https://github.com/arthelokyo/astrowind) 模板定制，遵循 MIT 许可证 — 详见 [LICENSE](./LICENSE.md) 文件。
