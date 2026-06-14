package com.ptit.htpt.orderservice.service;

import com.ptit.htpt.orderservice.domain.OrderEntity;
import com.ptit.htpt.orderservice.repository.OrderRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.PageRequest;
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

  /** Doanh thu + số đơn theo từng trạng thái trong [from, to] (modal chi tiết doanh thu). */
  @Transactional(readOnly = true)
  public List<StatusBreakdown> revenueByStatus(Instant from, Instant to) {
    List<StatusBreakdown> out = new ArrayList<>();
    for (Object[] r : orderRepo.revenueByStatusInRange(from, to)) {
      out.add(new StatusBreakdown(
          (String) r[0],
          ((Number) r[1]).longValue(),
          r[2] != null ? (BigDecimal) r[2] : BigDecimal.ZERO));
    }
    return out;
  }

  /** Danh sách đơn trong [from, to] (+ optional status) cho modal chi tiết. Cap limit. */
  @Transactional(readOnly = true)
  public List<OrderRow> ordersInRange(String status, Instant from, Instant to, int limit) {
    String s = (status == null || status.isBlank()) ? null : status;
    int cap = limit <= 0 ? 100 : Math.min(limit, 500);
    List<OrderRow> rows = new ArrayList<>();
    for (OrderEntity o : orderRepo.findInRange(s, from, to, PageRequest.of(0, cap))) {
      rows.add(new OrderRow(o.id(), o.userId(), o.total(), o.status(), o.createdAt()));
    }
    return rows;
  }

  public record StatusBreakdown(String status, long count, BigDecimal revenue) {}

  public record OrderRow(String id, String userId, BigDecimal total, String status,
                         java.time.Instant createdAt) {}
}
