import { NextResponse } from "next/server";
import { parsePsi, type Strategy, type VitalsResult } from "@/lib/seo/vitals";

export const dynamic = "force-dynamic";

const PSI_ENDPOINT =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

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
  let strategy: Strategy = "mobile";
  try {
    const body = (await request.json()) as { url?: string; strategy?: string };
    target = normalizeUrl(body.url ?? "");
    if (body.strategy === "desktop") strategy = "desktop";
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "URL không hợp lệ." },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    url: target,
    strategy,
    category: "performance",
  });
  const key = process.env.PAGESPEED_API_KEY;
  if (key) params.set("key", key);

  // PSI có thể mất 30–60s
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await fetch(`${PSI_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
    });
    const data = await res.json();

    if (!res.ok) {
      const msg: string = data?.error?.message || "";
      if (res.status === 429) {
        return NextResponse.json(
          {
            error:
              "Đã hết quota Google PageSpeed Insights. Hãy đặt biến môi trường " +
              "PAGESPEED_API_KEY bằng một API key miễn phí (Google Cloud Console) rồi thử lại.",
          },
          { status: 429 },
        );
      }
      if (res.status === 400 || res.status === 422) {
        return NextResponse.json(
          {
            error:
              "Google không phân tích được URL này (trang có thể chặn truy cập hoặc không tồn tại).",
          },
          { status: 422 },
        );
      }
      return NextResponse.json(
        { error: msg || `Lỗi PageSpeed Insights (HTTP ${res.status}).` },
        { status: 502 },
      );
    }

    const result: VitalsResult = parsePsi(data, strategy, target);
    return NextResponse.json(result);
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      {
        error: aborted
          ? "Hết thời gian chờ (90s) khi đo hiệu năng. Hãy thử lại."
          : `Không gọi được PageSpeed Insights: ${
              e instanceof Error ? e.message : "lỗi không xác định"
            }`,
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
