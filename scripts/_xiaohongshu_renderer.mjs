/**
 * 小红书笔记抓取辅助脚本（Node.js + Puppeteer）
 * 被 scrape_xiaohongshu.py 通过 subprocess 调用，输出 JSON 到 stdout。
 *
 * 用法: node _xiaohongshu_renderer.mjs <url>
 * 输出: JSON { title, author, content, tags, date, imageUrls }
 *
 * 图片去水印原理：
 *   小红书图片有两种 CDN 格式：
 *   1. sns-webpic: http://sns-webpic-qc.xhscdn.com/.../fileId!h5_1080jpg（带水印，去掉后缀 403）
 *   2. sns-na: https://sns-na-i4.xhscdn.com/uuid?imageView2/2/w/1080/format/jpg（带水印）
 *
 *   去水印方法：用 fileId 构造 sns-na 格式 URL，不加 imageView2 参数：
 *   https://sns-na-i4.xhscdn.com/<fileId>  → 返回无水印原图
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
].filter(Boolean);

function findChrome() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * 将带水印的图片 URL 转为无水印原图 URL
 * - sns-na 格式：去掉 ?imageView2 参数
 * - sns-webpic 格式：从 URL 提取 fileId，构造 sns-na 无参 URL
 * - 其他格式：原样返回
 */
function toNoWatermarkUrl(url) {
  try {
    // sns-na 格式：去掉 imageView2 查询参数即可获取原图
    // https://sns-na-i4.xhscdn.com/uuid?imageView2/2/w/1080/format/jpg&sign=...
    if (url.includes('sns-na') && url.includes('imageView2')) {
      const u = new URL(url);
      u.search = '';
      return u.toString();
    }

    // sns-webpic 格式：提取 fileId 构造无水印 URL
    // http://sns-webpic-qc.xhscdn.com/20260521/hash/fileId!h5_1080jpg
    if (url.includes('webpic')) {
      const match = url.match(/\/([0-9a-zA-Z]{20,})(?:!|$)/);
      if (match) {
        const fileId = match[1];
        return `https://sns-na-i4.xhscdn.com/${fileId}`;
      }
    }

    // sns-na 格式但无 imageView2，已经是无水印
    return url;
  } catch {
    return url;
  }
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node _xiaohongshu_renderer.mjs <url>');
    process.exit(1);
  }

  const chromePath = findChrome();
  if (!chromePath) {
    console.error('Error: Chrome/Edge not found. Set CHROME_PATH env variable.');
    process.exit(1);
  }

  const pw = puppeteer.chromium || puppeteer;
  const browser = await pw.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=414,896',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 414, height: 896 });

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
  });

  await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  );

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 10000));

  // 点击"展开全文"
  const expandBtn = await page.$('span.expand');
  if (expandBtn) {
    try {
      await expandBtn.click();
      await new Promise((r) => setTimeout(r, 2000));
    } catch {}
  }

  // 在浏览器中提取结构化数据
  const result = await page.evaluate(() => {
    // 标题
    const titleEl = document.querySelector('#detail-title') || document.querySelector('.title');
    const title = titleEl ? titleEl.textContent.trim() : '';

    // 作者
    const authorEl = document.querySelector('.user-nickname') || document.querySelector('.nickname');
    const author = authorEl ? authorEl.textContent.trim() : '';

    // 正文内容
    const contentEl = document.querySelector('.content-container') || document.querySelector('#detail-desc');
    const content = contentEl ? contentEl.innerText.trim() : '';

    // 日期
    const dateMatch = document.body.innerText.match(/20\d{2}[-/]\d{2}[-/]\d{2}/);
    const date = dateMatch ? dateMatch[0].replace(/\//g, '-') : '';

    // 标签：从正文中提取 #xxx 模式
    const tagPattern = /#([^#\n]+)/g;
    const tags = [];
    let match;
    while ((match = tagPattern.exec(content)) !== null) {
      tags.push(match[1].trim());
    }

    // 从页面 imageList 提取 fileId（优先，最可靠）
    let imageFileIds = [];
    try {
      const scripts = document.querySelectorAll('script');
      for (const s of scripts) {
        const text = s.textContent || '';
        if (!text.includes('imageList')) continue;
        const start = text.indexOf('"imageList":');
        if (start === -1) continue;
        let depth = 0;
        const arrStart = text.indexOf('[', start);
        for (let i = arrStart; i < text.length; i++) {
          if (text[i] === '[') depth++;
          if (text[i] === ']') depth--;
          if (depth === 0) {
            const arr = JSON.parse(text.substring(arrStart, i + 1));
            imageFileIds = arr
              .map(item => item.fileId)
              .filter(Boolean);
            break;
          }
        }
        break;
      }
    } catch {}

    // DOM 中的图片 URL 作为备选
    const allImgs = Array.from(document.querySelectorAll('img'));
    const domImageUrls = allImgs
      .filter((img) => {
        const src = img.src || '';
        const cls = img.className || '';
        if (src.includes('avatar')) return false;
        if (cls.includes('logo') || cls.includes('qrcode')) return false;
        if (src.startsWith('data:')) return false;
        return src.includes('xhscdn.com') && (src.includes('webpic') || src.includes('sns-na'));
      })
      .map((img) => img.src)
      .filter((v, i, a) => a.indexOf(v) === i);

    return { title, author, content, tags, date, imageFileIds, domImageUrls };
  });

  await browser.close();

  // 构造无水印图片 URL 列表
  let imageUrls = [];

  if (result.imageFileIds && result.imageFileIds.length > 0) {
    // 优先用 fileId 构造无水印 URL
    imageUrls = result.imageFileIds.map(
      (fid) => `https://sns-na-i4.xhscdn.com/${fid}`
    );
  } else {
    // 回退：从 DOM 图片 URL 转换
    imageUrls = (result.domImageUrls || []).map(toNoWatermarkUrl);
  }

  const output = {
    title: result.title,
    author: result.author,
    content: result.content,
    tags: result.tags,
    date: result.date,
    imageUrls,
  };

  console.log(JSON.stringify(output));
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
