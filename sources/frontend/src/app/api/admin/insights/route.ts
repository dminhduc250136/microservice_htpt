import { verifyJwtFromRequest, requireAdmin } from '@/lib/chat/auth';
import { checkRateLimit } from '@/lib/chat/rate-limit';
import { generateInsights, type Range } from '@/lib/admin/insights';
import type { JwtClaims } from '@/lib/chat/auth';

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
 * GET /api/admin/insights?range=7d|30d|90d|all — DSS admin (Đợt 3 #5+#6).
 * AI phân tích data bán hàng → dự báo doanh thu + insight + khuyến nghị.
 * ADMIN only (data doanh thu nhạy cảm). Luôn trả { insights } — thiếu data/lỗi →
 * insights=null → client ẩn panel (dashboard charts vẫn chạy bình thường).
 */
export async function GET(req: Request): Promise<Response> {
  let claims: JwtClaims;
  try {
    claims = await verifyJwtFromRequest(req);
  } catch {
    return err(401, 'AUTH_FAILED', 'Phiên đăng nhập không hợp lệ');
  }
  try {
    requireAdmin(claims);
  } catch {
    return err(403, 'FORBIDDEN', 'Chỉ admin mới được dùng tính năng này');
  }
  if (!checkRateLimit(claims.userId)) {
    return err(429, 'RATE_LIMITED', 'Quá nhanh, thử lại sau ít phút');
  }

  const range = (new URL(req.url).searchParams.get('range') ?? '30d') as Range;
  const bearer = req.headers.get('authorization') ?? '';
  try {
    const insights = await generateInsights(range, bearer);
    return ok({ insights });
  } catch {
    return ok({ insights: null }); // mọi lỗi → ẩn panel, không 500
  }
}
