#!/usr/bin/env python3
"""
小红书笔记爬取脚本
用法: python scrape_xiaohongshu.py <小红书链接> [选项]

示例:
  python scrape_xiaohongshu.py https://www.xiaohongshu.com/explore/xxxxxx
  python scrape_xiaohongshu.py https://www.xiaohongshu.com/explore/xxxxxx --slug my-post --tags 广州,生活
  python scrape_xiaohongshu.py https://www.xiaohongshu.com/explore/xxxxxx --date 2025-08-14 --categories 生活指南

依赖安装:
  pip install Pillow requests
  需要系统已安装 Chrome 或 Edge 浏览器
"""

import argparse
import hashlib
import io
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import requests
from PIL import Image


# ── 项目路径 ────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
POSTS_DIR = PROJECT_ROOT / "posts"
IMAGES_DIR = PROJECT_ROOT / "public" / "images"
RENDERER_SCRIPT = SCRIPT_DIR / "_xiaohongshu_renderer.mjs"


# ── 调用 Node.js 渲染器抓取小红书 ──────────────────────────────────────

def scrape_xiaohongshu(url: str) -> dict:
    """调用 _xiaohongshu_renderer.mjs 渲染页面，返回结构化数据。"""
    if not RENDERER_SCRIPT.exists():
        print(f"错误：渲染脚本不存在: {RENDERER_SCRIPT}")
        sys.exit(1)

    print(f"[1/4] 正在加载页面: {url}")
    try:
        result = subprocess.run(
            ["node", str(RENDERER_SCRIPT), url],
            capture_output=True,
            text=True,
            timeout=120,
            encoding="utf-8",
            cwd=str(SCRIPT_DIR),
        )
    except FileNotFoundError:
        print("错误：找不到 node 命令，请确保 Node.js 已安装。")
        sys.exit(1)
    except subprocess.TimeoutExpired:
        print("错误：页面加载超时。")
        sys.exit(1)

    if result.returncode != 0:
        print(f"错误：渲染器执行失败:\n{result.stderr}")
        sys.exit(1)

    try:
        data = json.loads(result.stdout.strip())
    except json.JSONDecodeError:
        print(f"错误：渲染器输出不是有效 JSON:\n{result.stdout[:500]}")
        sys.exit(1)

    if not data.get("content") and not data.get("imageUrls"):
        print("错误：未能提取到笔记内容，可能页面未正确加载或需要登录。")
        sys.exit(1)

    print("[2/4] 正在解析笔记内容...")
    markdown = _content_to_markdown(data["content"], data.get("tags", []))

    return {
        "title": data["title"],
        "author": data.get("author", ""),
        "markdown": markdown,
        "image_urls": data.get("imageUrls", []),
        "source_url": url,
        "date": data.get("date", ""),
        "tags_from_note": data.get("tags", []),
    }


# ── 纯文本 → Markdown ─────────────────────────────────────────────────

def _content_to_markdown(content: str, tags: list[str]) -> str:
    """将小红书的纯文本内容转为 Markdown。"""
    lines = content.split("\n")
    cleaned_lines = []
    title = ""
    for line in lines:
        stripped = line.strip()
        # 跳过纯标签行
        if re.match(r"^#[^#]+$", stripped):
            continue
        # 跳过"展开全文"
        if stripped == "展开全文":
            continue
        # 记住标题（第一个非空行）
        if not title and stripped:
            title = stripped
            continue  # 标题已在 frontmatter 中，不在正文重复
        # 跳过日期行
        if re.match(r"^20\d{2}[-/]\d{2}[-/]\d{2}$", stripped):
            continue
        cleaned_lines.append(line)

    text = "\n".join(cleaned_lines).strip()
    return text


# ── 图片下载 & WebP 转换 ────────────────────────────────────────────────

def download_and_convert_images(markdown: str, slug: str, image_urls: list[str]) -> tuple[str, list[str]]:
    """下载图片，转为 webp 保存到 public/images/，在 Markdown 中插入图片链接。"""
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    if not image_urls:
        return markdown, []

    # 在 Markdown 开头插入图片（小红书图片穿插在文字中无明确对应关系，统一放在文首）
    filenames: list[str] = []
    image_section: list[str] = []

    for i, img_url in enumerate(image_urls, 1):
        filename = f"{slug}-{i:02d}"
        webp_path = IMAGES_DIR / f"{filename}.webp"

        print(f"  下载图片 {i}/{len(image_urls)}: {filename}.webp")
        try:
            # 小红书图片可能需要特定 Referer
            resp = requests.get(
                img_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
                    "Referer": "https://www.xiaohongshu.com/",
                },
                timeout=30,
            )
            resp.raise_for_status()

            img = Image.open(io.BytesIO(resp.content))
            if img.mode == "RGBA":
                img = img.convert("RGB")
            img.save(str(webp_path), "WEBP", quality=80)
            filenames.append(f"{filename}.webp")
            image_section.append(f"![图片 {i}](/images/{filename}.webp)")
        except Exception as e:
            print(f"  Warning: image download/convert failed: {e}")
            filenames.append("")

    # 在正文前插入图片
    if image_section:
        markdown = "\n\n".join(image_section) + "\n\n---\n\n" + markdown

    return markdown, filenames


