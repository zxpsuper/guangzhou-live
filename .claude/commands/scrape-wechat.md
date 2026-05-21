---
description: 爬取微信公众号文章，生成 Markdown + WebP 图片
argument-hint: <wechat-url> [--slug <slug>] [--date <YYYY-MM-DD>] [--tags <tag1,tag2>] [--categories <cat>]
allowed-tools:
  - Bash(python*)
  - Bash(node*)
  - Read
---

## 任务

使用项目内置的微信公众号爬取脚本，将微信公众号文章转换为本博客的 Markdown 文章和 WebP 图片。

用户传入的参数：$ARGUMENTS

## 执行步骤

**第一步：解析参数**

从 `$ARGUMENTS` 中提取：
- `<wechat-url>`（必填，第一个参数，形如 `https://mp.weixin.qq.com/s/xxxxxx`）
- `--slug <slug>`（可选，文件名，如不填脚本自动生成）
- `--date <YYYY-MM-DD>`（可选，发布日期，如不填默认今天）
- `--tags <tag1,tag2>`（可选，逗号分隔的标签）
- `--categories <cat>`（可选，分类）

**第二步：运行爬取脚本**

在项目根目录执行，必须加 UTF-8 参数，超时设为 180 秒：

```
PYTHONIOENCODING=utf-8 python -X utf8 scripts/scrape_wechat.py <url> [可选参数]
```

例如完整命令：
```
PYTHONIOENCODING=utf-8 python -X utf8 scripts/scrape_wechat.py https://mp.weixin.qq.com/s/xxxxxx --slug my-post --date 2024-02-20 --tags 广州,生活 --categories 生活指南
```

脚本会依次完成：
1. 用 Puppeteer 渲染微信公众号页面，等待内容加载并滚动触发懒加载图片
2. 提取文章结构化内容（标题、作者、段落、图片等）
3. 去除因 section 嵌套导致的重复段落
4. 下载所有图片并转换为 WebP 保存到 `public/images/`
5. 生成 Markdown 文件到 `posts/<year>/`

**第三步：读取并展示结果**

脚本完成后，读取生成的 Markdown 文件（路径在脚本输出中），向用户展示：
- 文章标题和公众号名称
- 生成的 Markdown 文件路径
- 下载的图片列表（`public/images/<slug>-NN.webp`）
- Markdown 文件的前 30 行（供用户预览）

## 注意事项

- 脚本需要系统已安装 Chrome 或 Edge 浏览器（自动检测）
- Python 依赖：`requests`、`Pillow`（需提前安装）
- Node.js 依赖：`puppeteer-core`（项目根目录 `node_modules` 已有）
- 微信文章图片使用懒加载（`data-src`），脚本会滚动页面确保图片全部加载
- 如果遇到验证页面拦截，可在浏览器中手动完成验证后重试，或使用已登录的 cookie
- Windows 下 Python 命令可能是 `python` 或 `python3`，优先用 `python`
