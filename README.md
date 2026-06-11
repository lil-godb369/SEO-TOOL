# SEO Tool

Công cụ phân tích & tối ưu SEO cho website. Nhập một URL bất kỳ (site tự code,
WordPress, hay trang nào khác) → nhận điểm SEO tổng và checklist chi tiết kèm
gợi ý sửa.

## Công nghệ

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** — giao diện
- **Cheerio** — phân tích HTML phía server (tránh CORS)
- **lucide-react** — icon

## Chạy dự án

```bash
npm run dev      # chạy ở chế độ phát triển (mặc định http://localhost:3000)
npm run build    # build production
npm run start    # chạy bản production
```

> Nếu cổng 3000 đang bận, Next.js sẽ tự dùng cổng khác (vd 3001) — xem log khi khởi động.

### Biến môi trường (tùy chọn)

```bash
# .env.local
PAGESPEED_API_KEY=...   # API key Google PageSpeed Insights cho trang /vitals
```

Lấy key miễn phí tại Google Cloud Console (bật **PageSpeed Insights API**). Thiếu key trang `/vitals` vẫn chạy nhưng dễ gặp lỗi quota (HTTP 429).

## Cấu trúc

```
src/
├── app/
│   ├── page.tsx                # Dashboard (ô nhập URL + hiển thị kết quả)
│   ├── audit/page.tsx          # Audit kỹ thuật + trình tạo robots/sitemap
│   ├── vitals/page.tsx         # Core Web Vitals (PageSpeed Insights)
│   ├── content/page.tsx        # Phân tích nội dung & từ khóa
│   ├── schema/page.tsx         # Trình tạo JSON-LD
│   ├── layout.tsx              # Layout gốc (lang="vi", metadata)
│   └── api/                    # analyze · audit · vitals · content (route.ts)
├── components/
│   └── ScoreRing.tsx           # Vòng tròn điểm số
└── lib/
    ├── utils.ts                # cn() helper
    └── seo/
        ├── types.ts            # Kiểu dữ liệu kết quả phân tích
        ├── onpage.ts           # ⭐ Logic chấm điểm on-page SEO
        ├── schema.ts           # ⭐ Builder JSON-LD
        ├── audit.ts            # ⭐ Phân loại status + builder robots/sitemap
        ├── audit-extract.ts    # Trích link bằng cheerio (server-only)
        ├── vitals.ts           # ⭐ Parse PageSpeed Insights → CWV
        ├── content.ts          # ⭐ Mật độ từ khóa + readability (thuần)
        └── content-extract.ts  # Trích nội dung bằng cheerio (server-only)
```

## Đã có (Module 1 — On-page SEO)

Phân tích & chấm điểm theo 4 nhóm:

1. **Tiêu đề & Mô tả** — `<title>`, `meta description` (độ dài, sự hiện diện)
2. **Cấu trúc nội dung** — H1, H2, lượng chữ, alt cho ảnh
3. **Mạng xã hội** — Open Graph (og:title/description/image), Twitter Card
4. **Kỹ thuật cơ bản** — lang, viewport, canonical, charset, favicon, robots (noindex)

Kèm: điểm tổng (0–100), bản xem trước kết quả Google (SERP preview), và gợi ý
khắc phục cho từng mục.

## Đã có (Module 2 — Structured Data)

- Trang `/schema`: trình tạo JSON-LD cho **LocalBusiness, Product, Article, FAQPage, BreadcrumbList** — điền form, xem trước mã trực tiếp, nút copy, link kiểm tra Rich Results.
- Module 1 nay còn **phát hiện** structured data có sẵn trên trang được phân tích (liệt kê các @type).

## Đã có (Module 3 — Audit kỹ thuật)

- Trang `/audit`: nhập URL → quét toàn bộ `<a href>` trên trang, kiểm tra HTTP status đồng thời (HEAD, dự phòng GET) để phát hiện **link gãy (4xx/5xx)**, **chuyển hướng 3xx** (kèm đích đến) và **lỗi kết nối/timeout**; phân loại link **nội bộ / ngoài**, lọc theo trạng thái.
- Tự **dò `robots.txt` & `sitemap.xml`** của tên miền (có/không, mã HTTP).
- **Trình tạo `robots.txt` và `sitemap.xml`** — sitemap điền sẵn các URL nội bộ tìm được khi quét; có nút copy & tải tệp về.
- Giới hạn 50 link/lần quét (ưu tiên link nội bộ) để tránh quá tải/timeout.

## Đã có (Module 4 — Core Web Vitals)

- Trang `/vitals`: chạy **Lighthouse qua Google PageSpeed Insights API** (không cần Chrome cục bộ) cho **di động/máy tính** → điểm hiệu năng, **LCP / INP / CLS / FCP** thực tế (CrUX) + chỉ số phòng lab (FCP, LCP, TBT, CLS, Speed Index, TTI) và danh sách **cơ hội tối ưu** kèm mức tiết kiệm ước tính.
- ⚙️ Đặt biến môi trường `PAGESPEED_API_KEY` (API key miễn phí từ Google Cloud Console) để tránh giới hạn lượt gọi; thiếu key vẫn chạy nhưng dễ gặp lỗi quota (429).

## Đã có (Module 5 — Tối ưu nội dung)

- Trang `/content`: phân tích **độ dễ đọc** (số từ/câu/đoạn, từ trên câu trung bình, tỉ lệ câu dài, thời gian đọc), **top từ khóa & cụm từ** kèm mật độ, và (khi nhập **từ khóa mục tiêu**) checklist đối chiếu từ khóa với tiêu đề, H1, meta, đoạn mở đầu, tiêu đề phụ, URL và mật độ.
- Có sẵn danh sách stopword tiếng Việt để loại nhiễu khi thống kê từ khóa.

## Lộ trình tiếp theo (gợi ý)

- [x] ~~**Module 2**: Trình tạo Structured Data (LocalBusiness, Product, Article, FAQ, Breadcrumb)~~
- [x] ~~**Module 3**: Audit kỹ thuật (broken link, status code) + sinh sitemap.xml/robots.txt~~
- [x] ~~**Module 4**: Core Web Vitals qua Lighthouse (LCP/CLS/INP)~~
- [x] ~~**Module 5**: Tối ưu nội dung (mật độ từ khóa, readability)~~
- [ ] Render site JS nặng bằng Playwright (cho SPA không SSR)
- [ ] Xuất báo cáo PDF
