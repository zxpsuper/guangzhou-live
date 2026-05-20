# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A VitePress-based blog site ("广州百晓生") using the Curve theme — a custom Vue 3 theme for VitePress focused on local lifestyle content (Guangzhou food,探店, city observations). Static site deployed on Vercel + GitHub Pages.

## Tech Stack

- **Framework**: VitePress 1.5 (static site generator) + Vue 3 + Vite 5
- **State**: Pinia with persisted state plugin
- **Styling**: SCSS (via sass package)
- **Search**: Algolia (via vue-instantsearch + instantsearch.js)
- **Music Player**: APlayer
- **Build**: Terser for minification

## Key Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at port 9877 |
| `npm run build` | Build for production (output to `.vitepress/dist`) |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint check (.js,.vue,.ts files) |
| `npm run format` | Prettier auto-format entire project |
| `npm run deploy:vercel` | Deploy to Vercel via CLI |

## Architecture

### Content Structure

- `posts/YYYY/MMDD.md` — Blog posts. File path = URL path (e.g. `posts/2024/1010.md` → `/posts/2024/1010`). Frontmatter supports: `title`, `tags`, `categories`, `date`, `description`, `articleGPT`, `references`, `cover`, `pin`.
- `pages/*.md` — Static pages (about, archives, categories, tags, link, project, privacy, cc).
- `pages/categories/[name].md` + `[name].paths.mjs` — Dynamic category pages.
- `pages/tags/[name].md` + `[name].paths.mjs` — Dynamic tag pages.
- `page/[num].md` + `[num].paths.mjs` — Home pagination (page/1, page/2, etc.).

### Theme Structure (`.vitepress/theme/`)

- `App.vue` — Root component with layout orchestrator (detects home/post/page routes)
- `components/` — Reusable Vue components (Nav, Footer, Player, Search, Settings, etc.)
- `views/` — Page-level views: Home.vue, Page.vue (static pages), About.vue, Archives.vue, CatOrTag.vue, etc.
- `store/index.js` — Pinia store for global state (theme, scroll, player, settings, background)
- `utils/` — Utilities: post data aggregation, RSS generation, Markdown extensions, Fancybox init, comment init
- `style/` — SCSS files (main, post, animation, font)
- `assets/themeConfig.mjs` — Default theme configuration

### Theme Configuration System

The theme uses a layered config approach:
1. **Default config**: `.vitepress/theme/assets/themeConfig.mjs` — ships with the theme
2. **User override**: `themeConfig.mjs` at project root — automatically merged via `.vitepress/init.mjs`
3. **Post data** (tags, categories, archives) is computed at build time from frontmatter

### Key Config Areas (in themeConfig)

- `siteMeta` — title, description, logo, author, site URL, language
- `cover` — Two-column layout toggle, default cover images for posts
- `comment` — Artalk or Twikoo integration
- `aside` — Sidebar widgets (hello text, TOC, tags, countdown, site stats)
- `music` — APlayer playlist configuration
- `search` — Algolia app ID and API key
- `fancybox` — Image lightbox
- `jumpRedirect` — External link redirect confirmation
- `nav` and `navMore` — Navigation menu structure
- `footer` — Social links and sitemap

### Deployment

- **Vercel**: Primary, configured via `vercel.json` (framework: vitepress, SPA rewrites)
- **GitHub Pages**: `.github/workflows/deploy.yml` — builds on push to master, deploys to `gh-pages` branch
- Post data (RSS) is generated in `buildEnd` hook

## Post Frontmatter

```yaml
---
title: Post Title
tags: [Tag1, Tag2]
categories: [CategoryName]
date: 2024-10-10
description: SEO description
articleGPT: AI summary for sidebar widget
cover: https://example.com/cover.jpg
pin: true  # pin to top
references:
  - title: Reference Name
    url: https://example.com
---
```

## Agent 工作流：当日热门选题

项目内置了一个三步走选题 agent，位于 `plan/agent/` 目录：

1. **搜热题** → `plan/agent/step-1-hot-topics.md` — 从微博/小红书/大众点评/广州日报搜索当日热门
2. **挖素材** → `plan/agent/step-2-sources.md` — 对每个选题深度挖掘热门文章素材
3. **合成稿** → `plan/agent/step-3-drafts.md` — 按风格要求合成候选文章

使用方式：引用对应 prompt 文件的内容执行。产物存入 `plan/hot-topics/`、`plan/sources/`、`plan/drafts/`。