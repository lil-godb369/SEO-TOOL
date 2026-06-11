import { NextResponse } from "next/server";
import { analyzeContent, type ContentResult } from "@/lib/seo/content";
import { extractContent } from "@/lib/seo/content-extract";

export const dynamic = "force-dynamic";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 SEO-Tool/1.0";

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

export async function POST(request: Request) {
  let target: string;
  let keyword: string | undefined;
  try {
    const body = (await request.json()) as { url?: string; keyword?: string };
    target = normalizeUrl(body.url ?? "");
    keyword = body.keyword?.trim() || undefined;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "URL không hợp lệ." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(target, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi,en;q=0.9",
      },
    });

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

    const html = await res.text();
    const finalUrl = res.url || target;
    const extracted = extractContent(html, finalUrl);
    const analysis = analyzeContent(extracted, keyword);

    const result: ContentResult = {
      url: target,
      finalUrl,
      fetchedAt: new Date().toISOString(),
      ...analysis,
    };
    return NextResponse.json(result);
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
  } finally {
    clearTimeout(timeout);
  }
}
