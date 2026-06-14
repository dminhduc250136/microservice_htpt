package com.ptit.htpt.orderservice.web;

import com.ptit.htpt.orderservice.api.ApiResponse;
import com.ptit.htpt.orderservice.service.OrderStatsService;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Phase 9 / Plan 09-02 (UI-02). Admin-only stats — D-05 REVISED: manual JWT
 * role check (KHÔNG @PreAuthorize). Path /admin/orders/stats khớp gateway
 * route `/api/orders/admin/stats` → rewrite → `/admin/orders/stats`.
 */
@RestController
@RequestMapping("/admin/orders")
public class AdminStatsController {

  private final OrderStatsService statsService;
  private final JwtRoleGuard jwtRoleGuard;

  public AdminStatsController(OrderStatsService statsService, JwtRoleGuard jwtRoleGuard) {
    this.statsService = statsService;
    this.jwtRoleGuard = jwtRoleGuard;
  }

  /**
   * Response: {totalOrders, pendingOrders, revenue, averageOrderValue}.
   * Có from/to (yyyy-MM-dd) → lọc theo khoảng; else toàn bộ. Doanh thu = đơn DELIVERED.
   */
  @GetMapping("/stats")
  public ApiResponse<Map<String, Object>> stats(
      @RequestParam(value = "from", required = false) String from,
      @RequestParam(value = "to", required = false) String to,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader
  ) {
    jwtRoleGuard.requireAdmin(authHeader);
    Instant f = parseFrom(from);
    Instant t = parseTo(to);
    boolean ranged = (from != null || to != null);
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("totalOrders", ranged ? statsService.totalOrders(f, t) : statsService.totalOrders());
    body.put("pendingOrders", ranged ? statsService.pendingOrders(f, t) : statsService.pendingOrders());
    body.put("revenue", statsService.revenue(f, t));
    body.put("averageOrderValue", statsService.averageOrderValue(f, t));
    return ApiResponse.of(200, "Order stats", body);
  }

  /** Chi tiết doanh thu: breakdown theo trạng thái trong [from, to]. */
  @GetMapping("/revenue-detail")
  public ApiResponse<Object> revenueDetail(
      @RequestParam(value = "from", required = false) String from,
      @RequestParam(value = "to", required = false) String to,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
    jwtRoleGuard.requireAdmin(authHeader);
    return ApiResponse.of(200, "Revenue detail",
        Map.of("byStatus", statsService.revenueByStatus(parseFrom(from), parseTo(to))));
  }

  /** Danh sách đơn trong [from, to], optional status (modal chi tiết đơn hàng). */
  @GetMapping("/orders-list")
  public ApiResponse<Object> ordersList(
      @RequestParam(value = "from", required = false) String from,
      @RequestParam(value = "to", required = false) String to,
      @RequestParam(value = "status", required = false) String status,
      @RequestParam(value = "limit", defaultValue = "100") int limit,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
    jwtRoleGuard.requireAdmin(authHeader);
    return ApiResponse.of(200, "Orders in range",
        Map.of("orders", statsService.ordersInRange(status, parseFrom(from), parseTo(to), limit)));
  }

  private static Instant parseFrom(String date) {
    if (date == null || date.isBlank()) {
      return null;
    }
    return parseDate(date).atStartOfDay(ZoneId.systemDefault()).toInstant();
  }

  private static Instant parseTo(String date) {
    if (date == null || date.isBlank()) {
      return null;
    }
    return parseDate(date).atTime(23, 59, 59, 999_000_000).atZone(ZoneId.systemDefault()).toInstant();
  }

  private static LocalDate parseDate(String date) {
    try {
      return LocalDate.parse(date.trim());
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày không hợp lệ (yyyy-MM-dd): " + date);
    }
  }
}
