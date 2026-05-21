#!/usr/bin/env python3
"""
微信公众号文章爬取脚本
用法: python scrape_wechat.py <微信公众号文章链接> [选项]

示例:
  python scrape_wechat.py https://mp.weixin.qq.com/s/xxxxxx
  python scrape_wechat.py https://mp.weixin.qq.com/s/xxxxxx --tags 广州,生活
  python scrape_wechat.py https://mp.weixin.qq.com/s/xxxxxx --date 2024-02-20 --slug my-post

依赖安装:
  pip install Pillow requests
  npm install puppeteer-core   （在项目根目录）
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
RENDERER_SCRIPT = SCRIPT_DIR / "_wechat_renderer.mjs"


# ── 调用 Node.js 渲染器抓取微信公众号 ─────────────────────────────────

def scrape_wechat(url: str) -> dict:
    """调用 _wechat_renderer.mjs 渲染页面，返回结构化数据。"""
    if not RENDERER_SCRIPT.exists():
        print(f"错误：渲染脚本不存在: {RENDERER_SCRIPT}")
        sys.exit(1)

    print(f"[1/4] 正在加载页面: {url}")
    try:
        result = subprocess.run(
            ["node", str(RENDERER_SCRIPT), url],
            capture_output=True,
            text=True,
            timeout=180,
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

    if not data.get("items"):
        print("错误：未能提取到文章内容，可能页面未正确加载或被验证拦截。")
        sys.exit(1)

    print("[2/4] 正在解析文章内容...")
    markdown = _items_to_markdown(data["items"])

    return {
        "title": data["title"],
        "author": data.get("author", ""),
        "markdown": markdown,
        "image_urls": data.get("imageUrls", []),
        "source_url": url,
    }


# ── 结构化数据 → Markdown ──────────────────────────────────────────────

def _items_to_markdown(items: list[dict]) -> str:
    """将 JS 提取的结构化 items 列表转为 Markdown 字符串。"""
    lines: list[str] = []

    for item in items:
        t = item["type"]

        if t in ("h2", "h3", "h4"):
            level = int(t[1])
            lines.append(f"{'#' * level} {item['text']}")
            lines.append("")

        elif t == "p":
            text = item["text"]
            if text:
                lines.append(text)
                lines.append("")

        elif t == "image":
            src = item.get("src", "")
            caption = item.get("caption", "")
            lines.append(f"{{IMG:{src}|{caption}}}")
            lines.append("")

        elif t == "ul":
            for li in item.get("items", []):
                lines.append(f"- {li}")
            lines.append("")

        elif t == "ol":
            for i, li in enumerate(item.get("items", []), 1):
                lines.append(f"{i}. {li}")
            lines.append("")

        elif t == "blockquote":
            for line in item["text"].split("\n"):
                lines.append(f"> {line}")
            lines.append("")

        elif t == "pre":
            lines.append("```")
            lines.append(item["text"])
            lines.append("```")
            lines.append("")

    return "\n".join(lines)


# ── 去重合并相邻段落 ──────────────────────────────────────────────────

def _deduplicate_paragraphs(markdown: str) -> str:
    """去除微信文章中因 section 嵌套导致的重复段落。"""
    lines = markdown.split("\n")
    seen = set()
    result = []
    for line in lines:
        stripped = line.strip()
        # 空行和标题保留
        if not stripped or stripped.startswith("#") or stripped.startswith(">") or stripped.startswith("```"):
            result.append(line)
            continue
        # 图片占位符保留
        if stripped.startswith("{IMG:"):
            result.append(line)
            continue
        # 列表项保留
        if stripped.startswith("- ") or re.match(r"^\d+\.", stripped):
            result.append(line)
            continue
        # 重复段落跳过
        if stripped in seen:
            continue
        seen.add(stripped)
        result.append(line)

    return "\n".join(result)


# ── 微信图片 URL 去水印 ──────────────────────────────────────────────

def _remove_watermark(url: str) -> str:
    """
    去除微信公众号图片水印并获取原图。
    - /640 → /0：获取原始尺寸（非缩放版）
    - watermark=1 → watermark=0：关闭水印
    - 去掉 #imgIndex 片段
    """
    # /640 → /0 获取原图
    url = re.sub(r"/640(?=[/?#]|$)", "/0", url)
    # watermark=1 → watermark=0 去水印
    url = url.replace("watermark=1", "watermark=0")
    # 去掉片段标识符
    url = url.split("#")[0]
    return url


# ── 图片下载 & WebP 转换 ────────────────────────────────────────────────

def download_and_convert_images(markdown: str, slug: str) -> tuple[str, list[str]]:
    """
    下载 Markdown 中的所有图片占位符 {IMG:url|alt}，
    转为 webp 保存到 public/images/，返回替换后的 Markdown 和文件名列表。
    """
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    pattern = re.compile(r"\{IMG:(https?://[^}|]+)\|([^}]*)\}")
    matches = list(pattern.finditer(markdown))

    if not matches:
        return markdown, []

    filenames: list[str] = []
    for i, m in enumerate(matches, 1):
        img_url = _remove_watermark(m.group(1))
        alt_text = m.group(2)
        filename = f"{slug}-{i:02d}"
        webp_path = IMAGES_DIR / f"{filename}.webp"

        print(f"  下载图片 {i}/{len(matches)}: {filename}.webp（去水印原图）")
        try:
            resp = requests.get(
                img_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Referer": "https://mp.weixin.qq.com/",
                },
                timeout=30,
            )
            resp.raise_for_status()

            img = Image.open(io.BytesIO(resp.content))
            if img.mode == "RGBA":
                img = img.convert("RGB")
            img.save(str(webp_path), "WEBP", quality=80)
            filenames.append(f"{filename}.webp")
        except Exception as e:
            print(f"  Warning: image download/convert failed: {e}")
            filenames.append("")

        local_path = f"/images/{filename}.webp"
        replacement = f"![{alt_text}]({local_path})" if alt_text else f"![]({local_path})"
        markdown = markdown.replace(m.group(0), replacement, 1)

    return markdown, filenames


# ── Markdown 清理 ────────────────────────────────────────────────────────

def clean_markdown(md: str) -> str:
    """清理多余空行，去重段落。"""
    md = _deduplicate_paragraphs(md)
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

    tags_str = ", ".join(tags) if tags else "未分类"
    cats_str = ", ".join(categories) if categories else "默认"
    description = data["markdown"].strip().split("\n")[0][:100]

    frontmatter = f"""\
