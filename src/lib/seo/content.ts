/**
 * Module 5 — Tối ưu nội dung.
 * Phân tích văn bản thuần: mật độ từ khóa, cụm từ, readability và kiểm tra từ
 * khóa mục tiêu. File thuần (không cheerio) — an toàn import từ client.
 * Việc trích nội dung từ HTML nằm ở `content-extract.ts`.
 */
import type { CheckStatus } from "./types";

/** Dữ liệu nội dung đã trích từ HTML (đầu vào cho phân tích). */
export interface ExtractedContent {
  url: string;
  title: string;
  metaDesc: string;
  h1: string;
  headings: string[];
  paragraphCount: number;
  /** Văn bản thân chính đã làm sạch */
  text: string;
}

export interface KeywordStat {
  term: string;
  count: number;
  /** Mật độ (%) trên tổng số từ */
  density: number;
}

export interface ReadabilityStats {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgWordsPerSentence: number;
  longSentenceCount: number;
  longSentencePct: number;
  readingTimeMin: number;
  rating: "good" | "ni" | "poor";
  verdict: string;
}

export interface KeywordTarget {
  keyword: string;
  count: number;
  density: number;
  checks: { id: string; label: string; status: CheckStatus; message: string }[];
}

export interface ContentResult {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  readability: ReadabilityStats;
  topKeywords: KeywordStat[];
  topPhrases: KeywordStat[];
  target?: KeywordTarget;
}

/** Câu dài hơn ngưỡng này (số từ) bị coi là khó đọc. */
const LONG_SENTENCE = 25;

/** Stopword tiếng Việt + một số tiếng Anh phổ biến (loại khỏi thống kê từ khóa). */
const STOPWORDS = new Set<string>([
  "và","là","của","có","các","được","cho","trong","không","với","này","đã",
  "khi","để","những","một","người","ra","tại","như","đến","về","cũng","nên",
  "thì","mà","ở","lại","vào","ngày","theo","sẽ","còn","hay","rằng","bị","do",
  "bởi","vì","nếu","hoặc","tôi","bạn","chúng","họ","nó","mình","ai","gì","đó",
  "đây","kia","ấy","nào","sao","rất","quá","lắm","hơn","nhất","đều","chỉ",
  "thêm","nữa","vẫn","đang","từng","mỗi","cả","tất","cùng","giữa","trên",
  "dưới","trước","sau","ngoài","cái","con","chiếc","việc","điều","khác",
  "phải","nhưng","tuy","dù","bằng","qua","làm","sự","thế","đi","lên","xuống",
  "the","and","a","an","of","to","in","for","on","is","are","with","by","at",
  "this","that","it","as","be","or","from","you","your","we","our","not","but",
  "they","have","has","had","was","were","will","can","all","more","one","out",
  "about","into","than","then","there","their","them","these","those","who",
  "what","which","when","where","how","why","only","just","very","some","any",
  "each","most","other","such","both","own","its","may","also","do","does","if",
]);

/** Chuẩn hóa & tách từ (giữ ký tự có dấu tiếng Việt). */
export function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const matches = lower.match(/[\p{L}\p{N}]+/gu) || [];
  return matches.filter((w) => w.length >= 2 && !/^\d+$/.test(w));
}

function topN(
  counts: Map<string, number>,
  total: number,
  n: number,
): KeywordStat[] {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([term, count]) => ({
      term,
      count,
      density: total ? Math.round((count / total) * 1000) / 10 : 0,
    }));
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function readability(
  wordCount: number,
  sentences: string[],
  paragraphCount: number,
): ReadabilityStats {
  const sentenceCount = sentences.length || 1;
  const longSentenceCount = sentences.filter(
    (s) => tokenize(s).length > LONG_SENTENCE,
  ).length;
  const avg = Math.round((wordCount / sentenceCount) * 10) / 10;
  const longPct = Math.round((longSentenceCount / sentenceCount) * 100);
  const readingTimeMin = Math.max(1, Math.round(wordCount / 200));

  let rating: "good" | "ni" | "poor" = "good";
  let verdict =
    "Câu có độ dài hợp lý, nội dung dễ đọc cho người dùng và công cụ tìm kiếm.";
  if (avg > 28 || longPct > 35) {
    rating = "poor";
    verdict =
      "Nhiều câu quá dài — nên tách thành câu ngắn (dưới 25 từ) để dễ đọc hơn.";
  } else if (avg > 22 || longPct > 20) {
    rating = "ni";
    verdict =
      "Một số câu hơi dài — cân nhắc rút gọn để tăng khả năng đọc lướt.";
  }

  return {
    wordCount,
    sentenceCount: sentences.length,
    paragraphCount,
    avgWordsPerSentence: avg,
    longSentenceCount,
    longSentencePct: longPct,
    readingTimeMin,
    rating,
    verdict,
  };
}