# ── Markdown 清理 ────────────────────────────────────────────────────────

def clean_markdown(md: str) -> str:
    """清理多余空行等。"""
    md = re.sub(r"\n{3,}", "\n\n", md)
    lines = [line.rstrip() for line in md.split("\n")]
    return "\n".join(lines).strip() + "\n"


# ── 自动生成 slug ────────────────────────────────────────────────────────

def title_to_slug(title: str) -> str:
    """标题 → URL-friendly slug。"""
    slug = re.sub(r"[^\w\u4e00-\u9fff-]", "", title)[:20]
    if not slug:
        slug = hashlib.md5(title.encode()).hexdigest()[:8]
    slug = re.sub(r"[\u4e00-\u9fff]+", lambda m: hashlib.md5(m.group().encode()).hexdigest()[:6], slug)
    slug = slug.strip("-").lower()
    return slug or "article"


# ── 生成最终 Markdown 文件 ──────────────────────────────────────────────

def generate_post(data: dict, slug: str, date: str, tags: list[str], categories: list[str]) -> Path:
    """拼装 frontmatter + 正文，写入 posts/YYYY/ 目录。"""
    year = date[:4] if date else str(datetime.now().year)
    post_dir = POSTS_DIR / year
    post_dir.mkdir(parents=True, exist_ok=True)

    # 合并用户指定标签和笔记自带标签
    note_tags = data.get("tags_from_note", [])
    all_tags = list(dict.fromkeys(tags + note_tags))  # 去重保序

    tags_str = ", ".join(all_tags) if all_tags else "未分类"
    cats_str = ", ".join(categories) if categories else "默认"

    # description：取正文第一行纯文本（跳过图片行和分隔线）
    first_text = ""
    for line in data["markdown"].strip().split("\n"):
        stripped = line.strip()
        if stripped.startswith("![") or stripped == "---" or not stripped:
            continue
        first_text = stripped[:100]
        break
    description = first_text or data["title"]

    frontmatter = f"""\
---
title: {data['title']}
tags: [{tags_str}]
categories: [{cats_str}]
date: {date}
description: {description}
references:
  - title: 小红书原文
    url: {data['source_url']}
---"""

    content = clean_markdown(data["markdown"])
    full_text = frontmatter + "\n\n" + content

    out_path = post_dir / f"{slug}.md"
    out_path.write_text(full_text, encoding="utf-8")
    return out_path


# ── CLI 入口 ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="爬取小红书笔记，生成 Markdown + WebP 图片",
    )
    parser.add_argument("url", help="小红书笔记链接")
    parser.add_argument("--slug", help="文件名 slug（默认自动从标题生成）")
    parser.add_argument("--date", help="发布日期，如 2025-08-14（默认从页面提取或今天）")
    parser.add_argument("--tags", help="额外标签，逗号分隔，如 广州,生活（笔记自带标签会自动合并）")
    parser.add_argument("--categories", help="分类，逗号分隔，如 生活指南")
    args = parser.parse_args()

    # 1. 抓取
    data = scrape_xiaohongshu(args.url)

    # 2. 日期：优先用户指定 → 页面提取 → 今天
    date = args.date or data.get("date") or datetime.now().strftime("%Y-%m-%d")

    # 3. 标签：合并用户指定和笔记自带
    user_tags = [t.strip() for t in args.tags.split(",")] if args.tags else []
    categories = [c.strip() for c in args.categories.split(",")] if args.categories else []

    # 4. slug
    slug = args.slug or title_to_slug(data["title"])
    print(f"  标题: {data['title']}")
    print(f"  作者: {data['author']}")
    print(f"  Slug: {slug}")
    print(f"  日期: {date}")
    print(f"  标签: {data.get('tags_from_note', [])}")
    print(f"  图片数: {len(data['image_urls'])}")

    # 5. 下载图片 & 转换
    print("[3/4] 正在下载图片并转换为 WebP...")
    data["markdown"], image_files = download_and_convert_images(
        data["markdown"], slug, data["image_urls"]
    )

    # 6. 生成文件
    print("[4/4] 正在生成 Markdown 文件...")
    out_path = generate_post(data, slug, date, user_tags, categories)

    print(f"\nDone!")
    print(f"  文章: {out_path}")
    if image_files:
        print(f"  图片: {IMAGES_DIR}/")
        for f in image_files:
            if f:
                print(f"    - {f}")


if __name__ == "__main__":
    main()
