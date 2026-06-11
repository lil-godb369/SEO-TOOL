@AGENTS.md

# SEO Tool — Ghi nhớ dự án

Web app phân tích & tối ưu SEO (tiếng Việt). Người dùng nhập URL bất kỳ → nhận
điểm SEO + checklist kèm gợi ý sửa; ngoài ra có trình tạo dữ liệu có cấu trúc.

## Stack & quy ước

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**.
- ⚠️ Next.js 16 có breaking changes — đọc `node_modules/next/dist/docs/` trước khi
  viết code Next (xem AGENTS.md).
- **KHÔNG dùng shadcn/ui** — component tự viết bằng Tailwind. Helper `cn()` ở
  `src/lib/utils.ts`. Input/Select/TextArea/CopyButton dùng lại ở
  `src/components/ui/fields.tsx`.
- Phân tích HTML phía **server** bằng **Cheerio** (tránh CORS). Icon: `lucide-react`.
- Toàn bộ UI tiếng Việt. Bảng màu/biến CSS định nghĩa trong `src/app/globals.css`
  (`--primary`, `--good`/`--warning`/`--error`, `--card`, `--muted`…).
- Chạy: `npm run dev` (cổng 3000 hay bị chiếm → Next tự nhảy 3001).

## Cấu trúc

```
src/
├── app/
│   ├── layout.tsx              # lang="vi", metadata, gắn <SiteHeader/>
│   ├── page.tsx                # M1: Dashboard phân tích (client component)
│   ├── audit/page.tsx          # M3: Audit kỹ thuật + generator (client component)
│   ├── vitals/page.tsx         # M4: Core Web Vitals (client component)
│   ├── content/page.tsx        # M5: Phân tích nội dung & từ khóa (client component)
│   ├── schema/page.tsx         # M2: Trình tạo JSON-LD (client component)
│   └── api/                    # analyze(M1) · audit(M3) · vitals(M4) · content(M5)
├── components/
│   ├── SiteHeader.tsx          # Thanh điều hướng 5 tab
│   ├── ScoreRing.tsx           # Vòng tròn điểm số (SVG) — dùng cả ở M1 & M4
│   └── ui/fields.tsx           # Field/TextAreaField/SelectField/CopyButton
└── lib/
    ├── utils.ts                # cn()
    └── seo/
        ├── types.ts            # Kiểu kết quả phân tích (SeoResult, SeoCheck…)
        ├── onpage.ts           # ⭐ Logic chấm điểm on-page (M1)
        ├── schema.ts           # ⭐ Builder JSON-LD (M2)
        ├── audit.ts            # ⭐ classifyStatus + builder robots/sitemap (M3, thuần)
        ├── audit-extract.ts    # extractLinks bằng cheerio — server-only (M3)
        ├── vitals.ts           # ⭐ parsePsi: PageSpeed Insights → VitalsResult (M4, thuần)
        ├── content.ts          # ⭐ tokenize/density/readability + stopwords VI (M5, thuần)
        └── content-extract.ts  # extractContent bằng cheerio — server-only (M5)
```

> Mẫu chung: lib `*.ts` thuần (không cheerio) chứa kiểu + logic → import được cả
> client lẫn server; phần trích HTML cần cheerio tách ra `*-extract.ts`
> (server-only) để cheerio không lọt vào client bundle.

## Trạng thái module

- **M1 — On-page SEO (xong):** chấm điểm 4 nhóm (Tiêu đề&Mô tả, Cấu trúc nội dung,
  Mạng xã hội/OG, Kỹ thuật cơ bản) + điểm tổng 0–100 + SERP preview + phát hiện
  structured data có sẵn (@type). Mỗi check có `weight`; điểm = trung bình có trọng số
  (good=1, warning=0.5, error=0).
- **M2 — Structured Data (xong):** tạo JSON-LD cho LocalBusiness, Product, Article,
  FAQPage, BreadcrumbList. Builder strip trường rỗng tự động. Mặc định
  LocalBusiness = `FurnitureStore`, tiền tệ Product = `VND` (ngành nội thất).
- **M3 — Audit kỹ thuật (xong):** trang `/audit` quét toàn bộ `<a href>`, kiểm tra
  HTTP status đồng thời (HEAD → fallback GET, `redirect: "manual"` để bắt 3xx + đọc
  `Location`) phát hiện link gãy/redirect/lỗi kết nối, phân loại nội bộ↔ngoài, lọc
  theo trạng thái. Dò `robots.txt`/`sitemap.xml` của origin. Có trình tạo
  `robots.txt` + `sitemap.xml` (sitemap điền sẵn `internalUrls` từ kết quả quét),
  copy/tải về. Cap `MAX_LINKS_TO_CHECK = 50`, ưu tiên link nội bộ; pool đồng thời 8;
  timeout 8s/link, 15s/trang.
- **M4 — Core Web Vitals (xong):** trang `/vitals` gọi Google PageSpeed Insights API
  (`/api/vitals`) cho mobile/desktop. KHÔNG chạy Chrome cục bộ. Đọc key qua
  `process.env.PAGESPEED_API_KEY` (tùy chọn — thiếu key dễ dính 429, đã báo lỗi tiếng
  Việt rõ). `parsePsi` lấy: điểm hiệu năng, field CrUX (LCP/INP/CLS/FCP, ưu tiên theo
  URL → dự phòng origin), chỉ số lab (FCP/LCP/TBT/CLS/SI/TTI), top opportunities theo
  `overallSavingsMs`. Timeout 90s. Tái dùng `ScoreRing`.
- **M5 — Tối ưu nội dung (xong):** trang `/content` (`/api/content`) trích nội dung
  (ưu tiên `<main>/<article>`, loại nav/header/footer/aside) rồi `analyzeContent`:
  readability (số từ/câu/đoạn, từ/câu TB, câu dài > 25 từ, thời gian đọc ~200 từ/phút),
  top unigram & bigram (loại stopword VI) kèm mật độ, và checklist từ khóa mục tiêu
  (title/H1/meta/100 từ đầu/heading/URL/mật độ). Mật độ khuyến nghị 0,5–2,5%.

## Lộ trình tiếp theo

Render site JS-heavy bằng Playwright (cho SPA không SSR) và xuất báo cáo PDF.
Cân nhắc gộp toàn bộ module vào một báo cáo tổng hợp cho mỗi URL.

## Cách thêm một check on-page mới (M1)

Trong `src/lib/seo/onpage.ts`: thu thập dữ liệu từ `$` (cheerio) → push một
`SeoCheck` (có `id`, `label`, `status`, `message`, `weight`, tùy chọn `value`/
`suggestion`) vào mảng check của danh mục phù hợp. Lưu ý đọc các thẻ cần thiết
TRƯỚC dòng `$("script, style, noscript").remove()`.
