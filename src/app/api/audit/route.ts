import { NextResponse } from "next/server";
import {
  classifyStatus,
  MAX_LINKS_TO_CHECK,
  type AuditLink,
  type AuditResult,
  type AuditTotals,
  type LinkStatus,
  type ResourceProbe,
} from "@/lib/seo/audit";
import { extractLinks } from "@/lib/seo/audit-extract";

export const dynamic = "force-dynamic";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 SEO-Tool/1.0";

const PAGE_TIMEOUT = 15000;
const LINK_TIMEOUT = 8000;
const CONCURRENCY = 8;

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url) throw new Error("Vui lòng nhập một URL.");
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  try {
    new URL(url);
  } catch {
    throw new Error("URL không hợp lệ. Hãy nhập dạng vd: example.com");
  }
  return url;
}

/** Chạy fn trên từng phần tử với giới hạn số tác vụ đồng thời. */
async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx]);
    }
  }
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    worker,
  );
  await Promise.all(workers);
  return results;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Kiểm tra một link: HEAD trước, GET dự phòng nếu máy chủ từ chối HEAD. */
async function checkLink(
  link: { url: string; text: string; scope: AuditLink["scope"] },
): Promise<AuditLink> {
  const headers = { "User-Agent": UA };
  const base = { url: link.url, text: link.text, scope: link.scope };

  const attempt = (method: "HEAD" | "GET") =>
    fetchWithTimeout(
      link.url,
      { method, redirect: "manual", headers },
      LINK_TIMEOUT,
    );

  try {
    let res = await attempt("HEAD");
    // Một số máy chủ không hỗ trợ HEAD → thử lại bằng GET
    if ([405, 501, 403, 400].includes(res.status)) {
      try {
        res = await attempt("GET");
      } catch {
        /* giữ kết quả HEAD */
      }
    }

    const httpStatus = res.status;
    const status = classifyStatus(httpStatus);
    const redirectTo =
      status === "redirect"
        ? res.headers.get("location")?.trim() || undefined
        : undefined;

    return { ...base, status, httpStatus, redirectTo };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      ...base,
      status: "error" as LinkStatus,
      note: aborted
        ? "Hết thời gian chờ"
        : e instanceof Error
          ? e.message
          : "Không kết nối được",
    };
  }
}

/** Dò sự tồn tại của một tài nguyên tĩnh (robots.txt, sitemap.xml). */
async function probe(origin: string, path: string): Promise<ResourceProbe> {
  const url = origin + path;
  try {
    const res = await fetchWithTimeout(
      url,
      { method: "GET", redirect: "follow", headers: { "User-Agent": UA } },
      LINK_TIMEOUT,
    );
    return { url, present: res.ok, httpStatus: res.status };
  } catch {
    return { url, present: false };
  }
}

export async function POST(request: Request) {
  let target: string;
  try {
    const body = (await request.json()) as { url?: string };
    target = normalizeUrl(body.url ?? "");
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "URL không hợp lệ." },
      { status: 400 },
    );
  }

  // 1) Tải trang gốc
  let html: string;
  let finalUrl: string;
  try {
    const res = await fetchWithTimeout(
      target,
      {
        redirect: "follow",
        headers: {
          "User-Agent": UA,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "vi,en;q=0.9",
        },
      },
      PAGE_TIMEOUT,
    );
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json(
        {
          error: `URL này trả về nội dung không phải HTML (${
            contentType || "không xác định"
          }).`,
        },
        { status: 422 },
      );
    }
    html = await res.text();
    finalUrl = res.url || target;
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      {
        error: aborted
          ? "Hết thời gian chờ (15s) khi tải trang."
          : `Không tải được trang: ${
              e instanceof Error ? e.message : "lỗi không xác định"
            }`,
      },
      { status: 502 },
    );
  }

  // 2) Trích link + xác định origin
  const allLinks = extractLinks(html, finalUrl);
  let origin = "";
  try {
    origin = new URL(finalUrl).origin;
  } catch {
    /* không xác định được origin */
  }

  // Ưu tiên kiểm tra link nội bộ trước khi chạm trần giới hạn
  const ordered = [...allLinks].sort((a, b) =>
    a.scope === b.scope ? 0 : a.scope === "internal" ? -1 : 1,
  );
  const toCheck = ordered.slice(0, MAX_LINKS_TO_CHECK);

  // 3) Kiểm tra status đồng thời + dò robots/sitemap song song
  const [checked, robotsTxt, sitemapXml] = await Promise.all([
    mapPool(toCheck, CONCURRENCY, checkLink),
    origin
      ? probe(origin, "/robots.txt")
      : Promise.resolve<ResourceProbe>({ url: "", present: false }),
    origin
      ? probe(origin, "/sitemap.xml")
      : Promise.resolve<ResourceProbe>({ url: "", present: false }),
  ]);

  const totals: AuditTotals = {
    total: checked.length,
    ok: 0,
    redirect: 0,
    broken: 0,
    error: 0,
    internal: 0,
    external: 0,
  };
  for (const l of checked) {
    totals[l.status] += 1;
    totals[l.scope] += 1;
  }

  const internalUrls = Array.from(
    new Set(allLinks.filter((l) => l.scope === "internal").map((l) => l.url)),
  );

  const result: AuditResult = {
    url: target,
    finalUrl,
    fetchedAt: new Date().toISOString(),
    origin,
    totalFound: allLinks.length,
    checkedCount: checked.length,
    totals,
    links: checked,
    robotsTxt,
    sitemapXml,
    internalUrls,
  };

  return NextResponse.json(result);
}
