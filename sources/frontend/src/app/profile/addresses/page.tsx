'use client';

import React, { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';
import Button from '@/components/ui/Button/Button';
import Modal from '@/components/ui/Modal/Modal';
import RetrySection from '@/components/ui/RetrySection/RetrySection';
import AddressCard from '@/components/ui/AddressCard/AddressCard';
import AddressForm from '@/components/ui/AddressForm/AddressForm';
import { useToast } from '@/components/ui/Toast/Toast';
import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '@/services/users';
import { isApiError } from '@/services/errors';
import type { SavedAddress, AddressBody } from '@/types';

export default function AddressesPage() {
  const { showToast } = useToast();

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<SavedAddress | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedAddress | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const data = await listAddresses();
      setAddresses(data);
    } catch {
      setFailed(true);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  async function handleCreate(data: AddressBody) {
    setSubmitting(true);
    try {
      await createAddress(data);
      showToast('Đã thêm địa chỉ', 'success');
      setShowCreateModal(false);
      await loadAddresses();
    } catch (err) {
      if (isApiError(err) && err.code === 'ADDRESS_LIMIT_EXCEEDED') {
        showToast('Đã đạt giới hạn 10 địa chỉ. Vui lòng xóa bớt trước khi thêm mới.', 'error');
      } else {
        showToast('Đã xảy ra lỗi. Vui lòng thử lại.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(data: AddressBody) {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await updateAddress(editTarget.id, data);
      showToast('Đã cập nhật địa chỉ', 'success');
      setEditTarget(null);
      await loadAddresses();
    } catch {
      showToast('Đã xảy ra lỗi. Vui lòng thử lại.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteAddress(deleteTarget.id);
      showToast('Đã xóa địa chỉ', 'success');
      setDeleteTarget(null);
      await loadAddresses();
    } catch {
      showToast('Đã xảy ra lỗi. Vui lòng thử lại.', 'error');
    }
  }

  async function handleSetDefault(address: SavedAddress) {
    setSettingDefaultId(address.id);
    try {
      await setDefaultAddress(address.id);
      showToast('Đã đặt làm địa chỉ mặc định', 'success');
      await loadAddresses();
    } catch {
      showToast('Đã xảy ra lỗi. Vui lòng thử lại.', 'error');
    } finally {
      setSettingDefaultId(null);
    }
  }

  const isAtLimit = addresses.length >= 10;

  return (
    <>
      <div className={styles.section}>
        <div className={styles.headerRow}>
          <h2 className={styles.sectionTitle}>Địa chỉ của tôi</h2>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            disabled={isAtLimit}
            title={isAtLimit ? 'Đã đạt giới hạn 10 địa chỉ' : undefined}
          >
            + Thêm địa chỉ mới
          </Button>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />
        ) : failed ? (
          <RetrySection onRetry={loadAddresses} loading={loading} />
        ) : addresses.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyBody}>
              <h3>Chưa có địa chỉ nào</h3>
              <p>Thêm địa chỉ giao hàng để thanh toán nhanh hơn.</p>
            </div>
            <div className={styles.emptyActions}>
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                Thêm địa chỉ đầu tiên
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.addressList}>
            {addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                onEdit={(a) => setEditTarget(a)}
                onDelete={(a) => setDeleteTarget(a)}
                onSetDefault={handleSetDefault}
                settingDefault={settingDefaultId === address.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Address — dùng custom overlay vì AddressForm tự có submit button */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Thêm địa chỉ</h3>
              <button
                className={styles.modalClose}
                aria-label="Đóng"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            <AddressForm
              onSubmit={handleCreate}
              onCancel={() => setShowCreateModal(false)}
              loading={submitting}
            />
          </div>
        </div>
      )}

      {/* Modal: Edit Address */}
      {editTarget && (
        <div className={styles.modalOverlay} onClick={() => setEditTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Sửa địa chỉ</h3>
              <button
                className={styles.modalClose}
                aria-label="Đóng"
                onClick={() => setEditTarget(null)}
              >
                ✕
              </button>
            </div>
            <AddressForm
              initialValues={editTarget}
              onSubmit={handleEdit}
              onCancel={() => setEditTarget(null)}
              loading={submitting}
            />
          </div>
        </div>
      )}

      {/* Modal: Delete Confirm — dùng Modal component vì không có form */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Xác nhận xóa địa chỉ?"
        primaryAction={{
          label: 'Xóa địa chỉ',
          variant: 'danger',
          onClick: handleDelete,
        }}
        secondaryAction={{
          label: 'Hủy',
          onClick: () => setDeleteTarget(null),
        }}
      >
        {deleteTarget && (
          <>
            <p>
              Bạn có chắc muốn xóa địa chỉ{' '}
              <strong>{deleteTarget.fullName}</strong> —{' '}
              {deleteTarget.street}, {deleteTarget.ward}, {deleteTarget.district},{' '}
              {deleteTarget.city}?
            </p>
            <p
              style={{
                marginTop: 'var(--space-2)',
                color: 'var(--on-surface-variant)',
                fontSize: 'var(--text-body-sm)',
              }}
            >
              Hành động này không thể hoàn tác.
            </p>
          </>
        )}
      </Modal>
    </>
  );
}
