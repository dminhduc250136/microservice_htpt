'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import Badge from '@/components/ui/Badge/Badge';
import RetrySection from '@/components/ui/RetrySection/RetrySection';
import { useToast } from '@/components/ui/Toast/Toast';
import Pagination from '@/components/ui/Pagination/Pagination';
import PageSizeSelect from '@/components/ui/Pagination/PageSizeSelect';
import type { PageSize } from '@/hooks/useClientPagination';
import { useUrlState } from '@/hooks/useUrlState';
import type { Category } from '@/types';
import {
  listAdminProducts, createProduct, updateProduct, deleteProduct, listAdminCategories,
  uploadProductImage,
  type ProductUpsertBody,
} from '@/services/products';

// Backend AdminProductDto shape (fields returned from /api/products/admin)
// Backend trả category dạng object {id, name, slug} (CategoryRef) — KHÔNG phải categoryId phẳng.
// Giữ categoryId optional để tương thích nếu API tương lai đổi shape.
interface AdminProduct {
  id: string;
  name: string;
  slug?: string;
  categoryId?: string;
  category?: { id: string; name?: string; slug?: string };
  price?: number;
  originalPrice?: number;
  status?: string;
  stock?: number;
  brand?: string;
  thumbnailUrl?: string;
  shortDescription?: string;
  description?: string;
  specifications?: { label: string; value: string }[] | string;
  createdAt?: string;
  updatedAt?: string;
}

interface SpecRow { label: string; value: string }

const emptyForm: ProductUpsertBody = {
  name: '',
  slug: '',
  categoryId: '',
  price: 0,
  status: 'ACTIVE',
  stock: 0,
  brand: '',
  thumbnailUrl: '',
  shortDescription: '',
  description: '',
  specifications: '',
  originalPrice: undefined,
};

