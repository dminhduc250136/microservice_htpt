/**
 * Helper upload file chung — multipart/form-data với access token đính kèm.
 *
 * Backend (mọi service) trả ApiResponse envelope dạng:
 *   { status, message, data: { url: "/api/.../uploads/<subdir>/<file>" } }
 * Helper unwrap envelope, return string URL để FE gán vào field (thumbnailUrl, avatarUrl, …).
 *
 * Why common: trước đây mỗi service tự viết FormData + fetch + read token. Tách ra để
 * các nơi khác (avatar, banner, review image) reuse, đồng thời chỉnh policy
 * (auth header, error shape) một chỗ.
 */
import { getAccessToken } from './token';

export interface UploadResult {
  url: string;
}

/**
 * POST multipart/form-data lên endpoint, field name mặc định "file".
 * @param endpoint relative path (vd. "/api/products/admin/upload")
 * @param file file blob từ <input type="file">
 * @param fieldName tên field multipart (default "file")
 */
export async function uploadImage(
  endpoint: string,
  file: File,
  fieldName: string = 'file',
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  const token = getAccessToken();
  const form = new FormData();
  form.append(fieldName, file);

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`);
  }
  const env = await res.json();
  return String(env?.data?.url ?? '');
}
