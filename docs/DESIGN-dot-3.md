# DESIGN — Đợt 3: DSS Admin (Dự đoán doanh thu + AI Insight)

> Mảng "Hệ hỗ trợ ra quyết định" (DSS) của **nhóm 04**: dashboard admin có AI
> phân tích data bán hàng → dự báo doanh thu + sinh insight/khuyến nghị.
> Nguyên tắc: **tái dùng data có sẵn, AI chỉ là tầng phân tích**, luôn có fallback.

---

## Tin tốt: hạ tầng data ĐÃ CÓ SẴN (không cần query mới)

Khảo sát codebase cho thấy admin dashboard đã hoàn chỉnh:
- `order-service` `OrderChartsService.revenueByDay(Range)` — doanh thu DELIVERED theo
  ngày, **đã gap-fill** (ngày không bán = 0). Endpoint `GET /api/orders/admin/charts/revenue?range=7d|30d|90d|all`.
  Shape: `RevenuePoint { date: "yyyy-MM-dd", value: number(VND) }`.
- `aggregateTopProducts` (top SP bán chạy), `aggregateStatusDistribution` (phân phối trạng thái).
- Frontend: `src/app/admin/page.tsx` — dashboard recharts (RevenueChart, TopProducts...),
  service `src/services/charts.ts` (`fetchRevenueChart`...), dropdown range.
- AI route mẫu: `src/app/api/admin/orders/[id]/suggest-reply/route.ts` — đã có pattern
  `requireAdmin` + gọi AI ở Next route. ⚠️ NHƯNG route này dùng **Anthropic Claude**
  (tài khoản đã khóa) → Đợt 3 dùng **Gemini**.

→ Đợt 3 = thêm 1 tầng AI đọc data có sẵn → phân tích. KHÔNG cần migration/query backend mới.

---

## #5 — Dự đoán doanh thu (Revenue forecast)

### Mục tiêu
Trên dashboard admin, thêm panel **"Dự báo doanh thu (AI)"**: từ doanh thu các ngày
qua → AI ước tính xu hướng + doanh thu kỳ tới (vd 7 ngày tới) + nhận định tăng/giảm.

### Cách làm (embed AI ở frontend Next route — như chat/review)
```
Dashboard admin (client)
 → GET /api/admin/insights?range=30d   [Next route, requireAdmin]
   → fetch /api/orders/admin/charts/revenue?range=30d (kèm Bearer admin)
   → (tùy chọn) fetch top-products + status-distribution để insight giàu hơn
   → Gemini phân tích chuỗi doanh thu → { forecast, insights[] }
   → CACHE in-memory TTL ~1h theo range (data đổi chậm; tiết kiệm quota)
   → trả JSON → render panel
```

### #6 gộp chung route — AI Insight + khuyến nghị
Cùng 1 lần gọi Gemini, trả luôn cả **insight + khuyến nghị** (gộp #5 và #6 cho gọn,
1 request thay vì 2):
```json
{
  "forecast": {
    "trend": "tăng" | "giảm" | "ổn định",
    "summary": "1-2 câu nhận định xu hướng",
    "nextPeriodEstimate": "ước tính doanh thu kỳ tới (khoảng, có nêu độ không chắc chắn)"
  },
  "insights": [
    "SP/nhóm bán chạy bất thường ...",
    "Ngày/giai đoạn doanh thu thấp ...",
    "..."  // 2-4 ý quan sát từ data
  ],
  "recommendations": [
    "Đề xuất hành động: vd đẩy mạnh SP X, khuyến mãi nhóm Y bán chậm ...",
    "..."  // 1-3 khuyến nghị
  ]
}
```

### File đụng
- **Mới** `lib/admin/insights.ts`: `generateInsights(range, bearer): Promise<Insights | null>`
  - fetch revenue (+ top-products, status) qua gateway kèm Bearer admin.
  - Gemini (`gemini-2.5-flash`, **`thinkingConfig: {thinkingBudget: 0}`** — bài học Đợt 2!,
    `responseMimeType: application/json` + `responseSchema` ép object).
  - cache Map TTL 1h theo range. Trả null nếu lỗi/thiếu data.
