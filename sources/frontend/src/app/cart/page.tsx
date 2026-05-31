'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { isInternalUploadUrl } from '@/lib/imageHelpers';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Button from '@/components/ui/Button/Button';
import QuantityStepper from '@/components/ui/QuantityStepper/QuantityStepper';
import { useToast } from '@/components/ui/Toast/Toast';
import {
  useCart,
  useUpdateCartItem,
  useRemoveCartItem,
  parseCartError,
} from '@/hooks/useCart';
import { formatPrice } from '@/services/api';

export default function CartPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const { data: cartItems = [], isLoading } = useCart();
  const updateMutation = useUpdateCartItem();
  const removeMutation = useRemoveCartItem();

  const hydrated = !isLoading;

  // Tập productId các mục được tích chọn để thanh toán.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Đánh dấu đã khởi tạo selection lần đầu (tránh chọn lại mỗi lần cart refetch).
  const [initialized, setInitialized] = useState(false);

  // Lần đầu giỏ hàng load xong → chọn sẵn tất cả.
  // Các lần cart đổi sau đó → chỉ loại bỏ mục đã bị xóa khỏi giỏ, giữ nguyên
  // lựa chọn của user (không tự ý tích lại).
  useEffect(() => {
    if (cartItems.length === 0) return;
    if (!initialized) {
      setSelectedIds(new Set(cartItems.map((i) => i.productId)));
      setInitialized(true);
      return;
    }
    setSelectedIds((prev) => {
      const cartIds = new Set(cartItems.map((i) => i.productId));
      const next = new Set<string>();
      for (const id of prev) {
        if (cartIds.has(id)) next.add(id);
      }
      return next;
    });
  }, [cartItems, initialized]);

  const allSelected = cartItems.length > 0 && selectedIds.size === cartItems.length;

  const toggleOne = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(cartItems.map((i) => i.productId)));
  };

  // === Optimistic + debounce số lượng (BUG-FIX: cart +/- call API mỗi lần bấm) ===
  // optimisticQty: overlay số lượng hiển thị ngay khi user chỉnh, trước khi server
  // xác nhận. Key = productId. Xóa key sau khi server đồng bộ xong (cartItems đổi).
  const [optimisticQty, setOptimisticQty] = useState<Record<string, number>>({});
  // Timer debounce theo từng productId — gom nhiều lần bấm liên tiếp thành 1 API call.
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Qty đang chờ gửi (chưa hết debounce) theo productId — để flush trước khi checkout.
  const pendingQty = useRef<Record<string, number>>({});
  const DEBOUNCE_MS = 600;

  // Số lượng hiển thị: ưu tiên optimistic, fallback giá trị server.
  const displayQty = useCallback(
    (item: { productId: string; quantity: number }) =>
      optimisticQty[item.productId] ?? item.quantity,
    [optimisticQty],
  );

  // Dọn timer khi unmount (tránh setTimeout chạy sau khi component đã rời).
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  // Xóa optimistic key cho productId (sau khi server đã đồng bộ hoặc cần rollback).
  const clearOptimistic = useCallback((productId: string) => {
    setOptimisticQty((prev) => {
      if (!(productId in prev)) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  // Gửi update lên server cho 1 productId (dùng chung cho debounce timer và flush).
  const commitQty = useCallback(
    (productId: string, qty: number) => {
      delete pendingQty.current[productId];
      updateMutation.mutate(
        { productId, qty },
        {
          // Server đã xác nhận + React Query invalidate ['cart'] → bỏ overlay optimistic,
          // UI đọc lại từ cartItems server (nguồn sự thật).
          onSuccess: () => clearOptimistic(productId),
          onError: (err) => {
            // Rollback optimistic về giá trị server, báo lỗi (vd STOCK_SHORTAGE
            // nếu stock đổi giữa chừng).
            clearOptimistic(productId);
            const ctx = parseCartError(err);
            showToast(ctx.message, 'error');
          },
        },
      );
    },
    [updateMutation, clearOptimistic, showToast],
  );

  const handleQuantityChange = (productId: string, qty: number) => {
    // 1. Cập nhật optimistic ngay → UI phản hồi tức thì.
    setOptimisticQty((prev) => ({ ...prev, [productId]: qty }));
    pendingQty.current[productId] = qty;

    // 2. Debounce API call theo productId — gom nhiều lần bấm thành 1 call cuối.
    if (debounceTimers.current[productId]) {
      clearTimeout(debounceTimers.current[productId]);
    }
    debounceTimers.current[productId] = setTimeout(() => {
      delete debounceTimers.current[productId];
      commitQty(productId, qty);
    }, DEBOUNCE_MS);
  };

  // Flush mọi update đang chờ debounce (gọi trước khi rời trang / checkout) để server
  // nhận qty mới nhất, tránh checkout với số lượng cũ.
  const flushPendingQty = useCallback(() => {
    for (const [productId, timer] of Object.entries(debounceTimers.current)) {
      clearTimeout(timer);
      delete debounceTimers.current[productId];
      const qty = pendingQty.current[productId];
      if (qty !== undefined) commitQty(productId, qty);
    }
  }, [commitQty]);

  const handleRemove = (productId: string) => {
    removeMutation.mutate(productId, {
      onError: (err) => {
        const ctx = parseCartError(err);
        showToast(ctx.message, 'error');
      },
    });
  };

  // Chỉ tính tiền trên các mục được chọn.
  const selectedItems = useMemo(
    () => cartItems.filter((i) => selectedIds.has(i.productId)),
    [cartItems, selectedIds]
  );
  // Đếm số sản phẩm KHÁC BIỆT (số dòng đã chọn), không cộng dồn số lượng từng mục.
  const selectedCount = selectedItems.length;
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price * displayQty(item), 0);
  const shippingFee = subtotal >= 1000000 ? 0 : 30000;
  const total = subtotal + shippingFee;

  // Đi tới checkout với danh sách mục đã chọn truyền qua query param.
  const goToCheckout = () => {
    if (selectedItems.length === 0) {
      showToast('Vui lòng chọn ít nhất một sản phẩm để thanh toán', 'error');
      return;
    }
    // Flush các thay đổi số lượng đang chờ debounce → server có qty mới nhất trước
    // khi checkout đọc lại giỏ hàng (tránh thanh toán theo số lượng cũ).
    flushPendingQty();
    const ids = selectedItems.map((i) => i.productId).join(',');
    router.push(`/checkout?items=${encodeURIComponent(ids)}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>Giỏ hàng</h1>
          <p className={styles.pageSubtitle}>
            {hydrated ? `${cartItems.length} sản phẩm trong giỏ hàng` : 'Đang tải...'}
          </p>
        </div>
      </div>

      <div className={`${styles.container} ${styles.content}`}>
        {hydrated && cartItems.length === 0 ? (
          <div className={styles.emptyCart}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--outline-variant)" strokeWidth="1">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <h2>Giỏ hàng trống</h2>
            <p>Bạn chưa có sản phẩm nào trong giỏ hàng</p>
            <Button href="/products" size="lg">Tiếp tục mua sắm</Button>
          </div>
        ) : (
          <div className={styles.layout}>
            {/* Cart Items */}
            <div className={styles.cartItems}>
              {/* Thanh chọn tất cả */}
              {cartItems.length > 0 && (
                <label className={styles.selectAllBar}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Chọn tất cả sản phẩm"
                  />
                  <span>Chọn tất cả ({cartItems.length})</span>
                </label>
              )}

              {cartItems.map((item) => {
                const qty = displayQty(item);
                // stock=0 on legacy items (added before this fix) — treat as uncapped
                const atStockLimit = item.stock > 0 && qty >= item.stock;
                const checked = selectedIds.has(item.productId);
                return (
                  <div
                    key={item.productId}
                    className={`${styles.cartItem} ${checked ? styles.cartItemSelected : ''}`}
                  >
                    {/* Checkbox chọn mục */}
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={checked}
                      onChange={() => toggleOne(item.productId)}
                      aria-label={`Chọn ${item.name}`}
                    />

                    <Link href={`/products/${item.productId}`} className={styles.itemImage}>
                      <Image
                        src={item.thumbnailUrl?.trim() ? item.thumbnailUrl : '/placeholder.png'}
                        alt={item.name}
                        fill
                        sizes="120px"
                        className={styles.itemImg}
                        unoptimized={isInternalUploadUrl(item.thumbnailUrl)}
                      />
                    </Link>

                    <div className={styles.itemInfo}>
                      <div className={styles.itemTop}>
                        <div>
                          <Link href={`/products/${item.productId}`} className={styles.itemName}>
                            {item.name}
                          </Link>
                          {/* Stock warning shown when quantity is capped */}
                          {atStockLimit && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: 2 }}>
                              Đã đạt giới hạn tồn kho ({item.stock} sản phẩm)
                            </p>
                          )}
                        </div>
                        <button
                          className={styles.removeBtn}
                          onClick={() => handleRemove(item.productId)}
                          disabled={removeMutation.isPending}
                          aria-label="Xóa sản phẩm"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>

                      <div className={styles.itemBottom}>
                        <QuantityStepper
                          value={qty}
                          onChange={(next) => handleQuantityChange(item.productId, next)}
                          max={item.stock > 0 ? item.stock : undefined}
                          size="sm"
                          ariaLabel={`Số lượng ${item.name}`}
                          onClamp={(clampedTo, reason) => {
                            if (reason === 'max') {
                              showToast(`Chỉ còn ${clampedTo} sản phẩm`, 'error');
                            }
                          }}
                        />
                        <div className={styles.itemPrice}>
                          <span className={styles.priceTotal}>{formatPrice(item.price * qty)}</span>
                          {qty > 1 && (
                            <span className={styles.priceUnit}>{formatPrice(item.price)} / sản phẩm</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <aside className={styles.summary}>
              <h3 className={styles.summaryTitle}>Tóm tắt đơn hàng</h3>

              <div className={styles.summaryRows}>
                <div className={styles.summaryRow}>
                  <span>Đã chọn</span>
                  <span>{selectedItems.length} / {cartItems.length} sản phẩm</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Tạm tính ({selectedCount} loại SP)</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Phí vận chuyển</span>
                  <span className={shippingFee === 0 ? styles.freeShip : ''}>
                    {shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}
                  </span>
                </div>
                {subtotal > 0 && shippingFee > 0 && (
                  <p className={styles.shippingNote}>
                    Miễn phí vận chuyển cho đơn từ {formatPrice(1000000)}
                  </p>
                )}
              </div>

              <div className={styles.totalRow}>
                <span>Tổng cộng</span>
                <span className={styles.totalPrice}>{formatPrice(total)}</span>
              </div>

              <Button
                size="lg"
                fullWidth
                onClick={goToCheckout}
                disabled={selectedItems.length === 0}
              >
                Thanh toán ({selectedItems.length})
              </Button>
              <Link href="/products" className={styles.continueLink}>
                ← Tiếp tục mua sắm
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
