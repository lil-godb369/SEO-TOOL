"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCode2,
  Link2,
  Loader2,
  ScrollText,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildRobotsTxt,
  buildSitemapXml,
  MAX_LINKS_TO_CHECK,
  type AuditResult,
  type LinkStatus,
} from "@/lib/seo/audit";
import { CopyButton } from "@/components/ui/fields";

type FilterKey = LinkStatus | "all";

const linkMeta: Record<
  LinkStatus,
  { icon: typeof CheckCircle2; color: string; bg: string; label: string }
> = {
  ok: { icon: CheckCircle2, color: "text-good", bg: "bg-green-50", label: "Hoạt động" },
  redirect: { icon: ArrowRight, color: "text-warning", bg: "bg-amber-50", label: "Chuyển hướng" },
  broken: { icon: XCircle, color: "text-error", bg: "bg-red-50", label: "Lỗi (4xx/5xx)" },
  error: { icon: AlertTriangle, color: "text-error", bg: "bg-red-50", label: "Không kết nối" },
};

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);

  async function audit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra.");
      setResult(data as AuditResult);
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
          <ShieldCheck className="h-4 w-4" />
          Audit kỹ thuật
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Kiểm tra link & cấu hình kỹ thuật
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">
          Quét toàn bộ liên kết trên trang để phát hiện link gãy (404), chuyển
          hướng (301/302) và lỗi kết nối; đồng thời kiểm tra{" "}
          <code className="rounded bg-card px-1.5 py-0.5 text-sm">robots.txt</code>{" "}
          &{" "}
          <code className="rounded bg-card px-1.5 py-0.5 text-sm">sitemap.xml</code>{" "}
          — kèm trình tạo sẵn hai tệp này.
        </p>
      </div>

      <form
        onSubmit={audit}
        className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
      >
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
              Đang quét…
            </>
          ) : (
            "Quét link"
          )}
        </button>
      </form>

      {error && (
        <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          <strong className="font-semibold">Không thể quét: </strong>
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
  const items = [
    "Link gãy 404 & lỗi máy chủ 5xx",
    "Chuyển hướng 301/302 (đích đến)",
    "Link nội bộ vs liên kết ngoài",
    "robots.txt & sitemap.xml + trình tạo",
  ];
  return (
    <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-dashed bg-card/50 p-8 text-center">
      <p className="font-medium">Kết quả audit sẽ hiển thị ở đây</p>
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
      <div className="h-28 rounded-2xl bg-card" />
      <div className="h-24 rounded-2xl bg-card" />
      <div className="h-72 rounded-2xl bg-card" />
    </div>
  );
}

function Results({ result }: { result: AuditResult }) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = useMemo(
    () =>
      filter === "all"
        ? result.links
        : result.links.filter((l) => l.status === filter),
    [filter, result.links],
  );

  const stats: { key: FilterKey; label: string; value: number; color: string }[] =
    [
      { key: "all", label: "Đã kiểm tra", value: result.totals.total, color: "text-foreground" },
      { key: "ok", label: "Hoạt động", value: result.totals.ok, color: "text-good" },
      { key: "redirect", label: "Chuyển hướng", value: result.totals.redirect, color: "text-warning" },
      { key: "broken", label: "Link gãy", value: result.totals.broken, color: "text-error" },
      { key: "error", label: "Lỗi kết nối", value: result.totals.error, color: "text-error" },
    ];

  return (
    <div className="mt-10 space-y-6">
      {/* Summary */}
      <section className="animate-fade-up rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">Tổng quan</h2>
          <p className="break-all text-sm text-muted">{result.finalUrl}</p>
        </div>
        <p className="mb-5 text-sm text-muted">
          Tìm thấy {result.totalFound} liên kết, đã kiểm tra{" "}
          {result.checkedCount}
          {result.totalFound > result.checkedCount && (
            <> (giới hạn {MAX_LINKS_TO_CHECK} link/lần, ưu tiên link nội bộ)</>
          )}
          . Nội bộ: {result.totals.internal} · Ngoài: {result.totals.external}.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s) => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={cn(
                "rounded-xl border bg-background p-3 text-left transition hover:border-primary/40",
                filter === s.key && "border-primary ring-2 ring-primary/20",
              )}
            >
              <div className={cn("text-2xl font-bold tabular-nums", s.color)}>
                {s.value}
              </div>
              <div className="text-xs text-muted">{s.label}</div>
            </button>
          ))}
        </div>
      </section>

      {/* robots.txt / sitemap.xml presence */}
      <section className="grid animate-fade-up gap-4 sm:grid-cols-2">
        <ProbeCard
          title="robots.txt"
          icon={ScrollText}
          present={result.robotsTxt.present}
          httpStatus={result.robotsTxt.httpStatus}
          url={result.robotsTxt.url}
        />
        <ProbeCard
          title="sitemap.xml"
          icon={FileCode2}
          present={result.sitemapXml.present}
          httpStatus={result.sitemapXml.httpStatus}
          url={result.sitemapXml.url}
        />
      </section>

      {/* Link table */}
      <section className="animate-fade-up rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">
            Danh sách liên kết{" "}
            <span className="text-sm font-normal text-muted">
              ({filtered.length})
            </span>
          </h3>
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-lg bg-background px-4 py-6 text-center text-sm text-muted">
            Không có liên kết nào ở nhóm này.
          </p>
        ) : (
          <ul className="divide-y">
            {filtered.map((link) => {
              const m = linkMeta[link.status];
              const Icon = m.icon;
              return (
                <li key={link.url} className="flex gap-3 py-3">
                  <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", m.color)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-xs font-medium",
                          m.bg,
                          m.color,
                        )}
                      >
                        {link.httpStatus ?? "—"} · {m.label}
                      </span>
                      <span className="rounded bg-background px-1.5 py-0.5 text-xs text-muted">
                        {link.scope === "internal" ? "Nội bộ" : "Ngoài"}
                      </span>
                      {link.text && (
                        <span className="truncate text-sm font-medium">
                          {link.text}
                        </span>
                      )}
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 block break-all text-xs text-primary hover:underline"
                    >
                      {link.url}
                    </a>
                    {link.redirectTo && (
                      <p className="mt-0.5 flex items-start gap-1 break-all text-xs text-muted">
                        <ArrowRight className="mt-0.5 h-3 w-3 shrink-0" />
                        {link.redirectTo}
                      </p>
                    )}
                    {link.note && (
                      <p className="mt-0.5 text-xs text-error">{link.note}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Generators — key theo URL để reset form khi quét trang mới */}
      <Generators key={result.finalUrl} result={result} />
    </div>
  );
}

function ProbeCard({
  title,
  icon: Icon,
  present,
  httpStatus,
  url,
}: {
  title: string;
  icon: typeof ScrollText;
  present: boolean;
  httpStatus?: number;
  url: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <span className="font-semibold">{title}</span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
            present ? "bg-green-50 text-good" : "bg-amber-50 text-warning",
          )}
        >
          {present ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" /> Đã có
            </>
          ) : (
            <>
              <AlertTriangle className="h-3.5 w-3.5" /> Chưa tìm thấy
            </>
          )}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted">
        {present
          ? `Phản hồi HTTP ${httpStatus}.`
          : `Không truy cập được${httpStatus ? ` (HTTP ${httpStatus})` : ""} — dùng trình tạo bên dưới.`}
      </p>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 break-all text-xs text-primary hover:underline"
        >
          {url}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      )}
    </div>
  );
}

