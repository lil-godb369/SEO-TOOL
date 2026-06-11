/**
 * Trích link từ HTML bằng cheerio. Tách riêng khỏi `audit.ts` vì phụ thuộc
 * cheerio (chỉ chạy phía server — route handler).
 */
import * as cheerio from "cheerio";
import type { ExtractedLink } from "./audit";

const SKIP_PROTOCOLS = /^(mailto:|tel:|javascript:|data:|sms:|ftp:)/i;

/**
 * Trích toàn bộ <a href> từ HTML, chuẩn hóa thành URL tuyệt đối, loại trùng
 * và phân loại nội bộ/ngoài. Bỏ qua anchor (#), mailto:, tel:, javascript:…
 */
export function extractLinks(html: string, baseUrl: string): ExtractedLink[] {
  const $ = cheerio.load(html);
  let origin = "";
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    /* baseUrl không hợp lệ — coi mọi link là external */
  }

  const seen = new Set<string>();
  const links: ExtractedLink[] = [];

  $("a[href]").each((_, el) => {
    const raw = ($(el).attr("href") || "").trim();
    if (!raw || raw.startsWith("#") || SKIP_PROTOCOLS.test(raw)) return;

    let abs: URL;
    try {
      abs = new URL(raw, baseUrl);
    } catch {
      return;
    }
    if (abs.protocol !== "http:" && abs.protocol !== "https:") return;

    abs.hash = "";
    const url = abs.toString();
    if (seen.has(url)) return;
    seen.add(url);

    const text = $(el).text().replace(/\s+/g, " ").trim();
    links.push({
      url,
      text,
      scope: origin && abs.origin === origin ? "internal" : "external",
    });
  });

  return links;
}