function AdminProductsPageContent() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  // URL = source of truth cho page/size/q/categoryId/status — F5/back/share đều giữ view.
  const { get, getNum, patch } = useUrlState();
  const page = getNum('page', 0, { min: 0 });
  const pageSizeRaw = get('size');
  const pageSize: PageSize = pageSizeRaw === 'all'
    ? 'all'
    : ([10, 25, 50] as const).includes(Number(pageSizeRaw) as 10 | 25 | 50)
      ? (Number(pageSizeRaw) as PageSize)
      : 10;
  const size = pageSize === 'all' ? 1000 : pageSize;
  const search = get('q') ?? '';
  const setPage = (p: number) => patch({ page: p });
  const setPageSize = (s: PageSize) => patch({ size: s, page: 0 });
  const setSearch = (v: string) => patch({ q: v, page: 0 });
  const [meta, setMeta] = useState<{ totalElements: number; totalPages: number } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [formData, setFormData] = useState<ProductUpsertBody>(emptyForm);
  const [specRows, setSpecRows] = useState<SpecRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  const parseSpecs = (raw: unknown): SpecRow[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw
        .filter(r => r && typeof r === 'object')
        .map(r => ({ label: String((r as SpecRow).label ?? ''), value: String((r as SpecRow).value ?? '') }));
    }
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
          ? parsed.map(r => ({ label: String(r?.label ?? ''), value: String(r?.value ?? '') }))
          : [];
      } catch { return []; }
    }
    return [];
  };

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const resp = await listAdminProducts({ page, size, keyword: search || undefined });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setProducts((resp?.content ?? []) as any[]);
      setMeta({ totalElements: resp?.totalElements ?? 0, totalPages: resp?.totalPages ?? 0 });
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [page, size, search]);

  useEffect(() => { load(); }, [load]);

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const resp = await listAdminCategories();
      setCategories(resp?.content ?? []);
    } catch {
      // silent fail — hiển thị option "Không thể tải danh mục"
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const openAddModal = () => {
    setFormData(emptyForm);
    setSpecRows([]);
    setEditTarget(null);
    setShowAddModal(true);
    loadCategories();
  };

  const openEditModal = (product: AdminProduct) => {
    setFormData({
      name: product.name ?? '',
      slug: product.slug ?? '',
      categoryId: product.category?.id ?? product.categoryId ?? '',
      price: product.price ?? 0,
      status: product.status ?? 'ACTIVE',
      stock: product.stock ?? 0,
      brand: product.brand ?? '',
      thumbnailUrl: product.thumbnailUrl ?? '',
      shortDescription: product.shortDescription ?? '',
      description: product.description ?? '',
      specifications: typeof product.specifications === 'string' ? product.specifications : '',
      originalPrice: product.originalPrice ?? undefined,
    });
    setSpecRows(parseSpecs(product.specifications));
    setEditTarget(product);
    setShowAddModal(true);
    loadCategories();
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditTarget(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setFormData(p => ({ ...p, thumbnailUrl: url }));
      showToast('Tải ảnh thành công', 'success');
    } catch {
      showToast('Tải ảnh thất bại', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const updateSpecRow = (i: number, field: 'label' | 'value', v: string) => {
    setSpecRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: v } : r));
  };
  const addSpecRow = () => setSpecRows(rows => [...rows, { label: '', value: '' }]);
  const removeSpecRow = (i: number) => setSpecRows(rows => rows.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { showToast('Vui lòng nhập tên sản phẩm', 'error'); return; }
    if (!formData.price || formData.price <= 0) { showToast('Vui lòng nhập giá bán', 'error'); return; }
    if (!formData.categoryId) { showToast('Vui lòng chọn danh mục', 'error'); return; }

    setSaving(true);
    try {
      const cleanRows = specRows.filter(r => r.label.trim() || r.value.trim());
      const body: ProductUpsertBody = {
        ...formData,
        slug: formData.slug?.trim() || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        brand: formData.brand || undefined,
        thumbnailUrl: formData.thumbnailUrl || undefined,
        shortDescription: formData.shortDescription || undefined,
        description: formData.description || undefined,
        specifications: cleanRows.length ? JSON.stringify(cleanRows) : undefined,
        originalPrice: formData.originalPrice || undefined,
      };
      if (editTarget) {
        await updateProduct(editTarget.id, body);
        showToast('Sản phẩm đã được cập nhật', 'success');
      } else {
        await createProduct(body);
        showToast('Sản phẩm đã được thêm thành công', 'success');
      }
      closeModal();
      await load();
    } catch {
      showToast(
        editTarget
          ? 'Không thể cập nhật sản phẩm. Vui lòng thử lại'
          : 'Không thể thêm sản phẩm. Vui lòng thử lại',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget);
      showToast('Sản phẩm đã được xóa', 'success');
      setDeleteTarget(null);
      await load();
    } catch {
      showToast('Không thể xóa sản phẩm. Vui lòng thử lại', 'error');
    }
  };

  // Server-side pagination: search → keyword param gửi BE, BE trả đúng trang.
  const pageItems: AdminProduct[] = products;
  const totalPages = meta?.totalPages ?? 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý sản phẩm</h1>
        <Button onClick={openAddModal}>+ Thêm sản phẩm</Button>
      </div>

      <div className={styles.toolbar}>
        <Input
          placeholder="Tìm sản phẩm..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          }
        />
        <span className={styles.count}>{meta?.totalElements ?? 0} sản phẩm</span>
        <PageSizeSelect value={pageSize} onChange={setPageSize} />
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Danh mục</th>
              <th>Giá</th>
              <th>Tồn kho</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && [...Array(5)].map((_, i) => (
              <tr key={i}>
                <td colSpan={6}>
                  <div className="skeleton" style={{ height: 60, borderRadius: 'var(--radius-md)' }} />
                </td>
              </tr>
            ))}

            {!loading && failed && (
              <tr>
                <td colSpan={6}>
                  <RetrySection onRetry={load} loading={loading} />
                </td>
              </tr>
            )}

            {!loading && !failed && products.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-7) 0' }}>
                    <h3 style={{ fontSize: 'var(--text-title-lg)', color: 'var(--on-surface)' }}>Chưa có sản phẩm nào</h3>
                    <p style={{ fontSize: 'var(--text-body-md)', color: 'var(--on-surface-variant)' }}>Thêm sản phẩm đầu tiên bằng nút &quot;+ Thêm sản phẩm&quot; ở trên</p>
                  </div>
                </td>
              </tr>
            )}

            {!loading && !failed && pageItems.map(p => (
              <tr key={p.id}>
                <td>
                  <div className={styles.productCell}>
                    {p.thumbnailUrl && (
                      <div className={styles.productThumb}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.thumbnailUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div>
                      <p className={styles.productName}>{p.name}</p>
                      {p.brand && <p className={styles.productBrand}>{p.brand}</p>}
                    </div>
                  </div>
                </td>
                <td>{p.category?.name ?? p.categoryId ?? '—'}</td>
                <td className={styles.price}>{p.price?.toLocaleString('vi-VN')}₫</td>
                <td>
                  <span className={(p.stock ?? 0) < 10 ? styles.lowStock : ''}>{p.stock ?? 0}</span>
                </td>
                <td>
                  <Badge variant={p.status === 'ACTIVE' ? 'new' : p.status === 'OUT_OF_STOCK' ? 'out-of-stock' : 'default'}>
                    {p.status === 'ACTIVE' ? 'Đang bán' : p.status === 'OUT_OF_STOCK' ? 'Hết hàng' : 'Ẩn'}
                  </Badge>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.actionBtn} aria-label="Chỉnh sửa sản phẩm" onClick={() => openEditModal(p)}>✏️</button>
                    <button className={`${styles.actionBtn} ${styles.deleteBtn}`} aria-label="Xóa sản phẩm" onClick={() => setDeleteTarget(p.id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && !failed && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} alwaysShow />}

      {/* Modal: Add / Edit Product */}
      {showAddModal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editTarget ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
              <button className={styles.closeBtn} onClick={closeModal}>✕</button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              <Input
                label="Tên sản phẩm"
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                fullWidth
                required
              />
              <div className={styles.formRow}>
                <Input
                  label="Giá bán"
                  type="number"
                  value={String(formData.price)}
                  onChange={e => setFormData(p => ({ ...p, price: Number(e.target.value) }))}
                  placeholder="0"
                  fullWidth
                />
                <Input
                  label="Giá gốc"
                  type="number"
                  value={String(formData.originalPrice ?? '')}
                  onChange={e => setFormData(p => ({ ...p, originalPrice: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="0"
                  fullWidth
                />
              </div>
              <Input
                label="Mô tả ngắn"
                value={formData.shortDescription ?? ''}
                onChange={e => setFormData(p => ({ ...p, shortDescription: e.target.value }))}
                fullWidth
              />
              <div className={styles.formRow}>
                <div>
                  <label style={{ fontSize: 'var(--text-body-md)', marginBottom: 'var(--space-2)', display: 'block' }}>Danh mục</label>
                  <select
                    value={formData.categoryId}
                    onChange={e => setFormData(p => ({ ...p, categoryId: e.target.value }))}
                    style={{ width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1.5px solid rgba(195,198,214,0.2)', fontSize: 'var(--text-body-md)', fontFamily: 'var(--font-family-body)', background: 'var(--surface-container-lowest)', cursor: 'pointer' }}
                  >
                    {loadingCategories
                      ? <option disabled value="">Đang tải danh mục...</option>
                      : categories.length === 0
                        ? <option disabled value="">Không thể tải danh mục — thử lại</option>
                        : (
                          <>
                            <option value="">-- Chọn danh mục --</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </>
                        )
                    }
                  </select>
                </div>
                <Input
                  label="Thương hiệu"
                  value={formData.brand ?? ''}
                  onChange={e => setFormData(p => ({ ...p, brand: e.target.value }))}
                  fullWidth
                />
              </div>
              <div className={styles.formRow}>
                <Input
                  label="Tồn kho"
                  type="number"
                  value={String(formData.stock ?? 0)}
                  onChange={e => setFormData(p => ({ ...p, stock: Number(e.target.value) }))}
                  placeholder="0"
                  fullWidth
                />
                <Input
                  label="URL hình ảnh"
                  value={formData.thumbnailUrl ?? ''}
                  onChange={e => setFormData(p => ({ ...p, thumbnailUrl: e.target.value }))}
                  placeholder="https://... hoặc /uploads/..."
                  fullWidth
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-body-md)', marginBottom: 'var(--space-2)', display: 'block' }}>
                  Tải ảnh lên (thay thế URL nếu chọn file)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {uploading && <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--text-body-sm)' }}>Đang tải...</span>}
                {formData.thumbnailUrl && (
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={formData.thumbnailUrl} alt="preview" style={{ maxWidth: 120, maxHeight: 120, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-body-md)', marginBottom: 'var(--space-2)', display: 'block' }}>
                  Mô tả dài (hiển thị tab &quot;Mô tả&quot; trên trang chi tiết)
                </label>
                <textarea
                  value={formData.description ?? ''}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  rows={4}
                  style={{ width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1.5px solid rgba(195,198,214,0.2)', fontSize: 'var(--text-body-md)', fontFamily: 'var(--font-family-body)', background: 'var(--surface-container-lowest)', resize: 'vertical' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <label style={{ fontSize: 'var(--text-body-md)' }}>Thông số kỹ thuật</label>
                  <Button variant="secondary" type="button" onClick={addSpecRow}>+ Thêm dòng</Button>
                </div>
                {specRows.length === 0 && (
                  <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--on-surface-variant)' }}>Chưa có thông số nào.</p>
                )}
                {specRows.map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    <Input
                      placeholder="Nhãn (vd: CPU)"
                      value={row.label}
                      onChange={e => updateSpecRow(i, 'label', e.target.value)}
                      fullWidth
                    />
                    <Input
                      placeholder="Giá trị (vd: Intel Core i7)"
                      value={row.value}
                      onChange={e => updateSpecRow(i, 'value', e.target.value)}
                      fullWidth
                    />
                    <button type="button" onClick={() => removeSpecRow(i)} className={styles.actionBtn} aria-label="Xóa dòng">🗑️</button>
                  </div>
                ))}
              </div>

              <div className={styles.modalActions}>
                <Button variant="secondary" type="button" onClick={closeModal}>Hủy</Button>
                <Button type="submit" loading={saving}>{editTarget ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Popup: Confirm Delete */}
      {deleteTarget && (
        <div className={styles.overlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h3 className={styles.confirmTitle}>Xác nhận xóa</h3>
            <p className={styles.confirmDesc}>Bạn có chắc chắn muốn xóa sản phẩm này? Hành động này không thể hoàn tác.</p>
            <div className={styles.confirmActions}>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleDelete}>Xóa sản phẩm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 'var(--space-6)' }}>Đang tải...</div>}>
      <AdminProductsPageContent />
    </Suspense>
  );
}
