"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Hash,
  Loader2,
  Search,
  Target,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckStatus } from "@/lib/seo/types";
import type {
  ContentResult,
  KeywordStat,
  ReadabilityStats,
} from "@/lib/seo/content";

const statusMeta: Record<
  CheckStatus,
  { icon: typeof CheckCircle2; color: string }
> = {
  good: { icon: CheckCircle2, color: "text-good" },
  warning: { icon: AlertTriangle, color: "text-warning" },
  error: { icon: XCircle, color: "text-error" },
};

const readabilityColor = { good: "text-good", ni: "text-warning", poor: "text-error" };

export default function ContentPage() {
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ContentResult | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, keyword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra.");
      setResult(data as ContentResult);
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
          <FileText className="h-4 w-4" />
          Tối ưu nội dung
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Phân tích nội dung & từ khóa
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">
          Đo lượng chữ, độ dễ đọc và mật độ từ khóa của trang. Nhập thêm{" "}
          <strong>từ khóa mục tiêu</strong> để nhận checklist tối ưu cụ thể.
        </p>
      </div>

      <form onSubmit={run} className="mx-auto mt-8 max-w-2xl space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="vd: example.com hoặc https://tencongty.vn/bai-viet"
            className="w-full rounded-xl border bg-card py-3.5 pl-12 pr-4 text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Target className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Từ khóa mục tiêu (tùy chọn) — vd: sofa da thật"
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
        </div>
      </form>

      {error && (
        <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          <strong className="font-semibold">Không thể phân tích: </strong>
          {error}
        </div>
      )}

      {loading && <LoadingSkeleton />}
      {result && !loading && <Results result={result} />}
      {!result && !loading && !error && <EmptyState />}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-dashed bg-card/50 p-8 text-center text-sm text-muted">
      <p className="font-medium text-foreground">Kết quả sẽ hiển thị ở đây</p>
      <p className="mt-1">
        Công cụ sẽ đo lượng chữ, độ dễ đọc, top từ khóa & cụm từ, và đối chiếu
        từ khóa mục tiêu với tiêu đề, H1, mô tả, URL…
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto mt-10 max-w-4xl animate-pulse space-y-4">
      <div className="h-32 rounded-2xl bg-card" />
      <div className="h-48 rounded-2xl bg-card" />
    </div>
  );
}

function Results({ result }: { result: ContentResult }) {
  const r = result.readability;
  return (
    <div className="mt-10 space-y-6">
      {/* Readability */}
      <section className="animate-fade-up rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">Độ dễ đọc & cấu trúc</h2>
          <p className="break-all text-sm text-muted">{result.finalUrl}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Số từ" value={r.wordCount.toLocaleString("vi-VN")} />
          <Stat label="Số câu" value={r.sentenceCount.toLocaleString("vi-VN")} />
          <Stat label="Đoạn văn" value={r.paragraphCount.toLocaleString("vi-VN")} />
          <Stat label="Từ/câu (TB)" value={String(r.avgWordsPerSentence)} />
          <Stat
            label="Thời gian đọc"
            value={`${r.readingTimeMin} phút`}
            icon={Clock}
          />
        </div>
        <ReadabilityVerdict r={r} />
      </section>

      {/* Target keyword checklist */}
      {result.target && (
        <section className="animate-fade-up rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">
                Từ khóa mục tiêu: “{result.target.keyword}”
              </h3>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {result.target.count} lần · mật độ {result.target.density}%
            </span>
          </div>
          <ul className="space-y-3">
            {result.target.checks.map((c) => {
              const m = statusMeta[c.status];
              const Icon = m.icon;
              return (
                <li key={c.id} className="flex gap-3">
                  <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", m.color)} />
                  <div>
                    <span className="font-medium">{c.label}</span>
                    <p className="mt-0.5 text-sm text-muted">{c.message}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Keywords */}
      <div className="grid animate-fade-up gap-6 lg:grid-cols-2">
        <KeywordList
          title="Từ khóa nổi bật"
          icon={Hash}
          items={result.topKeywords}
          empty="Không đủ nội dung để thống kê từ khóa."
        />
        <KeywordList
          title="Cụm từ nổi bật"
          icon={Hash}
          items={result.topPhrases}
          empty="Chưa phát hiện cụm từ lặp lại đáng kể."
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Clock;
}) {
  return (
    <div className="rounded-xl bg-background p-3">
      <div className="flex items-center gap-1 text-xs text-muted">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function ReadabilityVerdict({ r }: { r: ReadabilityStats }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-xl border-l-4 border-primary/40 bg-background p-4">
      <ChevronRight
        className={cn("mt-0.5 h-5 w-5 shrink-0", readabilityColor[r.rating])}
      />
      <div className="text-sm">
        <span className={cn("font-semibold", readabilityColor[r.rating])}>
          {r.rating === "good"
            ? "Dễ đọc"
            : r.rating === "ni"
              ? "Tạm ổn"
              : "Khó đọc"}
        </span>
        <span className="text-muted">
          {" "}
          — {r.verdict} ({r.longSentenceCount} câu dài, chiếm{" "}
          {r.longSentencePct}%).
        </span>
      </div>
    </div>
  );
}

function KeywordList({
  title,
  icon: Icon,
  items,
  empty,
}: {
  title: string;
  icon: typeof Hash;
  items: KeywordStat[];
  empty: string;
}) {
  const max = items.length ? items[0].count : 1;
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg bg-background px-4 py-6 text-center text-sm text-muted">
          {empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((k) => (
            <li key={k.term}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium">{k.term}</span>
                <span className="shrink-0 tabular-nums text-muted">
                  {k.count} · {k.density}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${Math.round((k.count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
