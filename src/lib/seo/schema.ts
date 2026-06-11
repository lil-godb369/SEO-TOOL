/**
 * Bộ tạo dữ liệu có cấu trúc (Schema.org JSON-LD).
 * Mỗi builder nhận input dạng phẳng và trả về object JSON-LD đã loại bỏ
 * các trường rỗng, sẵn sàng nhúng vào <script type="application/ld+json">.
 */

export type SchemaType =
  | "LocalBusiness"
  | "Product"
  | "Article"
  | "FAQPage"
  | "BreadcrumbList";

type Json = Record<string, unknown>;

/** Loại bỏ đệ quy các giá trị rỗng (undefined, "", [], {}) */
function clean<T>(value: T): T {
  if (Array.isArray(value)) {
    const arr = value
      .map((v) => clean(v))
      .filter((v) => v !== undefined && v !== "" && !isEmptyObject(v));
    return arr as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Json = {};
    for (const [k, v] of Object.entries(value as Json)) {
      const cleaned = clean(v);
      if (
        cleaned === undefined ||
        cleaned === "" ||
        (Array.isArray(cleaned) && cleaned.length === 0) ||
        isEmptyObject(cleaned)
      ) {
        continue;
      }
      out[k] = cleaned;
    }
    return out as unknown as T;
  }
  return value;
}

function isEmptyObject(v: unknown): boolean {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.keys(v as Json).length === 0
  );
}

// ---------------- LocalBusiness ----------------
export interface LocalBusinessInput {
  businessType: string; // @type cụ thể, vd FurnitureStore
  name: string;
  description?: string;
  url?: string;
  telephone?: string;
  image?: string;
  priceRange?: string;
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
  latitude?: string;
  longitude?: string;
  openingHours?: string; // vd "Mo-Sa 08:00-18:00"
}

export function buildLocalBusiness(i: LocalBusinessInput): Json {
  return clean({
    "@context": "https://schema.org",
    "@type": i.businessType || "LocalBusiness",
    name: i.name,
    description: i.description,
    url: i.url,
    telephone: i.telephone,
    image: i.image,
    priceRange: i.priceRange,
    address: {
      "@type": "PostalAddress",
      streetAddress: i.streetAddress,
      addressLocality: i.addressLocality,
      addressRegion: i.addressRegion,
      postalCode: i.postalCode,
      addressCountry: i.addressCountry,
    },
    geo:
      i.latitude && i.longitude
        ? {
            "@type": "GeoCoordinates",
            latitude: i.latitude,
            longitude: i.longitude,
          }
        : undefined,
    openingHours: i.openingHours ? [i.openingHours] : undefined,
  });
}

// ---------------- Product ----------------
export interface ProductInput {
  name: string;
  description?: string;
  image?: string;
  brand?: string;
  sku?: string;
  price?: string;
  priceCurrency?: string;
  availability?: string; // InStock | OutOfStock | PreOrder
  productUrl?: string;
  ratingValue?: string;
  reviewCount?: string;
}

export function buildProduct(i: ProductInput): Json {
  return clean({
    "@context": "https://schema.org",
    "@type": "Product",
    name: i.name,
    description: i.description,
    image: i.image,
    sku: i.sku,
    brand: i.brand ? { "@type": "Brand", name: i.brand } : undefined,
    offers: i.price
      ? {
          "@type": "Offer",
          price: i.price,
          priceCurrency: i.priceCurrency || "VND",
          availability: i.availability
            ? `https://schema.org/${i.availability}`
            : undefined,
          url: i.productUrl,
        }
      : undefined,
    aggregateRating:
      i.ratingValue && i.reviewCount
        ? {
            "@type": "AggregateRating",
            ratingValue: i.ratingValue,
            reviewCount: i.reviewCount,
          }
        : undefined,
  });
}

// ---------------- Article ----------------
export interface ArticleInput {
  headline: string;
  description?: string;
  image?: string;
  authorName?: string;
  publisherName?: string;
  publisherLogo?: string;
  datePublished?: string;
  dateModified?: string;
  url?: string;
}

export function buildArticle(i: ArticleInput): Json {
  return clean({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: i.headline,
    description: i.description,
    image: i.image,
    author: i.authorName
      ? { "@type": "Person", name: i.authorName }
      : undefined,
    publisher: i.publisherName
      ? {
          "@type": "Organization",
          name: i.publisherName,
          logo: i.publisherLogo
            ? { "@type": "ImageObject", url: i.publisherLogo }
            : undefined,
        }
      : undefined,
    datePublished: i.datePublished,
    dateModified: i.dateModified || i.datePublished,
    mainEntityOfPage: i.url
      ? { "@type": "WebPage", "@id": i.url }
      : undefined,
  });
}

// ---------------- FAQPage ----------------
export interface FaqItem {
  question: string;
  answer: string;
}

export function buildFaq(items: FaqItem[]): Json {
  return clean({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items
      .filter((it) => it.question && it.answer)
      .map((it) => ({
        "@type": "Question",
        name: it.question,
        acceptedAnswer: { "@type": "Answer", text: it.answer },
      })),
  });
}

// ---------------- BreadcrumbList ----------------
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumb(items: BreadcrumbItem[]): Json {
  return clean({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items
      .filter((it) => it.name)
      .map((it, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: it.name,
        item: it.url || undefined,
      })),
  });
}

/** Bọc object JSON-LD thành đoạn <script> sẵn sàng dán vào <head>. */
export function toScriptTag(json: Json): string {
  return `<script type="application/ld+json">\n${JSON.stringify(
    json,
    null,
    2,
  )}\n</script>`;
}
