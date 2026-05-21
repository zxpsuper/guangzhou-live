---
description: 爬取小红书笔记，生成 Markdown + WebP 图片
argument-hint: <xiaohongshu-url> [--slug <slug>] [--date <YYYY-MM-DD>] [--tags <tag1,tag2>] [--categories <cat>]
allowed-tools:
  - Bash(python*)
  - Bash(node*)
  - Read
---

## 任务

使用项目内置的小红书爬取脚本，将小红书笔记转换为本博客的 Markdown 文章和 WebP 图片。

用户传入的参数：$ARGUMENTS

## 执行步骤

**第一步：解析参数**

从 `$ARGUMENTS` 中提取：
- `<xiaohongshu-url>`（必填，第一个参数，形如 `https://www.xiaohongshu.com/explore/xxxxxx?xsec_token=...`）
- `--slug <slug>`（可选，文件名，如不填脚本自动生成）
- `--date <YYYY-MM-DD>`（可选，发布日期，如不填脚本会从页面提取）
- `--tags <tag1,tag2>`（可选，逗号分隔的额外标签，笔记自带 #标签 会自动合并）
- `--categories <cat>`（可选，分类）

**第二步：运行爬取脚本**

在项目根目录执行，必须加 UTF-8 参数，超时设为 180 秒：

```
PYTHONIOENCODING=utf-8 python -X utf8 scripts/scrape_xiaohongshu.py <url> [可选参数]
```

例如完整命令：
```
PYTHONIOENCODING=utf-8 python -X utf8 scripts/scrape_xiaohongshu.py https://www.xiaohongshu.com/explore/xxxxxx --slug my-post --tags 广州,生活 --categories 生活指南
```

脚本会依次完成：
1. 用 Puppeteer 以移动端 UA 渲染小红书页面（PC 端需要登录，移动端可免登录）
2. 点击"展开全文"获取完整内容
3. 提取标题、正文、标签、日期、图片
4. 下载所有图片并转换为 WebP 保存到 `public/images/`
5. 生成 Markdown 文件到 `posts/<year>/`

**第三步：读取并展示结果**

脚本完成后，读取生成的 Markdown 文件（路径在脚本输出中），向用户展示：
- 文章标题
- 生成的 Markdown 文件路径
- 下载的图片列表（`public/images/<slug>-NN.webp`）
- 自动提取的标签
- Markdown 文件的前 30 行（供用户预览）

## 注意事项

- 脚本使用移动端 UA 访问小红书（因为 PC 端需要登录），页面加载可能较慢
- 小红书链接中的 `xsec_token` 参数有时效性，如过期需重新获取
- 笔记自带的 #标签 会自动提取并合并到 frontmatter tags 中
- 图片统一放在正文开头（小红书图文没有明确的图片-段落对应关系）
- Python 依赖：`requests`、`Pillow`
- 需要系统已安装 Chrome 或 Edge 浏览器
