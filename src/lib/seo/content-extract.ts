/**
 * Trích nội dung văn bản từ HTML bằng cheerio (server-only, M5).
 */
import * as cheerio from "cheerio";
import type { ExtractedContent } from "./content";

export function extractContent(html: string, url: string): ExtractedContent {
  const $ = cheerio.load(html);

  // Đọc các thẻ meta TRƯỚC khi gỡ bỏ phần tử
  const title = ($("head > title").first().text() || "").trim();
  const metaDesc = ($('meta[name="description"]').attr("content") || "").trim();
  const h1 = $("h1").first().text().replace(/\s+/g, " ").trim();
  const headings = $("h2, h3")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);

  // Loại bỏ phần không phải nội dung chính
  $(
    "script, style, noscript, nav, header, footer, aside, form, .nav, .menu, .sidebar, .footer, .header",
  ).remove();

  // Ưu tiên <main> hoặc <article> nếu có, nếu không lấy <body>
  const root = $("main").first().length
    ? $("main").first()
    : $("article").first().length
      ? $("article").first()
      : $("body");

  const paragraphCount = root.find("p").length;
  const text = root.text().replace(/\s+/g, " ").trim();

  return { url, title, metaDesc, h1, headings, paragraphCount, text };
}
