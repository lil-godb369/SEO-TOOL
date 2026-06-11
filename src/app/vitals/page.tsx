"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Loader2,
  Monitor,
  Search,
  Smartphone,
  XCircle,
  Zap,
} from "lucide-react";
import { ScoreRing } from "@/components/ScoreRing";
import { cn } from "@/lib/utils";
import type {
  FieldMetric,
  LabMetric,
  Rating,
  Strategy,
  VitalsResult,
} from "@/lib/seo/vitals";

const ratingMeta: Record<
  Rating,
  { color: string; bg: string; ring: string; label: string; icon: typeof CheckCircle2 }
> = {
  good: { color: "text-good", bg: "bg-green-50", ring: "border-good", label: "Tốt", icon: CheckCircle2 },
  ni: { color: "text-warning", bg: "bg-amber-50", ring: "border-warning", label: "Cần cải thiện", icon: AlertTriangle },
  poor: { color: "text-error", bg: "bg-red-50", ring: "border-error", label: "Kém", icon: XCircle },
};

export default function VitalsPage() {
  const [url, setUrl] = useState("");
  const [strategy, setStrategy] = useState<Strategy>("mobile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VitalsResult | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, strategy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra.");
      setResult(data as VitalsResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:py-14">
      <div className="text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Gauge className="h-4 w-4" />
          Core Web Vitals
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Đo tốc độ & trải nghiệm trang
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">
          Chạy Lighthouse qua Google PageSpeed Insights để đo{" "}
          <strong>LCP, INP, CLS</strong> và điểm hiệu năng — kèm dữ liệu người
          dùng thực tế (CrUX) và gợi ý tối ưu.
        </p>
      </div>

      <form onSubmit={run} className="mx-auto mt-8 max-w-2xl space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="vd: example.com hoặc https://tencongty.vn"
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
                Đang đo…
              </>
            ) : (
              "Đo hiệu năng"
            )}
          </button>
        </div>
        {/* Mobile / Desktop toggle */}
        <div className="inline-flex rounded-xl border bg-card p-1 text-sm">
          {(
            [
              { id: "mobile", label: "Di động", icon: Smartphone },
              { id: "desktop", label: "Máy tính", icon: Monitor },
            ] as const
          ).map((s) => {
            const Icon = s.icon;
            const active = strategy === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStrategy(s.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
            );
          })}
        </div>
      </form>

      {error && (
        <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          <strong className="font-semibold">Không thể đo: </strong>
          {error}
        </div>
      )}

      {loading && (
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted">
          PageSpeed Insights có thể mất 20–60 giây để phân tích…
        </p>
      )}
      {result && !loading && <Results result={result} />}
      {!result && !loading && !error && <EmptyState />}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-dashed bg-card/50 p-8 text-center text-sm text-muted">
      <p className="font-medium text-foreground">Kết quả đo sẽ hiển thị ở đây</p>
      <p className="mt-2">
        Mẹo: để tránh giới hạn lượt gọi, đặt biến môi trường{" "}
        <code className="rounded bg-background px-1.5 py-0.5">
          PAGESPEED_API_KEY
        </code>{" "}
        bằng API key miễn phí từ Google Cloud Console.
      </p>
    </div>
  );
}

function Results({ result }: { result: VitalsResult }) {
  return (
    <div className="mt-10 space-y-6">
      {/* Score + field */}
      <section className="animate-fade-up rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center gap-8 sm:flex-row">
          <div className="text-center">
            <ScoreRing score={result.performanceScore} label="hiệu năng" />
            <p className="mt-2 text-xs text-muted">
              {result.strategy === "mobile" ? "Di động" : "Máy tính"} · Lighthouse
            </p>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Dữ liệu người dùng thực tế</h2>
            <p className="mt-1 break-all text-sm text-muted">
              {result.finalUrl}
            </p>
            {result.hasField ? (
              <>
                <p className="mt-1 text-xs text-muted">
                  Nguồn: CrUX (28 ngày qua) —{" "}
                  {result.fieldScope === "url"
                    ? "riêng URL này"
                    : "trung bình toàn tên miền"}
                  .
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {result.field.map((m) => (
                    <FieldCard key={m.id} m={m} />
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-4 rounded-lg bg-background px-4 py-3 text-sm text-muted">
                Chưa đủ dữ liệu người dùng thực tế (CrUX) cho trang này — thường
                do lưu lượng truy cập thấp. Hãy tham khảo dữ liệu lab bên dưới.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Lab metrics */}
      <section className="animate-fade-up rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Chỉ số phòng lab (Lighthouse)</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {result.lab.map((m) => (
            <LabCard key={m.id} m={m} />
          ))}
        </div>
      </section>

      {/* Opportunities */}
      {result.opportunities.length > 0 && (
        <section className="animate-fade-up rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Cơ hội tối ưu</h3>
          </div>
          <ul className="space-y-3">
            {result.opportunities.map((o) => (
              <li key={o.id} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">{o.title}</p>
                  {o.display && (
                    <p className="text-sm text-muted">{o.display}</p>
                  )}
                </div>
                {o.savingsMs != null && (
                  <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-warning">
                    ~{(o.savingsMs / 1000).toFixed(1)}s
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function FieldCard({ m }: { m: FieldMetric }) {
  const r = ratingMeta[m.rating];
  const Icon = r.icon;
  return (
    <div className={cn("rounded-xl border-l-4 bg-background p-3", r.ring)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{m.label}</span>
        <Icon className={cn("h-4 w-4 shrink-0", r.color)} />
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={cn("text-2xl font-bold tabular-nums", r.color)}>
          {m.display}
        </span>
        <span className={cn("text-xs font-medium", r.color)}>{r.label}</span>
      </div>
    </div>
  );
}

function LabCard({ m }: { m: LabMetric }) {
  const r = ratingMeta[m.rating];
  return (
    <div className={cn("rounded-xl p-3", r.bg)}>
      <div className="text-xs font-medium text-muted">{m.label}</div>
      <div className={cn("mt-1 text-lg font-bold tabular-nums", r.color)}>
        {m.display}
      </div>
    </div>
  );
}
