import { normalizeVn, escapeXml } from './vn-text';
import type { ChatProduct, ChatSpec } from './types';

const GATEWAY = process.env.API_GATEWAY_URL ?? 'http://api-gateway:8080';

/** Số sản phẩm tối đa đưa vào context (tăng từ 5 → 8 để AI có nhiều lựa chọn so sánh). */
const CONTEXT_SIZE = 8;
/** Giới hạn độ dài mô tả dài đưa vào context (tránh phình token quá mức). */
const MAX_DESC_LEN = 400;

/**
 * Keyword search via product-service REST (D-18, D-16). Returns up to CONTEXT_SIZE products,
 * xếp hạng theo độ liên quan (rating × độ phổ biến) để gợi ý sản phẩm tốt trước.
 * Falls back to "recently updated" feed if keyword search returns < 3 hits, so the
 * model always has at least some catalog grounding for non-product chitchat.
 *
 * T-22-08 mitigation: keyword goes through encodeURIComponent — no raw SQL from user input.
 */
export async function searchProductsForContext(userMessage: string): Promise<ChatProduct[]> {
  const norm = normalizeVn(userMessage);
  const tokens = norm.split(/\s+/).filter((t) => t.length >= 2).slice(0, 6);
  const keyword = tokens.join(' ');
  const baseUrl = `${GATEWAY}/api/products`;
  // Lấy rộng hơn (size lớn) rồi tự rank + cắt — vì backend chỉ sort updatedAt,
  // không xếp theo độ liên quan/chất lượng.
  const searchUrl = `${baseUrl}?keyword=${encodeURIComponent(keyword)}&size=20`;

  let products: ChatProduct[] = [];
  try {
    const res = await fetch(searchUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const env = await res.json();
      products = (env?.data?.content ?? []).map(mapProduct);
    }
  } catch {
    /* fall through to fallback */
  }

  if (products.length < 3) {
    try {
      const fbRes = await fetch(`${baseUrl}?size=20&sort=updatedAt,desc`, { cache: 'no-store' });
      if (fbRes.ok) {
        const fbEnv = await fbRes.json();
        products = (fbEnv?.data?.content ?? []).map(mapProduct);
      }
    } catch {
      /* return whatever we have */
    }
  }

  return rankProducts(products).slice(0, CONTEXT_SIZE);
}

/**
 * Xếp hạng sản phẩm theo điểm chất lượng + độ phổ biến để AI ưu tiên gợi ý hàng tốt:
 *   score = rating(0-5) × 2  + log(soldCount+1)  + (còn hàng ? 1 : 0)
 * Backend chỉ trả theo updatedAt nên việc rank này bù phần thiếu relevance ranking.
 */
function rankProducts(products: ChatProduct[]): ChatProduct[] {
  const score = (p: ChatProduct) =>
    (p.rating ?? 0) * 2 +
    Math.log10((p.soldCount ?? 0) + 1) +
    (p.stock != null && p.stock > 0 ? 1 : 0);
  return [...products].sort((a, b) => score(b) - score(a));
}

function mapProduct(p: Record<string, unknown>): ChatProduct {
  const cat = p.category as { name?: unknown } | null | undefined;
  const rawSpecs = Array.isArray(p.specifications) ? p.specifications : [];
  const specifications: ChatSpec[] = rawSpecs
    .map((s): ChatSpec | null => {
      const spec = s as { label?: unknown; value?: unknown };
      const label = spec?.label != null ? String(spec.label).trim() : '';
      const value = spec?.value != null ? String(spec.value).trim() : '';
      return label && value ? { label, value } : null;
    })
    .filter((s): s is ChatSpec => s !== null);
  const str = (v: unknown) => (v != null && String(v).trim() !== '' ? String(v) : null);
  return {
    id: String(p.id ?? ''),
    name: String(p.name ?? ''),
    slug: str(p.slug),
    price: Number(p.price ?? 0),
    originalPrice: p.originalPrice != null ? Number(p.originalPrice) : null,
    discount: p.discount != null ? Number(p.discount) : null,
    brand: str(p.brand),
    stock: p.stock != null ? Number(p.stock) : null,
    status: str(p.status),
    shortDescription: str(p.shortDescription),
    description: str(p.description),
    specifications,
    category: cat?.name != null ? String(cat.name) : null,
    rating: p.rating != null ? Number(p.rating) : null,
    reviewCount: p.reviewCount != null ? Number(p.reviewCount) : null,
    soldCount: p.soldCount != null ? Number(p.soldCount) : null,
  };
}

/** Rút gọn mô tả dài về MAX_DESC_LEN ký tự (cắt ở khoảng trắng gần nhất). */
function truncateDesc(desc: string): string {
  if (desc.length <= MAX_DESC_LEN) return desc;
  const cut = desc.slice(0, MAX_DESC_LEN);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > MAX_DESC_LEN * 0.6 ? cut.slice(0, lastSpace) : cut) + '…';
}

/**
 * Render product list as XML. Attribute-only cho field số/ngắn; description + specs
 * đưa vào thẻ con để AI tư vấn chi tiết (cấu hình, tính năng). All user-visible string
 * fields are escapeXml()'d to prevent prompt-injection through product data (T-22-02).
 */
export function buildContextXml(products: ChatProduct[]): string {
  return products
    .map((p) => {
      const attrs = [
        `id="${escapeXml(p.id)}"`,
        `name="${escapeXml(p.name)}"`,
        `slug="${escapeXml(p.slug ?? '')}"`,
        `price="${p.price}"`,
      ];
      if (p.originalPrice != null && p.originalPrice > p.price) {
        attrs.push(`original_price="${p.originalPrice}"`);
      }
      if (p.discount != null && p.discount > 0) {
        attrs.push(`discount_percent="${p.discount}"`);
      }
      attrs.push(
        `brand="${escapeXml(p.brand ?? '')}"`,
        `category="${escapeXml(p.category ?? '')}"`,
        `stock="${p.stock ?? 0}"`,
        `status="${escapeXml(p.status ?? '')}"`,
        `rating="${p.rating ?? 0}"`,
        `review_count="${p.reviewCount ?? 0}"`,
        `sold_count="${p.soldCount ?? 0}"`,
      );

      // Nội dung con: mô tả (ưu tiên mô tả dài) + thông số kỹ thuật.
      const parts: string[] = [];
      const descText = p.description ?? p.shortDescription;
      if (descText) {
        parts.push(`  <description>${escapeXml(truncateDesc(descText))}</description>`);
      }
      if (p.specifications.length > 0) {
        const specLines = p.specifications
          .map((s) => `    <spec label="${escapeXml(s.label)}">${escapeXml(s.value)}</spec>`)
          .join('\n');
        parts.push(`  <specifications>\n${specLines}\n  </specifications>`);
      }

      if (parts.length === 0) {
        return `<product ${attrs.join(' ')}></product>`;
      }
      return `<product ${attrs.join(' ')}>\n${parts.join('\n')}\n</product>`;
    })
    .join('\n');
}
