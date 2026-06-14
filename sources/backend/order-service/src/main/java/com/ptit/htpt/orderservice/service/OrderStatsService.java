package com.ptit.htpt.orderservice.service;

import com.ptit.htpt.orderservice.repository.OrderRepository;
import java.math.BigDecimal;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Phase 9 / Plan 09-02 (UI-02): Admin stats service cho order-service.
 * Cung cấp số liệu thật cho admin dashboard KPI cards.
 *
 * <p>Nâng cấp: hỗ trợ lọc theo khoảng thời gian [from, to] (nullable = toàn bộ) +
 * thêm doanh thu/AOV để dashboard quan sát doanh số rõ hơn.
 */
@Service
public class OrderStatsService {

  private final OrderRepository orderRepo;

  public OrderStatsService(OrderRepository orderRepo) {
    this.orderRepo = orderRepo;
  }

  @Transactional(readOnly = true)
  public long totalOrders() {
    return orderRepo.count();
  }

  /**
   * D-06: pending = status = "PENDING" ONLY (không gộp SHIPPING/PAID).
   */
  @Transactional(readOnly = true)
  public long pendingOrders() {
    return orderRepo.countByStatus("PENDING");
  }

  /** Số đơn tạo trong [from, to] (null = toàn bộ). */
  @Transactional(readOnly = true)
  public long totalOrders(Instant from, Instant to) {
    return orderRepo.countInRange(from, to);
  }

  /** Đơn PENDING tạo trong [from, to]. */
  @Transactional(readOnly = true)
  public long pendingOrders(Instant from, Instant to) {
    return orderRepo.countByStatusInRange("PENDING", from, to);
  }

  /** Tổng doanh thu (DELIVERED) trong [from, to]. */
  @Transactional(readOnly = true)
  public BigDecimal revenue(Instant from, Instant to) {
    BigDecimal r = orderRepo.revenueInRange(from, to);
    return r != null ? r : BigDecimal.ZERO;
  }

  /** Giá trị đơn trung bình (AOV) = doanh thu / số đơn DELIVERED trong [from, to]. */
  @Transactional(readOnly = true)
  public BigDecimal averageOrderValue(Instant from, Instant to) {
    long delivered = orderRepo.deliveredCountInRange(from, to);
    if (delivered == 0) {
      return BigDecimal.ZERO;
    }
    return revenue(from, to).divide(BigDecimal.valueOf(delivered), 0, java.math.RoundingMode.HALF_UP);
  }
}
