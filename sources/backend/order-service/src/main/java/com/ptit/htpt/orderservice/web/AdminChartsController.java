package com.ptit.htpt.orderservice.web;

import com.ptit.htpt.orderservice.api.ApiResponse;
import com.ptit.htpt.orderservice.service.OrderChartsService;
import com.ptit.htpt.orderservice.service.OrderChartsService.RevenuePoint;
import com.ptit.htpt.orderservice.service.OrderChartsService.StatusPoint;
import com.ptit.htpt.orderservice.service.OrderChartsService.TopProductPoint;
import com.ptit.htpt.orderservice.service.Range;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Phase 19 / Plan 19-01 (D-01, D-02, ADMIN-01..03): 3 admin chart endpoints.
 *
 * <p>Path {@code /admin/orders/charts/...} khớp gateway rewrite
 * {@code /api/orders/admin/(?<seg>.*) → /admin/orders/${seg}} (existing route).
 *
 * <p>Auth gate: {@link JwtRoleGuard#requireAdmin(String)} per endpoint —
 * missing/invalid Bearer → 401, non-ADMIN → 403, invalid range → 400 (Range.parse).
 */
@RestController
@RequestMapping("/admin/orders/charts")
public class AdminChartsController {

  private final OrderChartsService chartsService;
  private final JwtRoleGuard jwtRoleGuard;

  public AdminChartsController(OrderChartsService chartsService, JwtRoleGuard jwtRoleGuard) {
    this.chartsService = chartsService;
    this.jwtRoleGuard = jwtRoleGuard;
  }

  @GetMapping("/revenue")
  public ApiResponse<List<RevenuePoint>> revenue(
      @RequestParam(value = "range", required = false, defaultValue = "30d") String range,
      @RequestParam(value = "from", required = false) String from,
      @RequestParam(value = "to", required = false) String to,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
    jwtRoleGuard.requireAdmin(authHeader);
    // Đợt 4: nếu có from/to (custom date range) → dùng; else fallback range enum.
    List<RevenuePoint> data = (from != null || to != null)
        ? chartsService.revenueByDay(parseFrom(from), parseTo(to))
        : chartsService.revenueByDay(Range.parse(range));
    return ApiResponse.of(200, "Revenue chart", data);
  }

  @GetMapping("/top-products")
  public ApiResponse<List<TopProductPoint>> topProducts(
      @RequestParam(value = "range", required = false, defaultValue = "30d") String range,
      @RequestParam(value = "from", required = false) String from,
      @RequestParam(value = "to", required = false) String to,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
    jwtRoleGuard.requireAdmin(authHeader);
    // D-03 + Pitfall #4: forward authHeader xuống service → ProductBatchClient
    List<TopProductPoint> data = (from != null || to != null)
        ? chartsService.topProducts(parseFrom(from), parseTo(to), authHeader)
        : chartsService.topProducts(Range.parse(range), authHeader);
    return ApiResponse.of(200, "Top products", data);
  }

  /** Parse "yyyy-MM-dd" → Instant đầu ngày (00:00). null/blank → null. 400 nếu sai định dạng. */
  private static Instant parseFrom(String date) {
    if (date == null || date.isBlank()) {
      return null;
    }
    return parseDate(date).atStartOfDay(ZoneId.systemDefault()).toInstant();
  }

  /** Parse "yyyy-MM-dd" → Instant CUỐI ngày (23:59:59.999). null/blank → null. */
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

  @GetMapping("/status-distribution")
  public ApiResponse<List<StatusPoint>> statusDistribution(
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
    jwtRoleGuard.requireAdmin(authHeader);
    return ApiResponse.of(200, "Order status distribution",
        chartsService.statusDistribution());
  }
}
