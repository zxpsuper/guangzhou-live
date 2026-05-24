import { createContentLoader } from "vitepress";
import { writeFileSync } from "fs";
import path from "path";

const stripHtml = (html = "") => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const getSearchIndex = async () => {
  let posts = await createContentLoader("posts/**/*.md", {
    render: true,
  }).load();

  posts = posts.sort((a, b) => {
    const dateA = new Date(a.frontmatter.date || 0);
    const dateB = new Date(b.frontmatter.date || 0);
    return dateB - dateA;
  });

  return posts.map(({ url, html, frontmatter }, index) => {
    const { title, description, tags, categories, date } = frontmatter;

    return {
      id: `${url}-${index}`,
      title: title || "未命名文章",
      url,
      description: description || "",
      content: stripHtml(html).slice(0, 4000),
      tags: normalizeList(tags),
      categories: normalizeList(categories),
      date: date ? new Date(date).getTime() : 0,
    };
  });
};

export const createSearchIndex = async (config) => {
  const searchIndex = await getSearchIndex();
  writeFileSync(path.join(config.outDir, "search-index.json"), JSON.stringify(searchIndex), "utf-8");
};