/* ------------------------- Trình tạo robots/sitemap ------------------------- */

function DownloadButton({
  text,
  filename,
  mime,
}: {
  text: string;
  filename: string;
  mime: string;
}) {
  function download() {
    const blob = new Blob([text], { type: mime });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(href);
  }
  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium transition hover:bg-background"
    >
      <Download className="h-4 w-4" /> Tải về
    </button>
  );
}

function Generators({ result }: { result: AuditResult }) {
  // Giá trị khởi tạo gợi ý từ kết quả audit
  const defaultSitemapUrl = result.origin ? `${result.origin}/sitemap.xml` : "";
  const defaultUrls = useMemo(() => {
    const list = [result.finalUrl, ...result.internalUrls];
    return Array.from(new Set(list.filter(Boolean))).join("\n");
  }, [result]);

  const [disallowText, setDisallowText] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState(defaultSitemapUrl);
  const [urlsText, setUrlsText] = useState(defaultUrls);
  const [lastmod, setLastmod] = useState("");

  const robots = useMemo(
    () =>
      buildRobotsTxt({
        disallow: disallowText.split("\n").map((l) => l.trim()),
        sitemapUrl,
      }),
    [disallowText, sitemapUrl],
  );

  const sitemap = useMemo(
    () =>
      buildSitemapXml({
        urls: urlsText.split("\n"),
        lastmod: lastmod || undefined,
      }),
    [urlsText, lastmod],
  );

  const taInput =
    "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <section className="animate-fade-up space-y-6">
      <div className="flex items-center gap-2">
        <FileCode2 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Trình tạo robots.txt & sitemap.xml</h3>
      </div>

      {/* robots.txt */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h4 className="mb-3 font-semibold">robots.txt</h4>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Đường dẫn chặn (Disallow)
            </span>
            <textarea
              value={disallowText}
              onChange={(e) => setDisallowText(e.target.value)}
              rows={4}
              placeholder={"/admin\n/gio-hang\n/tim-kiem"}
              className={cn(taInput, "resize-y font-mono")}
            />
            <span className="mt-1 block text-xs text-muted">
              Mỗi đường dẫn một dòng. Để trống = cho phép thu thập toàn bộ.
            </span>
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-sm font-medium">URL sitemap</span>
            <input
              type="text"
              value={sitemapUrl}
              onChange={(e) => setSitemapUrl(e.target.value)}
              placeholder="https://example.com/sitemap.xml"
              className={taInput}
            />
          </label>
        </div>
        <OutputBox
          code={robots}
          filename="robots.txt"
          mime="text/plain;charset=utf-8"
        />
      </div>

      {/* sitemap.xml */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h4 className="mb-3 font-semibold">sitemap.xml</h4>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Danh sách URL
            </span>
            <textarea
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              rows={8}
              className={cn(taInput, "resize-y font-mono")}
            />
            <span className="mt-1 block text-xs text-muted">
              Mỗi URL một dòng — đã điền sẵn các URL nội bộ tìm thấy khi quét.
            </span>
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-sm font-medium">
              Ngày cập nhật (lastmod)
            </span>
            <input
              type="date"
              value={lastmod}
              onChange={(e) => setLastmod(e.target.value)}
              className={taInput}
            />
          </label>
        </div>
        <OutputBox
          code={sitemap}
          filename="sitemap.xml"
          mime="application/xml;charset=utf-8"
        />
      </div>
    </section>
  );
}

function OutputBox({
  code,
  filename,
  mime,
}: {
  code: string;
  filename: string;
  mime: string;
}) {
  return (
    <div className="rounded-2xl border bg-[#0f172a] p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-300">{filename}</span>
        <div className="flex gap-2">
          <DownloadButton text={code} filename={filename} mime={mime} />
          <CopyButton text={code} />
        </div>
      </div>
      <pre className="max-h-[360px] overflow-auto rounded-lg bg-black/40 p-4 text-xs leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
