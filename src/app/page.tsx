"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Search,
  XCircle,
} from "lucide-react";
import { ScoreRing } from "@/components/ScoreRing";
import { cn } from "@/lib/utils";
import type { CheckStatus, SeoCategory, SeoResult } from "@/lib/seo/types";

const statusMeta: Record<
  CheckStatus,
  { icon: typeof CheckCircle2; color: string; bg: string; label: string }
> = {
  good: {
    icon: CheckCircle2,
    color: "text-good",
    bg: "bg-green-50",
    label: "Đạt",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-amber-50",
    label: "Cần cải thiện",
  },
  error: {
    icon: XCircle,
    color: "text-error",
    bg: "bg-red-50",
    label: "Lỗi",
  },
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SeoResult | null>(null);

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra.");
      setResult(data as SeoResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:py-14">
      {/* Header */}
      <div className="text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Search className="h-4 w-4" />
          Công cụ phân tích SEO
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Kiểm tra & tối ưu SEO website
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">
          Nhập địa chỉ trang web để phân tích on-page SEO: tiêu đề, mô tả, thẻ
          heading, Open Graph và các yếu tố kỹ thuật — kèm gợi ý sửa cụ thể.
        </p>
      </div>

      {/* Search box */}
      <form
        onSubmit={analyze}
        className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="vd: example.com hoặc https://tencongty.vn/san-pham"
            className="w-full rounded-xl border bg-card py-3.5 pl-12 pr-4 text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang phân tích…
            </>
          ) : (
            "Phân tích"
          )}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          <strong className="font-semibold">Không thể phân tích: </strong>
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && <LoadingSkeleton />}

      {/* Results */}
      {result && !loading && <Results result={result} />}

      {!result && !loading && !error && <EmptyState />}
    </main>
  );
}

function EmptyState() {
  const items = [
    "Tiêu đề & meta description",
    "Cấu trúc thẻ heading (H1, H2)",
    "Thẻ Open Graph & Twitter",
    "Canonical, viewport, robots…",
  ];
  return (
    <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-dashed bg-card/50 p-8 text-center">
      <p className="font-medium">Kết quả sẽ hiển thị ở đây</p>
      <p className="mt-1 text-sm text-muted">Công cụ sẽ kiểm tra:</p>
      <ul className="mx-auto mt-4 grid max-w-md grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {items.map((it) => (
          <li
            key={it}
            className="flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-left"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-good" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto mt-10 max-w-4xl animate-pulse space-y-4">
      <div className="h-44 rounded-2xl bg-card" />
      <div className="h-40 rounded-2xl bg-card" />
      <div className="h-40 rounded-2xl bg-card" />
    </div>
  );
}

function Results({ result }: { result: SeoResult }) {
  return (
    <div className="mt-10 space-y-6">
      {/* Overview */}
      <section className="animate-fade-up rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
          <ScoreRing score={result.overallScore} label="điểm SEO" />
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-semibold">Tổng quan</h2>
            <p className="mt-1 break-all text-sm text-muted">
              {result.finalUrl}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
              <SummaryPill
                status="good"
                count={result.summary.good}
                text="Đạt"
              />
              <SummaryPill
                status="warning"
                count={result.summary.warning}
                text="Cần cải thiện"
              />
              <SummaryPill
                status="error"
                count={result.summary.error}
                text="Lỗi"
              />
            </div>
          </div>
        </div>

        {/* SERP preview */}
        <div className="mt-6 border-t pt-6">
          <p className="mb-3 text-sm font-semibold text-muted">
            Xem trước trên Google
          </p>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-xs text-[#4d5156]">{result.serp.displayUrl}</p>
            <p className="text-lg leading-snug text-[#1a0dab] hover:underline">
              {result.serp.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm text-[#4d5156]">
              {result.serp.description}
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      {result.categories.map((cat, i) => (
        <CategoryCard key={cat.id} category={cat} delay={i * 0.06} />
      ))}
    </div>
  );
}

function SummaryPill({
  status,
  count,
  text,
}: {
  status: CheckStatus;
  count: number;
  text: string;
}) {
  const m = statusMeta[status];
  const Icon = m.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
        m.bg,
        m.color,
      )}
    >
      <Icon className="h-4 w-4" />
      {count} {text}
    </span>
  );
}

function CategoryCard({
  category,
  delay,
}: {
  category: SeoCategory;
  delay: number;
}) {
  const barColor =
    category.score >= 80
      ? "bg-good"
      : category.score >= 50
        ? "bg-warning"
        : "bg-error";

  return (
    <section
      className="animate-fade-up rounded-2xl border bg-card p-6 shadow-sm"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">{category.title}</h3>
        <span className="text-sm font-semibold tabular-nums text-muted">
          {category.score}/100
        </span>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-border">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${category.score}%` }}
        />
      </div>

      <ul className="space-y-3">
        {category.checks.map((check) => {
          const m = statusMeta[check.status];
          const Icon = m.icon;
          return (
            <li key={check.id} className="flex gap-3">
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", m.color)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{check.label}</span>
                  {check.value && (
                    <span className="break-all text-xs text-muted">
                      — {check.value}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted">{check.message}</p>
                {check.suggestion && (
                  <p className="mt-1 flex items-start gap-1 text-sm text-primary">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />
                    {check.suggestion}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