function analyzeTarget(
  keyword: string,
  c: ExtractedContent,
  words: string[],
  totalWords: number,
): KeywordTarget {
  const kw = normalize(keyword);
  const haystackText = normalize(c.text);
  // Đếm số lần xuất hiện cụm từ khóa trong văn bản
  let count = 0;
  if (kw) {
    let idx = haystackText.indexOf(kw);
    while (idx !== -1) {
      count++;
      idx = haystackText.indexOf(kw, idx + kw.length);
    }
  }
  // Mật độ tính theo số từ trong cụm khóa
  const kwWords = tokenize(kw).length || 1;
  const density = totalWords
    ? Math.round(((count * kwWords) / totalWords) * 1000) / 10
    : 0;

  const first100 = normalize(words.slice(0, 100).join(" "));
  const headingsText = normalize(c.headings.join(" "));
  let urlText = "";
  try {
    urlText = decodeURIComponent(new URL(c.url).pathname)
      .toLowerCase()
      .replace(/[-_/]+/g, " ");
  } catch {
    /* bỏ qua */
  }

  const has = (hay: string) => kw !== "" && normalize(hay).includes(kw);

  const checks: KeywordTarget["checks"] = [
    {
      id: "kw-title",
      label: "Trong thẻ tiêu đề",
      status: has(c.title) ? "good" : "error",
      message: has(c.title)
        ? "Tiêu đề chứa từ khóa mục tiêu."
        : "Tiêu đề chưa chứa từ khóa — nên đưa từ khóa vào <title>.",
    },
    {
      id: "kw-h1",
      label: "Trong thẻ H1",
      status: has(c.h1) ? "good" : "warning",
      message: has(c.h1)
        ? "H1 chứa từ khóa."
        : "H1 chưa chứa từ khóa — cân nhắc bổ sung tự nhiên.",
    },
    {
      id: "kw-meta",
      label: "Trong meta description",
      status: has(c.metaDesc) ? "good" : "warning",
      message: has(c.metaDesc)
        ? "Mô tả chứa từ khóa."
        : "Meta description chưa có từ khóa.",
    },
    {
      id: "kw-intro",
      label: "Trong 100 từ đầu",
      status: first100.includes(kw) && kw !== "" ? "good" : "warning",
      message:
        first100.includes(kw) && kw !== ""
          ? "Từ khóa xuất hiện sớm trong nội dung."
          : "Nên nhắc từ khóa trong đoạn mở đầu.",
    },
    {
      id: "kw-headings",
      label: "Trong tiêu đề phụ",
      status: headingsText.includes(kw) && kw !== "" ? "good" : "warning",
      message:
        headingsText.includes(kw) && kw !== ""
          ? "Có tiêu đề phụ chứa từ khóa."
          : "Chưa có H2/H3 nào chứa từ khóa.",
    },
    {
      id: "kw-url",
      label: "Trong đường dẫn URL",
      status: urlText.includes(kw) && kw !== "" ? "good" : "warning",
      message:
        urlText.includes(kw) && kw !== ""
          ? "URL thân thiện, chứa từ khóa."
          : "URL chưa chứa từ khóa (không bắt buộc).",
    },
    {
      id: "kw-density",
      label: "Mật độ từ khóa",
      status: density === 0 ? "error" : density > 3 ? "warning" : "good",
      message:
        density === 0
          ? "Không tìm thấy từ khóa trong nội dung."
          : density > 3
            ? `Mật độ ${density}% hơi cao — tránh nhồi nhét từ khóa (nên 0,5–2,5%).`
            : `Mật độ ${density}% (${count} lần) — hợp lý.`,
    },
  ];

  return { keyword: keyword.trim(), count, density, checks };
}

/** Phân tích nội dung từ dữ liệu đã trích + từ khóa mục tiêu tùy chọn. */
export function analyzeContent(
  c: ExtractedContent,
  keyword?: string,
): Omit<ContentResult, "url" | "finalUrl" | "fetchedAt"> {
  const words = tokenize(c.text);
  const totalWords = words.length;

  // Câu: tách theo dấu kết câu
  const sentences = c.text
    .split(/[.!?…]+/)
    .map((s) => s.trim())
    .filter((s) => tokenize(s).length > 0);

  // Unigram (loại stopword)
  const uni = new Map<string, number>();
  for (const w of words) {
    if (STOPWORDS.has(w)) continue;
    uni.set(w, (uni.get(w) || 0) + 1);
  }

  // Bigram (loại cụm có chứa stopword ở hai đầu)
  const bi = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i];
    const b = words[i + 1];
    if (STOPWORDS.has(a) || STOPWORDS.has(b)) continue;
    const term = `${a} ${b}`;
    bi.set(term, (bi.get(term) || 0) + 1);
  }

  const readabilityStats = readability(
    totalWords,
    sentences,
    c.paragraphCount,
  );

  return {
    readability: readabilityStats,
    topKeywords: topN(uni, totalWords, 10),
    topPhrases: topN(bi, totalWords, 8).filter((k) => k.count > 1),
    target: keyword?.trim()
      ? analyzeTarget(keyword, c, words, totalWords)
      : undefined,
  };
}
