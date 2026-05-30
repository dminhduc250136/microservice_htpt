/**
 * Ảnh upload qua admin được serve trực tiếp từ product-service file system
 * (URL dạng /api/products/uploads/...) hoặc user-service (/api/users/uploads/...).
 * Next.js Image Optimizer fetch internal qua _next/image?url=... — gọi từ Node
 * server tới chính frontend:3000 sẽ KHÔNG route được đến endpoint này (nằm sau Caddy
 * → gateway → service) → response không phải image → Next báo 400 "not a valid image".
 *
 * Workaround: với src bắt đầu bằng /api/ (ảnh upload nội bộ), set unoptimized=true
 * để Next render thẳng <img> không qua optimizer. Trade-off: không có lazy convert
 * AVIF/WEBP — chấp nhận vì validate ở backend đã giới hạn 5MB + ext whitelist.
 */
export function isInternalUploadUrl(src: string | null | undefined): boolean {
  if (!src) return false;
  return src.startsWith('/api/') && src.includes('/uploads/');
}
