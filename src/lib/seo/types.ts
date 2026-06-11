export type CheckStatus = "good" | "warning" | "error";

export interface SeoCheck {
  id: string;
  /** Tên mục kiểm tra, hiển thị cho người dùng */
  label: string;
  status: CheckStatus;
  /** Giá trị thực tế tìm thấy trên trang (nếu có) */
  value?: string;
  /** Nhận xét ngắn gọn về kết quả */
  message: string;
  /** Gợi ý cách khắc phục (chỉ khi cần cải thiện) */
  suggestion?: string;
  /** Trọng số khi tính điểm danh mục */
  weight: number;
}

export interface SeoCategory {
  id: string;
  title: string;
  /** Điểm 0–100 của riêng danh mục này */
  score: number;
  checks: SeoCheck[];
}

export interface SerpPreview {
  title: string;
  displayUrl: string;
  description: string;
}

export interface SeoResult {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  /** Điểm tổng 0–100 */
  overallScore: number;
  serp: SerpPreview;
  categories: SeoCategory[];
  /** Tổng hợp số lượng theo trạng thái để hiển thị nhanh */
  summary: { good: number; warning: number; error: number };
}
