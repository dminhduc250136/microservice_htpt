import { summarizeReviews } from '@/lib/chat/review-summary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ok<T>(data: T): Response {
  return new Response(
    JSON.stringify({ timestamp: new Date().toISOString(), status: 200, message: 'OK', data }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function err(status: number, code: string, message: string): Response {
  return new Response(
    JSON.stringify({ status, code, message, error: code }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

/**
 * GET /api/chat/review-summary?productId=xxx — tóm tắt review bằng AI (Đợt 2 #3).
 * Public (review là dữ liệu công khai). Trả { summary: null } khi chưa đủ review
 * hoặc AI lỗi → client ẩn panel, KHÔNG phá trang SP.
 */
export async function GET(req: Request): Promise<Response> {
  const productId = new URL(req.url).searchParams.get('productId')?.trim();
  if (!productId) return err(400, 'MISSING_PRODUCT_ID', 'Thiếu productId');
  try {
    const summary = await summarizeReviews(productId);
    return ok({ summary });
  } catch {
    // Mọi lỗi không lường → coi như không có tóm tắt (ẩn panel), không 500 phá UX.
    return ok({ summary: null });
  }
}
