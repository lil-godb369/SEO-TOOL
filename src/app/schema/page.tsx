"use client";

import { useMemo, useState } from "react";
import {
  Braces,
  Building2,
  ExternalLink,
  HelpCircle,
  ListTree,
  Newspaper,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildArticle,
  buildBreadcrumb,
  buildFaq,
  buildLocalBusiness,
  buildProduct,
  toScriptTag,
  type ArticleInput,
  type BreadcrumbItem,
  type FaqItem,
  type LocalBusinessInput,
  type ProductInput,
  type SchemaType,
} from "@/lib/seo/schema";
import {
  CopyButton,
  Field,
  SelectField,
  TextAreaField,
} from "@/components/ui/fields";

const TYPES: {
  id: SchemaType;
  label: string;
  desc: string;
  icon: typeof Package;
}[] = [
  {
    id: "LocalBusiness",
    label: "Doanh nghiệp địa phương",
    desc: "Showroom, cửa hàng — hiện trên Google Maps & tìm kiếm địa phương",
    icon: Building2,
  },
  {
    id: "Product",
    label: "Sản phẩm",
    desc: "Giá, tình trạng kho, đánh giá — rich snippet sản phẩm",
    icon: Package,
  },
  {
    id: "Article",
    label: "Bài viết",
    desc: "Blog/tin tức — hiển thị tác giả, ngày đăng",
    icon: Newspaper,
  },
  {
    id: "FAQPage",
    label: "Câu hỏi (FAQ)",
    desc: "Hỏi–đáp hiển thị mở rộng ngay trên kết quả Google",
    icon: HelpCircle,
  },
  {
    id: "BreadcrumbList",
    label: "Breadcrumb",
    desc: "Đường dẫn phân cấp hiển thị thay cho URL",
    icon: ListTree,
  },
];

const BUSINESS_TYPES = [
  { value: "FurnitureStore", label: "Cửa hàng nội thất (FurnitureStore)" },
  { value: "HomeGoodsStore", label: "Đồ gia dụng (HomeGoodsStore)" },
  { value: "Store", label: "Cửa hàng (Store)" },
  { value: "LocalBusiness", label: "Doanh nghiệp địa phương (chung)" },
  { value: "Restaurant", label: "Nhà hàng (Restaurant)" },
  { value: "ProfessionalService", label: "Dịch vụ chuyên nghiệp" },
];

const AVAILABILITY = [
  { value: "InStock", label: "Còn hàng (InStock)" },
  { value: "OutOfStock", label: "Hết hàng (OutOfStock)" },
  { value: "PreOrder", label: "Đặt trước (PreOrder)" },
];

