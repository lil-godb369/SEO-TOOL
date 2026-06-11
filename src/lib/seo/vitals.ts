/**
 * Module 4 — Core Web Vitals.
 * Phân tích kết quả từ Google PageSpeed Insights API (PSI chạy Lighthouse trên
 * hạ tầng Google, trả về cả dữ liệu thực tế CrUX lẫn dữ liệu phòng lab).
 * File thuần (không I/O) — an toàn import từ client để lấy kiểu dữ liệu.
 */

export type Rating = "good" | "ni" | "poor"; // ni = needs-improvement
export type Strategy = "mobile" | "desktop";

export interface FieldMetric {
  id: string;
  label: string;
  display: string;
  rating: Rating;
}

export interface LabMetric {
  id: string;
  label: string;
  display: string;
  rating: Rating;
}

export interface Opportunity {
  id: string;
  title: string;
  /** Mức tiết kiệm ước tính (ms) */
  savingsMs?: number;
  display?: string;
}

export interface VitalsResult {
  url: string;
  finalUrl: string;
  strategy: Strategy;
  fetchedAt: string;
  /** Điểm hiệu năng Lighthouse 0–100 */
  performanceScore: number;
  /** Có dữ liệu thực tế (CrUX) cho URL/origin này hay không */
  hasField: boolean;
  /** Phạm vi dữ liệu thực tế: "url" hoặc "origin" (gộp toàn site) */
  fieldScope?: "url" | "origin";
  field: FieldMetric[];
  lab: LabMetric[];
  opportunities: Opportunity[];
}

/** Xếp hạng theo điểm Lighthouse của audit (0–1). */
function ratingFromScore(score: number | null | undefined): Rating {
  if (score == null) return "ni";
  if (score >= 0.9) return "good";
  if (score >= 0.5) return "ni";
  return "poor";
}

/** Xếp hạng theo nhãn CrUX. */
function ratingFromCategory(cat: string | undefined): Rating {
  if (cat === "FAST") return "good";
  if (cat === "SLOW") return "poor";
  return "ni";
}

function ms(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`;
}

// ---- Kiểu thô tối thiểu của phản hồi PSI (chỉ phần ta dùng) ----
interface PsiMetric {
  percentile: number;
  category?: string;
}
interface PsiAudit {
  id?: string;
  title?: string;
  score?: number | null;
  numericValue?: number;
  displayValue?: string;
  details?: { type?: string; overallSavingsMs?: number };
}
interface PsiResponse {
  id?: string;
  loadingExperience?: {
    metrics?: Record<string, PsiMetric>;
  };
  originLoadingExperience?: {
    metrics?: Record<string, PsiMetric>;
  };
  lighthouseResult?: {
    categories?: { performance?: { score?: number | null } };
    audits?: Record<string, PsiAudit>;
  };
}

const FIELD_DEFS: { key: string; id: string; label: string; cls?: boolean }[] = [
  { key: "LARGEST_CONTENTFUL_PAINT_MS", id: "lcp", label: "LCP (Largest Contentful Paint)" },
  { key: "INTERACTION_TO_NEXT_PAINT", id: "inp", label: "INP (Interaction to Next Paint)" },
  { key: "CUMULATIVE_LAYOUT_SHIFT_SCORE", id: "cls", label: "CLS (Cumulative Layout Shift)", cls: true },
  { key: "FIRST_CONTENTFUL_PAINT_MS", id: "fcp", label: "FCP (First Contentful Paint)" },
];

const LAB_DEFS: { key: string; id: string; label: string }[] = [
  { key: "first-contentful-paint", id: "fcp", label: "First Contentful Paint" },
  { key: "largest-contentful-paint", id: "lcp", label: "Largest Contentful Paint" },
  { key: "total-blocking-time", id: "tbt", label: "Total Blocking Time" },
  { key: "cumulative-layout-shift", id: "cls", label: "Cumulative Layout Shift" },
  { key: "speed-index", id: "si", label: "Speed Index" },
  { key: "interactive", id: "tti", label: "Time to Interactive" },
];

/** Chuyển phản hồi PSI thô thành VitalsResult gọn cho UI. */
export function parsePsi(
  raw: PsiResponse,
  strategy: Strategy,
  requestedUrl: string,
): VitalsResult {
  const lh = raw.lighthouseResult;
  const performanceScore = Math.round(
    (lh?.categories?.performance?.score ?? 0) * 100,
  );

  // --- Dữ liệu thực tế (CrUX): ưu tiên theo URL, dự phòng theo origin ---
  const urlMetrics = raw.loadingExperience?.metrics;
  const originMetrics = raw.originLoadingExperience?.metrics;
  const metrics = urlMetrics && Object.keys(urlMetrics).length ? urlMetrics : originMetrics;
  const fieldScope: "url" | "origin" | undefined = !metrics
    ? undefined
    : urlMetrics && Object.keys(urlMetrics).length
      ? "url"
      : "origin";

  const field: FieldMetric[] = [];
  if (metrics) {
    for (const def of FIELD_DEFS) {
      const m = metrics[def.key];
      if (!m) continue;
      const display = def.cls
        ? (m.percentile / 100).toFixed(2)
        : ms(m.percentile);
      field.push({
        id: def.id,
        label: def.label,
        display,
        rating: ratingFromCategory(m.category),
      });
    }
  }

  // --- Dữ liệu lab (Lighthouse) ---
  const audits = lh?.audits ?? {};
  const lab: LabMetric[] = [];
  for (const def of LAB_DEFS) {
    const a = audits[def.key];
    if (!a) continue;
    lab.push({
      id: def.id,
      label: def.label,
      display: a.displayValue ?? "—",
      rating: ratingFromScore(a.score),
    });
  }

  // --- Cơ hội tối ưu (opportunities) ---
  const opportunities: Opportunity[] = Object.entries(audits)
    .filter(
      ([, a]) =>
        a.details?.type === "opportunity" &&
        (a.details.overallSavingsMs ?? 0) > 50,
    )
    .map(([id, a]) => ({
      id,
      title: a.title ?? id,
      savingsMs: a.details?.overallSavingsMs,
      display: a.displayValue,
    }))
    .sort((x, y) => (y.savingsMs ?? 0) - (x.savingsMs ?? 0))
    .slice(0, 8);

  return {
    url: requestedUrl,
    finalUrl: raw.id || requestedUrl,
    strategy,
    fetchedAt: new Date().toISOString(),
    performanceScore,
    hasField: field.length > 0,
    fieldScope,
    field,
    lab,
    opportunities,
  };
}
