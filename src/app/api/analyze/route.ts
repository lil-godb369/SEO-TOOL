import { NextResponse } from "next/server";
import { analyzeOnPage } from "@/lib/seo/onpage";
import type { SeoResult } from "@/lib/seo/types";

export const dynamic = "force-dynamic";

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url) throw new Error("Vui lòng nhập một URL.");
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  // Ném lỗi sớm nếu URL không hợp lệ
  try {
    new URL(url);
  } catch {
    throw new Error("URL không hợp lệ. Hãy nhập dạng vd: example.com");
  }
  return url;
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(target, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // Giả lập trình duyệt thật để tránh bị chặn
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 SEO-Tool/1.0",
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
          }). Hãy thử một trang web khác.`,
        },
        { status: 422 },
      );
    }

    const html = await res.text();
    const analysis = analyzeOnPage(html, res.url || target);

    const result: SeoResult = {
      url: target,
      fetchedAt: new Date().toISOString(),
      ...analysis,
    };

    return NextResponse.json(result);
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      {
        error: aborted
          ? "Hết thời gian chờ (15s) khi tải trang. Trang có thể quá chậm hoặc đã chặn truy cập."
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
