/**
 * Product service API — listProducts, getProductById, listCategories, etc.
 *
 * Source: 04-RESEARCH.md §Pattern 2. Types derived from generated products.paths.
 * Gateway paths (corrected Phase 5 Plan 09 — Rule 1 bug fix):
 *   Gateway /api/products   → product-service /products   (list)
 *   Gateway /api/products/{id} → product-service /products/{id}   (detail)
 *   Gateway /api/products/categories → product-service /products/categories
 * Previous paths had double /api/products/products which caused 404 (gateway
 * strips /api/products prefix, forwarding /products/{seg} to product-service).
 *
 * Pitfall 7 note: springdoc emits `never` for several response bodies because
 * ApiResponseAdvice wraps the data field invisibly. http.ts unwraps one envelope
 * level; list/detail shapes are therefore hand-narrowed to the UI-owned Product
 * and PaginatedResponse types from @/types. When backend controllers add
 * @ApiResponse(content=@Content(schema=...)) annotations, swap hand-narrow for
 * paths[...] accessors.
 */

// ===== PRODUCT SERVICE API =====

import type { paths as _ProductsPaths } from '@/types/api/products.generated';
import type { Product, Category, PaginatedResponse } from '@/types';
import { httpGet, httpPost, httpPut, httpDelete } from './http';
import { isApiError } from './errors';

export type _PathsSurface = _ProductsPaths;

export interface ListProductsParams {
  page?: number;
  size?: number;
  sort?: string;
  categoryId?: string;
  keyword?: string;
  brands?: string[];        // NEW (D-08) — repeatable param
  priceMin?: number;        // NEW
  priceMax?: number;        // NEW
}

/**
 * Backend ProductResponse trả điểm trung bình ở field `rating`, nhưng FE đọc
 * `avgRating` (xem types Product) → sao luôn rỗng. Chuẩn hóa tại đây: nếu
 * `avgRating` chưa có thì lấy từ `rating`. Áp cho mọi hàm đọc product.
 */
function normalizeProduct(p: Product): Product {
  if (p == null) return p;
  const raw = p as Product & { rating?: number };
  if (raw.avgRating == null && raw.rating != null) {
    return { ...p, avgRating: raw.rating };
  }
  return p;
}

export async function listProducts(params?: ListProductsParams): Promise<PaginatedResponse<Product>> {
  const qs = new URLSearchParams();
  if (params?.page !== undefined) qs.set('page', String(params.page));
  if (params?.size !== undefined) qs.set('size', String(params.size));
  if (params?.sort)               qs.set('sort', params.sort);
  if (params?.categoryId)         qs.set('categoryId', params.categoryId);
  if (params?.keyword)            qs.set('keyword', params.keyword);
  if (params?.brands && params.brands.length > 0) {
    params.brands.forEach((b) => qs.append('brands', b));
  }
  if (params?.priceMin !== undefined) qs.set('priceMin', String(params.priceMin));
  if (params?.priceMax !== undefined) qs.set('priceMax', String(params.priceMax));
  const suffix = qs.toString() ? `?${qs}` : '';
  const resp = await httpGet<PaginatedResponse<Product>>(`/api/products${suffix}`);
  return { ...resp, content: (resp?.content ?? []).map(normalizeProduct) };
}

export async function getProductById(id: string): Promise<Product> {
  return normalizeProduct(await httpGet<Product>(`/api/products/${encodeURIComponent(id)}`));
}

/**
 * Slug-based lookup. Gọi thẳng endpoint chuyên dụng `/products/slug/{slug}` (backend
 * đã có sẵn: ProductController.getProductBySlug → findBySlug).
 *
 * Bản cũ tải trang đầu (size=50) rồi lọc client-side — sai khi catalog > 50 SP:
 * SP nằm ngoài 50 SP đầu (catalog hiện 131 SP, backend cap pageSize=100) trả null,
 * khiến PDP fallback tra theo id bằng chính slug → 404 → "Không tải được dữ liệu".
 *
 * 404 từ backend (slug không tồn tại) → trả null để caller chạy notFound() như cũ.
 * Lỗi khác (mạng/500) vẫn ném ra để PDP hiển thị RetrySection.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    return normalizeProduct(await httpGet<Product>(`/api/products/slug/${encodeURIComponent(slug)}`));
  } catch (err) {
    if (isApiError(err) && err.code === 'NOT_FOUND') return null;
    throw err;
  }
}

export function listCategories(): Promise<PaginatedResponse<Category>> {
  return httpGet<PaginatedResponse<Category>>(`/api/products/categories`);
}

/**
 * Phase 14 / SEARCH-01 (D-03): danh sách thương hiệu DISTINCT từ catalog.
 * Backend trả ApiResponse<List<String>> — http.ts unwrap envelope.
 */
export function listBrands(): Promise<string[]> {
  return httpGet<string[]>(`/api/products/brands`);
}

// Admin product create/update body — D-03 extended fields
export interface ProductUpsertBody {
  name: string;
  slug?: string;          // optional — nếu không cung cấp, backend hoặc FE auto-gen từ name
  categoryId: string;
  price: number;
  status: string;         // "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK"
  stock?: number;
  brand?: string;
  thumbnailUrl?: string;
  shortDescription?: string;
  description?: string;       // mô tả dài (PDP tab "Mô tả")
  specifications?: string;    // JSON string [{label,value}] (PDP tab "Thông số")
  originalPrice?: number;
}

// ============================================================
// Admin product functions — gateway: /api/products/admin → /admin/products
// ============================================================

export function listAdminProducts(params?: ListProductsParams): Promise<PaginatedResponse<Product>> {
  const qs = new URLSearchParams();
  if (params?.page !== undefined) qs.set('page', String(params.page));
  if (params?.size  !== undefined) qs.set('size',  String(params.size));
  if (params?.sort)                qs.set('sort',  params.sort);
  if (params?.keyword)             qs.set('keyword', params.keyword);
  const suffix = qs.toString() ? `?${qs}` : '';
  return httpGet<PaginatedResponse<Product>>(`/api/products/admin${suffix}`);
}

export function createProduct(body: ProductUpsertBody): Promise<Product> {
  return httpPost<Product>('/api/products/admin', body);
}

export function updateProduct(id: string, body: ProductUpsertBody): Promise<Product> {
  return httpPut<Product>(`/api/products/admin/${encodeURIComponent(id)}`, body);
}

export function deleteProduct(id: string): Promise<void> {
  return httpDelete<void>(`/api/products/admin/${encodeURIComponent(id)}`);
}

export function listAdminCategories(): Promise<PaginatedResponse<Category>> {
  return httpGet<PaginatedResponse<Category>>('/api/products/admin/categories');
}

/**
 * Upload ảnh sản phẩm — wrapper mỏng quanh {@link uploadImage}, chỉ chốt endpoint.
 * Trả về URL relative dạng /api/products/uploads/products/<name> để gán vào thumbnailUrl.
 */
import { uploadImage } from './upload';
export function uploadProductImage(file: File): Promise<string> {
  return uploadImage('/api/products/admin/upload', file);
}