---
title: {data['title']}
tags: [{tags_str}]
categories: [{cats_str}]
date: {date}
description: {description}
references:
  - title: 微信公众号原文
    url: {data['source_url']}
  - title: {data['author']}
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
        description="爬取微信公众号文章，生成 Markdown + WebP 图片",
    )
    parser.add_argument("url", help="微信公众号文章链接，如 https://mp.weixin.qq.com/s/xxxxxx")
    parser.add_argument("--slug", help="文件名 slug（默认自动从标题生成）")
    parser.add_argument("--date", help="发布日期，如 2024-02-20（默认今天）")
    parser.add_argument("--tags", help="标签，逗号分隔，如 广州,生活")
    parser.add_argument("--categories", help="分类，逗号分隔，如 生活指南")
    args = parser.parse_args()

    date = args.date or datetime.now().strftime("%Y-%m-%d")
    tags = [t.strip() for t in args.tags.split(",")] if args.tags else []
    categories = [c.strip() for c in args.categories.split(",")] if args.categories else []

    # 1. 抓取
    data = scrape_wechat(args.url)

    # 2. slug
    slug = args.slug or title_to_slug(data["title"])
    print(f"  标题: {data['title']}")
    print(f"  作者: {data['author']}")
    print(f"  Slug: {slug}")
    print(f"  图片数: {len(data['image_urls'])}")

    # 3. 下载图片 & 转换
    print("[3/4] 正在下载图片并转换为 WebP...")
    data["markdown"], image_files = download_and_convert_images(data["markdown"], slug)

    # 4. 生成文件
    print("[4/4] 正在生成 Markdown 文件...")
    out_path = generate_post(data, slug, date, tags, categories)

    print(f"\nDone!")
    print(f"  文章: {out_path}")
    if image_files:
        print(f"  图片: {IMAGES_DIR}/")
        for f in image_files:
            if f:
                print(f"    - {f}")


if __name__ == "__main__":
    main()