- **Mới** route `app/api/admin/insights/route.ts`: `GET ?range=` — `requireAdmin`
  (reuse `verifyJwtFromRequest` + `requireAdmin`). Forward Bearer của admin xuống gateway
  để gọi chart admin endpoints. Luôn trả `{ insights }`; lỗi → null (không 500).
- **Mới** component `components/admin/InsightsPanel.tsx` + css: panel render
  forecast (badge trend + summary + ước tính) / insights (list) / recommendations (list).
  Tự ẩn/hiện "chưa đủ dữ liệu" nếu null. Đặt trên dashboard, đồng bộ với dropdown range.
- **Sửa** `app/admin/page.tsx`: thêm `<InsightsPanel range={range} />` (truyền range hiện tại).
- **Sửa** `services/` (tùy chọn): thêm `fetchInsights(range)` cho gọn (hoặc fetch thẳng trong panel).

### Prompt (rút gọn)
> "Bạn là chuyên gia phân tích bán lẻ. Dưới đây là doanh thu theo ngày (VND, đã gồm
> ngày bằng 0) + top sản phẩm bán chạy + phân phối trạng thái đơn. Phân tích KHÁCH QUAN
> bằng tiếng Việt: xu hướng (tăng/giảm/ổn định) + ước tính doanh thu kỳ tới (nêu rõ là
> ƯỚC TÍNH, không chắc chắn tuyệt đối) + 2-4 insight + 1-3 khuyến nghị hành động.
> Chỉ dựa trên số liệu, KHÔNG bịa. Trả JSON đúng schema."

### An toàn (bài học Đợt 1 + 2)
- **`thinkingBudget: 0`** bắt buộc (Gemini 2.5 cắt JSON nếu bật thinking — vụ #49).
- `responseSchema` ép object (tránh Gemini trả mảng).
- Lỗi/thiếu data → panel ẩn, dashboard vẫn render charts bình thường.
- Forecast nêu RÕ là ước tính (tránh admin hiểu nhầm là số chắc chắn).
- Cache 1h/range → data bán hàng đổi chậm, đỡ tốn quota + nhanh.
- `requireAdmin` server-side (chỉ admin gọi được; data doanh thu nhạy cảm).

### Verify
- Dashboard admin: panel hiện trend + summary + insight + khuyến nghị hợp lý với data thật.
- Đổi range 7d/30d/90d → panel cập nhật.
- Gọi 2 lần cùng range → cache (nhanh, không tốn token).
- Non-admin gọi route → 403. Gemini lỗi → panel ẩn, charts vẫn chạy.
- Test trên VM với data orders thật (đã có đơn DELIVERED).

---

## THỨ TỰ LÀM ĐỢT 3
| # | Việc | Ghi chú |
|---|------|---------|
| 1 | `lib/admin/insights.ts` (fetch data + Gemini + cache) | thinkingBudget:0 + schema |
| 2 | route `api/admin/insights` (requireAdmin, forward Bearer) | luôn trả {insights} |
| 3 | `InsightsPanel.tsx` + css + gắn vào dashboard | đồng bộ range |
| 4 | Verify trên VM (data orders thật) | |

> **1 PR duy nhất** (gộp #5 + #6) vì cùng 1 route/1 lần gọi AI. KHÔNG đụng DB/backend
> Java → deploy nhẹ như Đợt 2.

## GHI CHÚ
- Dùng **Gemini** (`gemini-2.5-flash`), KHÔNG dùng Anthropic (tài khoản khóa).
- Nếu sau này muốn "đúng chuẩn DSS" hơn: có thể thêm forecast thống kê (moving average/
  linear trend) ở backend rồi AI diễn giải — nhưng giai đoạn học tập, AT đọc data trực
  tiếp là đủ ấn tượng + đúng hướng nhóm 04.
- (Ngoài lề) route suggest-reply cũ vẫn trỏ Anthropic → có thể migrate sang Gemini sau
  (không thuộc Đợt 3, ghi nhận để dọn).
