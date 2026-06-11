import * as cheerio from "cheerio";
import type { CheckStatus, SeoCategory, SeoCheck, SeoResult } from "./types";

const statusScore: Record<CheckStatus, number> = {
  good: 1,
  warning: 0.5,
  error: 0,
};

function scoreCategory(checks: SeoCheck[]): number {
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  if (totalWeight === 0) return 0;
  const earned = checks.reduce(
    (s, c) => s + statusScore[c.status] * c.weight,
    0,
  );
  return Math.round((earned / totalWeight) * 100);
}

/**
 * Phân tích on-page SEO từ HTML thô + URL gốc.
 * Không phụ thuộc môi trường (chạy được ở route handler).
 */
export function analyzeOnPage(html: string, finalUrl: string): Omit<
  SeoResult,
  "url" | "fetchedAt"
> {
  const $ = cheerio.load(html);

  // ---- Thu thập dữ liệu thô ----
  const title = ($("head > title").first().text() || "").trim();
  const metaDesc = ($('meta[name="description"]').attr("content") || "").trim();
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || "";
  const lang = $("html").attr("lang")?.trim() || "";
  const viewport = $('meta[name="viewport"]').attr("content")?.trim() || "";
  const charset =
    $("meta[charset]").attr("charset")?.trim() ||
    ($('meta[http-equiv="Content-Type"]').attr("content") || "");
  const robots = $('meta[name="robots"]').attr("content")?.trim() || "";
  const favicon =
    $('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
      .first()
      .attr("href") || "";

  const h1s = $("h1")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  const h2Count = $("h2").length;

  const images = $("img");
  const imagesMissingAlt = images
    .filter((_, el) => {
      const alt = $(el).attr("alt");
      return alt === undefined || alt.trim() === "";
    })
    .length;

  // Thu thập các loại structured data (JSON-LD) TRƯỚC khi gỡ bỏ <script>
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).text());
      const collect = (node: unknown): void => {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) {
          node.forEach(collect);
          return;
        }
        const obj = node as Record<string, unknown>;
        const t = obj["@type"];
        if (t) {
          (Array.isArray(t) ? t : [t]).forEach((x) =>
            schemaTypes.push(String(x)),
          );
        }
        if (obj["@graph"]) collect(obj["@graph"]);
      };
      collect(parsed);
    } catch {
      /* JSON-LD lỗi cú pháp — bỏ qua */
    }
  });

  // Đếm số từ trong phần thân (loại bỏ script/style)
  $("script, style, noscript").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(" ").length : 0;

  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() || "";
  const ogDesc =
    $('meta[property="og:description"]').attr("content")?.trim() || "";
  const ogImage = $('meta[property="og:image"]').attr("content")?.trim() || "";
  const twitterCard =
    $('meta[name="twitter:card"]').attr("content")?.trim() || "";

  // ---- Danh mục 1: Tiêu đề & mô tả ----
  const titleChecks: SeoCheck[] = [];
  if (!title) {
    titleChecks.push({
      id: "title-presence",
      label: "Thẻ tiêu đề (title)",
      status: "error",
      message: "Trang không có thẻ <title>.",
      suggestion:
        "Thêm thẻ <title> mô tả nội dung trang, chứa từ khóa chính.",
      weight: 3,
    });
  } else {
    const len = title.length;
    const ok = len >= 30 && len <= 60;
    titleChecks.push({
      id: "title-presence",
      label: "Thẻ tiêu đề (title)",
      status: ok ? "good" : "warning",
      value: `${title} (${len} ký tự)`,
      message: ok
        ? "Độ dài tiêu đề hợp lý (30–60 ký tự)."
        : len < 30
          ? "Tiêu đề hơi ngắn — nên 30–60 ký tự."
          : "Tiêu đề hơi dài — Google có thể cắt bớt (nên ≤ 60 ký tự).",
      suggestion: ok
        ? undefined
        : "Điều chỉnh tiêu đề về khoảng 30–60 ký tự và đặt từ khóa quan trọng ở đầu.",
      weight: 3,
    });
  }

  if (!metaDesc) {
    titleChecks.push({
      id: "meta-desc",
      label: "Meta description",
      status: "error",
      message: "Thiếu thẻ meta description.",
      suggestion:
        "Thêm meta description 120–160 ký tự, hấp dẫn và chứa từ khóa để tăng tỉ lệ nhấp (CTR).",
      weight: 2,
    });
  } else {
    const len = metaDesc.length;
    const ok = len >= 120 && len <= 160;
    titleChecks.push({
      id: "meta-desc",
      label: "Meta description",
      status: ok ? "good" : "warning",
      value: `${metaDesc} (${len} ký tự)`,
      message: ok
        ? "Độ dài mô tả hợp lý (120–160 ký tự)."
        : len < 120
          ? "Mô tả hơi ngắn — nên 120–160 ký tự."
          : "Mô tả hơi dài — có thể bị cắt (nên ≤ 160 ký tự).",
      suggestion: ok ? undefined : "Viết lại mô tả trong khoảng 120–160 ký tự.",
      weight: 2,
    });
  }

  // ---- Danh mục 2: Cấu trúc nội dung ----
  const contentChecks: SeoCheck[] = [];
  if (h1s.length === 0) {
    contentChecks.push({
      id: "h1",
      label: "Thẻ H1",
      status: "error",
      message: "Trang không có thẻ H1.",
      suggestion: "Thêm đúng một thẻ <h1> chứa từ khóa chính của trang.",
      weight: 3,
    });
  } else if (h1s.length > 1) {
    contentChecks.push({
      id: "h1",
      label: "Thẻ H1",
      status: "warning",
      value: `${h1s.length} thẻ H1`,
      message: `Có ${h1s.length} thẻ H1 — nên chỉ dùng một H1 cho mỗi trang.`,
      suggestion: "Giữ lại một H1 chính, chuyển các H1 còn lại thành H2/H3.",
      weight: 3,
    });
  } else {
    contentChecks.push({
      id: "h1",
      label: "Thẻ H1",
      status: "good",
      value: h1s[0],
      message: "Trang có đúng một thẻ H1.",
      weight: 3,
    });
  }

  contentChecks.push({
    id: "h2",
    label: "Tiêu đề phụ (H2)",
    status: h2Count > 0 ? "good" : "warning",
    value: `${h2Count} thẻ H2`,
    message:
      h2Count > 0
        ? "Có tiêu đề phụ giúp chia nhỏ nội dung."
        : "Chưa có thẻ H2 — nội dung thiếu cấu trúc phân cấp.",
    suggestion:
      h2Count > 0
        ? undefined
        : "Dùng H2/H3 để chia nội dung thành các phần rõ ràng, dễ đọc.",
    weight: 1,
  });

  contentChecks.push({
    id: "word-count",
    label: "Lượng nội dung",
    status: wordCount >= 300 ? "good" : wordCount >= 100 ? "warning" : "error",
    value: `${wordCount} từ`,
    message:
      wordCount >= 300
        ? "Nội dung đủ dài để Google đánh giá tốt."
        : "Nội dung khá mỏng — trang ít chữ thường khó lên hạng.",
    suggestion:
      wordCount >= 300
        ? undefined
        : "Bổ sung nội dung hữu ích, đầy đủ hơn (thường ≥ 300 từ cho trang nội dung).",
    weight: 1,
  });

  const altOk = images.length === 0 || imagesMissingAlt === 0;
  contentChecks.push({
    id: "img-alt",
    label: "Thuộc tính alt cho ảnh",
    status: altOk ? "good" : imagesMissingAlt <= 2 ? "warning" : "error",
    value:
      images.length === 0
        ? "Không có ảnh"
        : `${imagesMissingAlt}/${images.length} ảnh thiếu alt`,
    message: altOk
      ? "Tất cả ảnh đều có thuộc tính alt."
      : `${imagesMissingAlt} ảnh chưa có alt — ảnh hưởng SEO ảnh & khả năng truy cập.`,
    suggestion: altOk
      ? undefined
      : "Thêm alt mô tả ngắn gọn, có từ khóa khi phù hợp cho từng ảnh.",
    weight: 1,
  });

  // ---- Danh mục 3: Mạng xã hội (Open Graph / Twitter) ----
  const socialChecks: SeoCheck[] = [
    {
      id: "og-title",
      label: "og:title",
      status: ogTitle ? "good" : "warning",
      value: ogTitle || undefined,
      message: ogTitle
        ? "Có tiêu đề khi chia sẻ mạng xã hội."
        : "Thiếu og:title — khi chia sẻ link sẽ hiển thị kém hấp dẫn.",
      suggestion: ogTitle ? undefined : "Thêm <meta property=\"og:title\">.",
      weight: 1,
    },
    {
      id: "og-desc",
      label: "og:description",
      status: ogDesc ? "good" : "warning",
      value: ogDesc || undefined,
      message: ogDesc
        ? "Có mô tả khi chia sẻ mạng xã hội."
        : "Thiếu og:description.",
      suggestion: ogDesc ? undefined : "Thêm <meta property=\"og:description\">.",
      weight: 1,
    },
    {
      id: "og-image",
      label: "og:image",
      status: ogImage ? "good" : "warning",
      value: ogImage || undefined,
      message: ogImage
        ? "Có ảnh đại diện khi chia sẻ."
        : "Thiếu og:image — link chia sẻ không có ảnh thu hút.",
      suggestion: ogImage
        ? undefined
        : "Thêm <meta property=\"og:image\"> (khuyến nghị 1200×630px).",
      weight: 1,
    },
    {
      id: "twitter-card",
      label: "Twitter Card",
      status: twitterCard ? "good" : "warning",
      value: twitterCard || undefined,
      message: twitterCard
        ? "Đã cấu hình hiển thị trên X/Twitter."
        : "Thiếu thẻ twitter:card.",
      suggestion: twitterCard
        ? undefined
        : 'Thêm <meta name="twitter:card" content="summary_large_image">.',
      weight: 0.5,
    },
  ];

  // ---- Danh mục 4: Kỹ thuật cơ bản ----
  const techChecks: SeoCheck[] = [
    {
      id: "lang",
      label: "Thuộc tính lang",
      status: lang ? "good" : "warning",
      value: lang || undefined,
      message: lang
        ? `Đã khai báo ngôn ngữ (lang="${lang}").`
        : "Thẻ <html> thiếu thuộc tính lang.",
      suggestion: lang
        ? undefined
        : 'Thêm lang vào thẻ <html> (vd: <html lang="vi">).',
      weight: 1,
    },
    {
      id: "viewport",
      label: "Viewport (responsive)",
      status: viewport ? "good" : "error",
      value: viewport || undefined,
      message: viewport
        ? "Có thẻ viewport — hiển thị tốt trên di động."
        : "Thiếu thẻ viewport — Google ưu tiên mobile-first.",
      suggestion: viewport
        ? undefined
        : 'Thêm <meta name="viewport" content="width=device-width, initial-scale=1">.',
      weight: 2,
    },
    {
      id: "canonical",
      label: "Thẻ canonical",
      status: canonical ? "good" : "warning",
      value: canonical || undefined,
      message: canonical
        ? "Có canonical giúp tránh trùng lặp nội dung."
        : "Thiếu thẻ canonical.",
      suggestion: canonical
        ? undefined
        : "Thêm <link rel=\"canonical\"> trỏ về URL chuẩn của trang.",
      weight: 1,
    },
    {
      id: "charset",
      label: "Khai báo charset",
      status: charset ? "good" : "warning",
      value: charset || undefined,
      message: charset
        ? "Có khai báo bảng mã ký tự."
        : "Thiếu khai báo charset.",
      suggestion: charset ? undefined : 'Thêm <meta charset="UTF-8">.',
      weight: 0.5,
    },
    {
      id: "favicon",
      label: "Favicon",
      status: favicon ? "good" : "warning",
      value: favicon || undefined,
      message: favicon ? "Có biểu tượng favicon." : "Thiếu favicon.",
      suggestion: favicon
        ? undefined
        : "Thêm favicon để tăng nhận diện thương hiệu trên tab & kết quả tìm kiếm.",
      weight: 0.5,
    },
    {
      id: "robots",
      label: "Chỉ thị robots",
      status: /noindex/i.test(robots) ? "error" : "good",
      value: robots || "(mặc định: cho phép lập chỉ mục)",
      message: /noindex/i.test(robots)
        ? "Trang đang đặt noindex — Google sẽ KHÔNG lập chỉ mục trang này!"
        : "Trang cho phép lập chỉ mục.",
      suggestion: /noindex/i.test(robots)
        ? "Gỡ noindex nếu bạn muốn trang xuất hiện trên Google."
        : undefined,
      weight: 1.5,
    },
    {
      id: "structured-data",
      label: "Dữ liệu có cấu trúc (Schema.org)",
      status: schemaTypes.length ? "good" : "warning",
      value: schemaTypes.length
        ? Array.from(new Set(schemaTypes)).join(", ")
        : undefined,
      message: schemaTypes.length
        ? "Trang có structured data (JSON-LD) — đủ điều kiện hiển thị rich snippet."
        : "Chưa có dữ liệu có cấu trúc — bỏ lỡ cơ hội rich snippet trên Google.",
      suggestion: schemaTypes.length
        ? undefined
        : 'Thêm JSON-LD (vd LocalBusiness, Product) — dùng trang "Structured Data" để tạo nhanh.',
      weight: 1,
    },
  ];

  const categories: SeoCategory[] = [
    {
      id: "title-meta",
      title: "Tiêu đề & Mô tả",
      score: scoreCategory(titleChecks),
      checks: titleChecks,
    },
    {
      id: "content",
      title: "Cấu trúc nội dung",
      score: scoreCategory(contentChecks),
      checks: contentChecks,
    },
    {
      id: "social",
      title: "Mạng xã hội (Open Graph)",
      score: scoreCategory(socialChecks),
      checks: socialChecks,
    },
    {
      id: "technical",
      title: "Kỹ thuật cơ bản",
      score: scoreCategory(techChecks),
      checks: techChecks,
    },
  ];

  const allChecks = categories.flatMap((c) => c.checks);
  const totalWeight = allChecks.reduce((s, c) => s + c.weight, 0);
  const overallScore = Math.round(
    (allChecks.reduce((s, c) => s + statusScore[c.status] * c.weight, 0) /
      totalWeight) *
      100,
  );

  const summary = allChecks.reduce(
    (acc, c) => {
      acc[c.status] += 1;
      return acc;
    },
    { good: 0, warning: 0, error: 0 },
  );

  // ---- SERP preview ----
  let displayUrl = finalUrl;
  try {
    const u = new URL(finalUrl);
    displayUrl =
      u.hostname.replace(/^www\./, "") +
      (u.pathname === "/" ? "" : u.pathname.replace(/\/$/, ""));
  } catch {
    /* giữ nguyên */
  }

  return {
    finalUrl,
    overallScore,
    summary,
    serp: {
      title: title || "(Không có tiêu đề)",
      displayUrl,
      description:
        metaDesc ||
        bodyText.slice(0, 160) ||
        "(Không có mô tả — Google sẽ tự trích từ nội dung trang.)",
    },
    categories,
  };
}
