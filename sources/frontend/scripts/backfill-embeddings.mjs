#!/usr/bin/env node
/**
 * Backfill embedding cho TẤT CẢ sản phẩm (vector search RAG — Đợt 1 AI).
 *
 * Quy trình:
 *   1. Đăng nhập admin → lấy accessToken (gateway enforce admin path).
 *   2. GET /api/products?size=500 → toàn bộ SP.
 *   3. Với mỗi SP: dựng text (name + mô tả + flatten specs) → embed (Gemini
 *      text-embedding-004, taskType RETRIEVAL_DOCUMENT, 768d).
 *   4. PATCH /api/products/admin/{id}/embedding { embedding }.
 *   5. Log tiến độ, rate-limit nhẹ. Chạy lại được (idempotent — ghi đè embedding).
 *
 * Chạy (từ thư mục sources/frontend):
 *   GEMINI_API_KEY=xxx \
 *   API_BASE=https://n24shop.io.vn \
 *   ADMIN_EMAIL=admin@... ADMIN_PASSWORD=... \
 *   node scripts/backfill-embeddings.mjs
 *
 * API_BASE mặc định http://localhost:8080 (gateway local). Với VM truyền domain.
 */
import { GoogleGenAI } from '@google/genai';

const API_BASE = process.env.API_BASE ?? 'http://localhost:8080';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// gemini-embedding-001: text-embedding-004 đã bị gỡ khỏi v1beta (404). Model này
// mặc định 3072 chiều → ép 768 qua outputDimensionality + tự L2-normalize (model
// KHÔNG normalize khi dim < 3072) để khớp cột vector(768) + cosine chuẩn.
const EMBED_MODEL = 'gemini-embedding-001';
const EMBED_DIM = 768;
const PAGE_SIZE = 100; // backend cap size=100 → phải phân trang để lấy hết SP
const SLEEP_MS = 120; // giãn nhẹ giữa các request (Gemini free 1500/ngày)
const MAX_TEXT_LEN = 2000; // cắt bớt mô tả quá dài trước khi embed

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}
if (!GEMINI_API_KEY) die('Thiếu GEMINI_API_KEY');
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) die('Thiếu ADMIN_EMAIL / ADMIN_PASSWORD');

const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Đăng nhập admin → accessToken. */
async function login() {
  const res = await fetch(`${API_BASE}/api/users/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) die(`Login thất bại: HTTP ${res.status} ${await res.text()}`);
  const data = await res.json();
  const token = data?.accessToken ?? data?.data?.accessToken;
  if (!token) die('Login OK nhưng không thấy accessToken trong response');
  return token;
}

/** Lấy TOÀN BỘ SP — phân trang vì backend cap size=100. */
async function fetchAllProducts() {
  const all = [];
  for (let page = 0; ; page++) {
    const res = await fetch(`${API_BASE}/api/products?size=${PAGE_SIZE}&page=${page}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) die(`GET products thất bại: HTTP ${res.status}`);
    const env = await res.json();
    const data = env?.data ?? {};
    const content = data.content ?? [];
    all.push(...content);
    if (data.isLast === true || content.length === 0 || page > 50) break;
  }
  return all;
}

/** Dựng text embed từ 1 SP: tên + mô tả + thông số (giống ngữ cảnh user hỏi). */
function buildText(p) {
  const parts = [p.name, p.brand, p.shortDescription, p.description].filter(Boolean);
  const specs = Array.isArray(p.specifications) ? p.specifications : [];
  for (const s of specs) {
    if (s?.label && s?.value) parts.push(`${s.label}: ${s.value}`);
  }
  const cat = p.category?.name;
  if (cat) parts.push(cat);
  return parts.join('. ').slice(0, MAX_TEXT_LEN);
}

/** Chuẩn hóa L2 (unit vector) — khớp với query embed ở gemini-embed.ts. */
function l2Normalize(v) {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum);
  return norm > 0 ? v.map((x) => x / norm) : v;
}

/** Embed 1 text → vector 768d đã L2-normalize (taskType RETRIEVAL_DOCUMENT — đối xứng query). */
async function embed(text) {
  const res = await genai.models.embedContent({
    model: EMBED_MODEL,
    contents: text,
    config: { taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: EMBED_DIM },
  });
  const values = res.embeddings?.[0]?.values;
  if (!Array.isArray(values) || values.length !== EMBED_DIM) {
    throw new Error(`embedding sai số chiều: ${values?.length}`);
  }
  return l2Normalize(values);
}

/** PATCH embedding lên DB qua endpoint admin. */
async function patchEmbedding(token, id, embedding) {
  const res = await fetch(`${API_BASE}/api/products/admin/${id}/embedding`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ embedding }),
  });
  if (!res.ok) throw new Error(`PATCH ${id}: HTTP ${res.status} ${await res.text()}`);
}

async function main() {
  console.log(`→ API_BASE=${API_BASE}`);
  const token = await login();
  console.log('✓ Đăng nhập admin OK');

  const products = await fetchAllProducts();
  console.log(`✓ Lấy ${products.length} sản phẩm`);

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const label = `[${i + 1}/${products.length}] ${p.id} ${p.name ?? ''}`.slice(0, 80);
    try {
      const text = buildText(p);
      if (!text.trim()) {
        console.log(`- ${label} — bỏ qua (rỗng)`);
        continue;
      }
      const vec = await embed(text);
      await patchEmbedding(token, p.id, vec);
      ok++;
      console.log(`✓ ${label}`);
    } catch (e) {
      fail++;
      console.error(`✗ ${label} — ${e.message}`);
    }
    await sleep(SLEEP_MS);
  }

  console.log(`\n=== Xong: ${ok} OK, ${fail} lỗi / ${products.length} SP ===`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => die(e.stack ?? String(e)));
