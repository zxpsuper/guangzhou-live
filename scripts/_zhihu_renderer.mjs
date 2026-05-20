/**
 * 知乎文章抓取辅助脚本（Node.js + Puppeteer）
 * 被 scrape_zhihu.py 通过 subprocess 调用，输出 JSON 到 stdout。
 *
 * 用法: node _zhihu_renderer.mjs <url>
 * 输出: JSON { title, author, items, imageUrls }
 */
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import path from 'path';

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
    try {
      const { existsSync } = await import('fs');
      if (existsSync(p)) return p;
    } catch {}
  }
  return null;
}

// 在浏览器中执行的 JS，提取结构化内容
const EXTRACT_JS = `() => {
  const title = document.querySelector('.Post-Title')
    ? document.querySelector('.Post-Title').textContent.trim()
    : document.title.replace(' - 知乎', '').trim();

  const author = document.querySelector('.AuthorInfo-name')
    ? document.querySelector('.AuthorInfo-name').textContent.trim()
    : '';

  const contentEl = document.querySelector('.Post-RichTextContainer .RichText')
    || document.querySelector('.Post-RichTextContainer');

  if (!contentEl) return { title, author, items: [], imageUrls: [] };

  const items = [];
  const walk = (el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'h2') {
      items.push({ type: 'h2', text: el.textContent.trim() });
    } else if (tag === 'h3') {
      items.push({ type: 'h3', text: el.textContent.trim() });
    } else if (tag === 'h4') {
      items.push({ type: 'h4', text: el.textContent.trim() });
    } else if (tag === 'figure') {
      const img = el.querySelector('img');
      const caption = el.querySelector('figcaption');
      const src = img ? (img.getAttribute('data-original') || img.getAttribute('src') || '') : '';
      items.push({ type: 'image', src, caption: caption ? caption.textContent.trim() : '' });
    } else if (tag === 'p') {
      items.push({ type: 'p', text: el.textContent.trim() });
    } else if (tag === 'ul' || tag === 'ol') {
      const lis = Array.from(el.querySelectorAll(':scope > li')).map(li => li.textContent.trim());
      items.push({ type: tag, items: lis });
    } else if (tag === 'blockquote') {
      items.push({ type: 'blockquote', text: el.textContent.trim() });
    } else if (tag === 'pre') {
      items.push({ type: 'pre', text: el.textContent.trim() });
    } else if (tag === 'div' || tag === 'span') {
      for (const child of el.children) walk(child);
    }
  };

  for (const child of contentEl.children) walk(child);

  const imgs = Array.from(contentEl.querySelectorAll('img'));
  const imageUrls = imgs
    .map(img => img.getAttribute('data-original') || img.getAttribute('src') || '')
    .filter(Boolean);

  return { title, author, items, imageUrls };
}`;

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node _zhihu_renderer.mjs <url>');
    process.exit(1);
  }

  const chromePath = await findChrome();
  if (!chromePath) {
    console.error('Error: Chrome/Edge not found. Set CHROME_PATH env variable.');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
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

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 8000));

  const result = await page.evaluate(EXTRACT_JS);
  await browser.close();

  // 输出 JSON 到 stdout
  console.log(JSON.stringify(result));
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
