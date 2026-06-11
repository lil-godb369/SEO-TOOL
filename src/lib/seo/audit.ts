/**
 * Module 3 — Audit kỹ thuật.
 * Các kiểu dữ liệu thuần + hàm phân loại HTTP status và builder
 * robots.txt / sitemap.xml. File này KHÔNG phụ thuộc cheerio nên an toàn để
 * import từ client. Việc trích link (cần cheerio) nằm ở `audit-extract.ts`,
 * còn kiểm tra link (fetch) nằm ở route handler.
 */

export type LinkStatus = "ok" | "redirect" | "broken" | "error";
export type LinkScope = "internal" | "external";

export interface ExtractedLink {
  /** URL tuyệt đối, đã bỏ phần #hash */
  url: string;
  /** Văn bản neo (anchor text) */
  text: string;
  scope: LinkScope;
}

export interface AuditLink extends ExtractedLink {
  status: LinkStatus;
  /** Mã HTTP thực tế (200, 301, 404…) */
  httpStatus?: number;
  /** Đích redirect (nếu là 3xx) */
  redirectTo?: string;
  /** Ghi chú lỗi (timeout, DNS…) */
  note?: string;
}

export interface ResourceProbe {
  url: string;
  present: boolean;
  httpStatus?: number;
}

export interface AuditTotals {
  total: number;
  ok: number;
  redirect: number;
  broken: number;
  error: number;
  internal: number;
  external: number;
}

export interface AuditResult {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  origin: string;
  /** Tổng số link tìm thấy trên trang (trước khi giới hạn) */
  totalFound: number;
  /** Số link thực sự được kiểm tra status */
  checkedCount: number;
  totals: AuditTotals;
  links: AuditLink[];
  robotsTxt: ResourceProbe;
  sitemapXml: ResourceProbe;
  /** URL nội bộ (cùng origin) duy nhất — dùng để gợi ý sinh sitemap */
  internalUrls: string[];
}

/** Số link tối đa được kiểm tra status để tránh quá tải/timeout. */
export const MAX_LINKS_TO_CHECK = 50;

/** Quy đổi mã HTTP thành trạng thái audit. */
export function classifyStatus(httpStatus: number): LinkStatus {
  if (httpStatus >= 200 && httpStatus < 300) return "ok";
  if (httpStatus >= 300 && httpStatus < 400) return "redirect";
  return "broken";
}

/* ----------------------------- robots.txt ----------------------------- */

export interface RobotsInput {
  /** User-agent áp dụng (mặc định "*") */
  userAgent?: string;
  /** Các đường dẫn chặn lập chỉ mục (vd "/admin", "/cart") */
  disallow?: string[];
  /** Các đường dẫn cho phép (ghi đè disallow rộng hơn) */
  allow?: string[];
  /** URL sitemap đầy đủ (vd https://example.com/sitemap.xml) */
  sitemapUrl?: string;
  /** Độ trễ thu thập (giây) — không bắt buộc */
  crawlDelay?: string;
}

/** Sinh nội dung robots.txt từ form. Mặc định cho phép thu thập toàn bộ. */
export function buildRobotsTxt(i: RobotsInput): string {
  const lines: string[] = [];
  lines.push(`User-agent: ${i.userAgent?.trim() || "*"}`);

  const disallow = (i.disallow || []).map((p) => p.trim()).filter(Boolean);
  const allow = (i.allow || []).map((p) => p.trim()).filter(Boolean);

  for (const p of allow) lines.push(`Allow: ${p}`);
  if (disallow.length) {
    for (const p of disallow) lines.push(`Disallow: ${p}`);
  } else {
    // "Disallow:" rỗng = cho phép tất cả
    lines.push("Disallow:");
  }

  if (i.crawlDelay?.trim()) lines.push(`Crawl-delay: ${i.crawlDelay.trim()}`);

  if (i.sitemapUrl?.trim()) {
    lines.push("");
    lines.push(`Sitemap: ${i.sitemapUrl.trim()}`);
  }

  return lines.join("\n") + "\n";
}

/* ----------------------------- sitemap.xml ----------------------------- */

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface SitemapInput {
  urls: string[];
  /** Ngày cập nhật (YYYY-MM-DD). Bỏ trống nếu không muốn thêm <lastmod>. */
  lastmod?: string;
}

/** Sinh nội dung sitemap.xml chuẩn sitemaps.org 0.9 từ danh sách URL. */
export function buildSitemapXml({ urls, lastmod }: SitemapInput): string {
  const seen = new Set<string>();
  const entries = urls
    .map((u) => u.trim())
    .filter(Boolean)
    .filter((u) => {
      if (seen.has(u)) return false;
      seen.add(u);
      return true;
    })
    .map((u) => {
      const loc = `    <loc>${escapeXml(u)}</loc>`;
      const mod = lastmod?.trim()
        ? `\n    <lastmod>${escapeXml(lastmod.trim())}</lastmod>`
        : "";
      return `  <url>\n${loc}${mod}\n  </url>`;
    });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}