export default function SchemaPage() {
  const [type, setType] = useState<SchemaType>("LocalBusiness");

  const [lb, setLb] = useState<LocalBusinessInput>({
    businessType: "FurnitureStore",
    name: "",
    addressCountry: "VN",
  });
  const [product, setProduct] = useState<ProductInput>({
    name: "",
    priceCurrency: "VND",
    availability: "InStock",
  });
  const [article, setArticle] = useState<ArticleInput>({ headline: "" });
  const [faq, setFaq] = useState<FaqItem[]>([{ question: "", answer: "" }]);
  const [crumbs, setCrumbs] = useState<BreadcrumbItem[]>([
    { name: "Trang chủ", url: "" },
    { name: "", url: "" },
  ]);

  const json = useMemo(() => {
    switch (type) {
      case "LocalBusiness":
        return buildLocalBusiness(lb);
      case "Product":
        return buildProduct(product);
      case "Article":
        return buildArticle(article);
      case "FAQPage":
        return buildFaq(faq);
      case "BreadcrumbList":
        return buildBreadcrumb(crumbs);
    }
  }, [type, lb, product, article, faq, crumbs]);

  const scriptTag = toScriptTag(json);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Braces className="h-4 w-4" />
          Tạo dữ liệu có cấu trúc
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Trình tạo Schema.org (JSON-LD)
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">
          Điền thông tin → nhận đoạn mã JSON-LD chuẩn để dán vào{" "}
          <code className="rounded bg-card px-1.5 py-0.5 text-sm">
            &lt;head&gt;
          </code>{" "}
          giúp Google hiểu trang & hiển thị rich snippet.
        </p>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TYPES.map((t) => {
          const Icon = t.icon;
          const active = type === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
                active
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "bg-card hover:border-primary/40",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  active ? "text-primary" : "text-muted",
                )}
              />
              <span className="text-sm font-semibold">{t.label}</span>
              <span className="text-xs text-muted">{t.desc}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Thông tin</h2>
          <div className="space-y-4">
            {type === "LocalBusiness" && (
              <LocalBusinessForm value={lb} onChange={setLb} />
            )}
            {type === "Product" && (
              <ProductForm value={product} onChange={setProduct} />
            )}
            {type === "Article" && (
              <ArticleForm value={article} onChange={setArticle} />
            )}
            {type === "FAQPage" && <FaqForm value={faq} onChange={setFaq} />}
            {type === "BreadcrumbList" && (
              <BreadcrumbForm value={crumbs} onChange={setCrumbs} />
            )}
          </div>
        </section>

        {/* Output */}
        <section className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border bg-[#0f172a] p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-300">
                Mã JSON-LD
              </span>
              <CopyButton text={scriptTag} />
            </div>
            <pre className="max-h-[460px] overflow-auto rounded-lg bg-black/40 p-4 text-xs leading-relaxed text-slate-100">
              <code>{scriptTag}</code>
            </pre>
          </div>
          <div className="mt-3 rounded-xl border bg-card p-4 text-sm text-muted">
            <p className="font-medium text-foreground">Cách dùng</p>
            <p className="mt-1">
              Dán đoạn mã trên vào trong thẻ{" "}
              <code className="rounded bg-background px-1">&lt;head&gt;</code> của
              trang tương ứng. Sau đó kiểm tra bằng{" "}
              <a
                href="https://search.google.com/test/rich-results"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Google Rich Results Test
                <ExternalLink className="h-3 w-3" />
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ---------------- Forms ---------------- */

function LocalBusinessForm({
  value,
  onChange,
}: {
  value: LocalBusinessInput;
  onChange: (v: LocalBusinessInput) => void;
}) {
  const set = (k: keyof LocalBusinessInput) => (v: string) =>
    onChange({ ...value, [k]: v });
  return (
    <>
      <SelectField
        label="Loại hình"
        value={value.businessType}
        onChange={set("businessType")}
        options={BUSINESS_TYPES}
      />
      <Field
        label="Tên doanh nghiệp"
        required
        value={value.name}
        onChange={set("name")}
        placeholder="Showroom Nội thất ABC"
      />
      <TextAreaField
        label="Mô tả"
        value={value.description || ""}
        onChange={set("description")}
        placeholder="Chuyên nội thất phòng khách, phòng ngủ cao cấp…"
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Website"
          value={value.url || ""}
          onChange={set("url")}
          placeholder="https://noithatabc.vn"
        />
        <Field
          label="Điện thoại"
          value={value.telephone || ""}
          onChange={set("telephone")}
          placeholder="+84 28 1234 5678"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Ảnh (URL)"
          value={value.image || ""}
          onChange={set("image")}
          placeholder="https://…/showroom.jpg"
        />
        <Field
          label="Khoảng giá"
          value={value.priceRange || ""}
          onChange={set("priceRange")}
          placeholder="$$ hoặc 1.000.000₫ - 50.000.000₫"
        />
      </div>
      <Field
        label="Địa chỉ (số nhà, đường)"
        value={value.streetAddress || ""}
        onChange={set("streetAddress")}
        placeholder="123 Nguyễn Văn Cừ"
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Phường/Quận/Thành phố"
          value={value.addressLocality || ""}
          onChange={set("addressLocality")}
          placeholder="Quận 1, TP.HCM"
        />
        <Field
          label="Tỉnh/Thành (region)"
          value={value.addressRegion || ""}
          onChange={set("addressRegion")}
          placeholder="Hồ Chí Minh"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Mã bưu chính"
          value={value.postalCode || ""}
          onChange={set("postalCode")}
          placeholder="700000"
        />
        <Field
          label="Mã quốc gia"
          value={value.addressCountry || ""}
          onChange={set("addressCountry")}
          placeholder="VN"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Vĩ độ (latitude)"
          value={value.latitude || ""}
          onChange={set("latitude")}
          placeholder="10.7769"
        />
        <Field
          label="Kinh độ (longitude)"
          value={value.longitude || ""}
          onChange={set("longitude")}
          placeholder="106.7009"
        />
      </div>
      <Field
        label="Giờ mở cửa"
        value={value.openingHours || ""}
        onChange={set("openingHours")}
        placeholder="Mo-Sa 08:00-18:00"
        hint='Định dạng Schema.org, vd "Mo-Sa 08:00-18:00".'
      />
    </>
  );
}

function ProductForm({
  value,
  onChange,
}: {
  value: ProductInput;
  onChange: (v: ProductInput) => void;
}) {
  const set = (k: keyof ProductInput) => (v: string) =>
    onChange({ ...value, [k]: v });
  return (
    <>
      <Field
        label="Tên sản phẩm"
        required
        value={value.name}
        onChange={set("name")}
        placeholder="Sofa da thật 3 chỗ ngồi"
      />
      <TextAreaField
        label="Mô tả"
        value={value.description || ""}
        onChange={set("description")}
        placeholder="Sofa da bò Ý, khung gỗ sồi…"
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Thương hiệu"
          value={value.brand || ""}
          onChange={set("brand")}
          placeholder="Nội thất ABC"
        />
        <Field
          label="Mã SKU"
          value={value.sku || ""}
          onChange={set("sku")}
          placeholder="SOFA-001"
        />
      </div>
      <Field
        label="Ảnh (URL)"
        value={value.image || ""}
        onChange={set("image")}
        placeholder="https://…/sofa.jpg"
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Giá"
          value={value.price || ""}
          onChange={set("price")}
          placeholder="25000000"
        />
        <Field
          label="Tiền tệ"
          value={value.priceCurrency || ""}
          onChange={set("priceCurrency")}
          placeholder="VND"
        />
      </div>
      <SelectField
        label="Tình trạng"
        value={value.availability || "InStock"}
        onChange={set("availability")}
        options={AVAILABILITY}
      />
      <Field
        label="URL sản phẩm"
        value={value.productUrl || ""}
        onChange={set("productUrl")}
        placeholder="https://noithatabc.vn/sofa-da-3-cho"
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Điểm đánh giá"
          value={value.ratingValue || ""}
          onChange={set("ratingValue")}
          placeholder="4.8"
          hint="0–5"
        />
        <Field
          label="Số lượt đánh giá"
          value={value.reviewCount || ""}
          onChange={set("reviewCount")}
          placeholder="124"
        />
      </div>
    </>
  );
}

function ArticleForm({
  value,
  onChange,
}: {
  value: ArticleInput;
  onChange: (v: ArticleInput) => void;
}) {
  const set = (k: keyof ArticleInput) => (v: string) =>
    onChange({ ...value, [k]: v });
  return (
    <>
      <Field
        label="Tiêu đề bài viết"
        required
        value={value.headline}
        onChange={set("headline")}
        placeholder="10 mẹo chọn sofa cho phòng khách nhỏ"
      />
      <TextAreaField
        label="Mô tả"
        value={value.description || ""}
        onChange={set("description")}
      />
      <Field
        label="Ảnh đại diện (URL)"
        value={value.image || ""}
        onChange={set("image")}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Tác giả"
          value={value.authorName || ""}
          onChange={set("authorName")}
          placeholder="Nguyễn Văn A"
        />
        <Field
          label="Đơn vị xuất bản"
          value={value.publisherName || ""}
          onChange={set("publisherName")}
          placeholder="Nội thất ABC"
        />
      </div>
      <Field
        label="Logo đơn vị (URL)"
        value={value.publisherLogo || ""}
        onChange={set("publisherLogo")}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Ngày đăng"
          type="date"
          value={value.datePublished || ""}
          onChange={set("datePublished")}
        />
        <Field
          label="Ngày cập nhật"
          type="date"
          value={value.dateModified || ""}
          onChange={set("dateModified")}
        />
      </div>
      <Field
        label="URL bài viết"
        value={value.url || ""}
        onChange={set("url")}
      />
    </>
  );
}

function FaqForm({
  value,
  onChange,
}: {
  value: FaqItem[];
  onChange: (v: FaqItem[]) => void;
}) {
  const update = (i: number, patch: Partial<FaqItem>) =>
    onChange(value.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  return (
    <>
      {value.map((it, i) => (
        <div key={i} className="rounded-xl border bg-background p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Câu hỏi {i + 1}</span>
            {value.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="text-muted transition hover:text-error"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="space-y-2">
            <Field
              label="Câu hỏi"
              value={it.question}
              onChange={(v) => update(i, { question: v })}
              placeholder="Có giao hàng tận nơi không?"
            />
            <TextAreaField
              label="Trả lời"
              value={it.answer}
              onChange={(v) => update(i, { answer: v })}
              placeholder="Chúng tôi giao hàng miễn phí nội thành…"
            />
          </div>
        </div>
      ))}
      <AddButton
        onClick={() => onChange([...value, { question: "", answer: "" }])}
        label="Thêm câu hỏi"
      />
    </>
  );
}

function BreadcrumbForm({
  value,
  onChange,
}: {
  value: BreadcrumbItem[];
  onChange: (v: BreadcrumbItem[]) => void;
}) {
  const update = (i: number, patch: Partial<BreadcrumbItem>) =>
    onChange(value.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  return (
    <>
      {value.map((it, i) => (
        <div
          key={i}
          className="rounded-xl border bg-background p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Cấp {i + 1}</span>
            {value.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="text-muted transition hover:text-error"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field
              label="Tên"
              value={it.name}
              onChange={(v) => update(i, { name: v })}
              placeholder="Sản phẩm"
            />
            <Field
              label="URL"
              value={it.url}
              onChange={(v) => update(i, { url: v })}
              placeholder="https://noithatabc.vn/san-pham"
            />
          </div>
        </div>
      ))}
      <AddButton
        onClick={() => onChange([...value, { name: "", url: "" }])}
        label="Thêm cấp"
      />
    </>
  );
}

function AddButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/5"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}
