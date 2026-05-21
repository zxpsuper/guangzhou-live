/**
 * 微信公众号文章抓取辅助脚本（Node.js + Puppeteer）
 * 被 scrape_wechat.py 通过 subprocess 调用，输出 JSON 到 stdout。
 *
 * 用法: node _wechat_renderer.mjs <url>
 * 输出: JSON { title, author, items, imageUrls }
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  // Windows
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  // macOS
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  // Linux
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

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node _wechat_renderer.mjs <url>');
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
      '--window-size=1920,1080',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // 反检测
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
  });

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  // 等待文章内容加载
  await page.waitForSelector('#js_content', { timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 3000));

  // 滚动页面以触发懒加载图片
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const height = document.body.scrollHeight;
    const step = 500;
    for (let i = 0; i < height; i += step) {
      window.scrollTo(0, i);
      await delay(200);
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 2000));

  const result = await page.evaluate(() => {
    const title = document.querySelector('#activity-name')
      ? document.querySelector('#activity-name').textContent.trim()
      : document.querySelector('.rich_media_title')
        ? document.querySelector('.rich_media_title').textContent.trim()
        : document.title.replace(' - 微信公众平台', '').trim();

    const author = document.querySelector('#js_name')
      ? document.querySelector('#js_name').textContent.trim()
      : document.querySelector('.rich_media_meta_nickname a')
        ? document.querySelector('.rich_media_meta_nickname a').textContent.trim()
        : '';

    const contentEl = document.querySelector('#js_content');
    if (!contentEl) return { title, author, items: [], imageUrls: [] };

    const items = [];

    // 微信文章中 section 标签常用于分段
    const walk = (el) => {
      const tag = el.tagName.toLowerCase();

      if (tag === 'h1' || tag === 'h2') {
        const text = el.textContent.trim();
        if (text) items.push({ type: 'h2', text });
      } else if (tag === 'h3' || tag === 'h4') {
        const level = tag === 'h3' ? 3 : 4;
        const text = el.textContent.trim();
        if (text) items.push({ type: `h${level}`, text });
      } else if (tag === 'img') {
        // 微信图片懒加载用 data-src
        const src = el.getAttribute('data-src') || el.getAttribute('src') || '';
        if (src && !src.includes('data:image')) {
          items.push({ type: 'image', src, caption: '' });
        }
      } else if (tag === 'figure' || tag === 'mpcpc') {
        const img = el.querySelector('img');
        if (img) {
          const src = img.getAttribute('data-src') || img.getAttribute('src') || '';
          if (src && !src.includes('data:image')) {
            items.push({ type: 'image', src, caption: '' });
          }
        }
      } else if (tag === 'p' || tag === 'span') {
        // 只收集直接文本节点或有意义的行内内容
        const text = el.textContent.trim();
        if (text) items.push({ type: 'p', text });
      } else if (tag === 'ul') {
        const lis = Array.from(el.querySelectorAll(':scope > li')).map(li => li.textContent.trim()).filter(Boolean);
        if (lis.length) items.push({ type: 'ul', items: lis });
      } else if (tag === 'ol') {
        const lis = Array.from(el.querySelectorAll(':scope > li')).map(li => li.textContent.trim()).filter(Boolean);
        if (lis.length) items.push({ type: 'ol', items: lis });
      } else if (tag === 'blockquote') {
        const text = el.textContent.trim();
        if (text) items.push({ type: 'blockquote', text });
      } else if (tag === 'pre') {
        const text = el.textContent.trim();
        if (text) items.push({ type: 'pre', text });
      } else if (tag === 'section' || tag === 'div' || tag === 'article' || tag === 'header') {
        // 递归处理容器元素
        for (const child of el.children) {
          walk(child);
        }
      }
    };

    for (const child of contentEl.children) {
      walk(child);
    }

    // 收集所有图片 URL
    const imgs = Array.from(contentEl.querySelectorAll('img'));
    const imageUrls = imgs
      .map(img => img.getAttribute('data-src') || img.getAttribute('src') || '')
      .filter(src => src && !src.includes('data:image'));

    return { title, author, items, imageUrls };
  });

  await browser.close();

  console.log(JSON.stringify(result));
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
