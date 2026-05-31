-- Fix lệch số đánh giá (profile=dev): tab "Đánh giá (N)" trên PDP dùng
-- products.review_count (denormalized), còn list review dùng live COUNT từ bảng
-- reviews → lệch nếu review_count không khớp số review thật.
--
-- Nguyên nhân: V103 recompute qua subquery GROUP BY reviews → chỉ chạm sản phẩm
-- CÓ trong nhóm reviews, bỏ sót sản phẩm bị V102 set review_count=1 nhưng review
-- đó đổi/khác filter (điển hình prod-pho-001: review_count=0 nhưng có 4 review).
--
-- Sửa: recompute review_count + avg_rating cho MỌI sản phẩm bằng LEFT JOIN từ
-- products (sản phẩm không review → 0). Idempotent: chỉ UPDATE dòng đang lệch.

UPDATE products p
SET
  review_count = COALESCE(r.cnt, 0),
  avg_rating   = COALESCE(r.avg_r, 0),
  updated_at   = NOW()
FROM (
  SELECT
    pr.id AS product_id,
    COUNT(rv.id) FILTER (WHERE rv.deleted_at IS NULL AND rv.hidden = FALSE) AS cnt,
    ROUND(AVG(rv.rating) FILTER (WHERE rv.deleted_at IS NULL AND rv.hidden = FALSE)::numeric, 1) AS avg_r
  FROM products pr
  LEFT JOIN reviews rv ON rv.product_id = pr.id
  GROUP BY pr.id
) r
WHERE p.id = r.product_id
  AND (p.review_count <> COALESCE(r.cnt, 0) OR p.avg_rating <> COALESCE(r.avg_r, 0));
