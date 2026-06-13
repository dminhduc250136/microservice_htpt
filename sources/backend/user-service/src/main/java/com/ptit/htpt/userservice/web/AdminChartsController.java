package com.ptit.htpt.userservice.web;

import com.ptit.htpt.userservice.api.ApiResponse;
import com.ptit.htpt.userservice.service.Range;
import com.ptit.htpt.userservice.service.UserChartsService;
import com.ptit.htpt.userservice.service.UserChartsService.SignupPoint;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Phase 19 / Plan 19-02 (ADMIN-04): admin chart endpoint cho user signups.
 *
 * <p>Path {@code /admin/users/charts/signups} khớp gateway rewrite
 * {@code /api/users/admin/charts/signups} → {@code /admin/users/charts/signups}.
 *
 * <p>D-02: manual JWT role check qua {@link JwtRoleGuard#requireAdmin(String)}
 * (KHÔNG @PreAuthorize) — cùng pattern Phase 9 AdminStatsController.
 */
@RestController
@RequestMapping("/admin/users/charts")
public class AdminChartsController {

  private final UserChartsService chartsService;
  private final JwtRoleGuard jwtRoleGuard;

  public AdminChartsController(UserChartsService chartsService, JwtRoleGuard jwtRoleGuard) {
    this.chartsService = chartsService;
    this.jwtRoleGuard = jwtRoleGuard;
  }

  @GetMapping("/signups")
  public ApiResponse<List<SignupPoint>> signups(
      @RequestParam(value = "range", required = false, defaultValue = "30d") String range,
      @RequestParam(value = "from", required = false) String from,
      @RequestParam(value = "to", required = false) String to,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
    jwtRoleGuard.requireAdmin(authHeader);
    // Đợt 4: custom date range nếu có from/to; else range enum.
    List<SignupPoint> data = (from != null || to != null)
        ? chartsService.signupsByDay(parseFrom(from), parseTo(to))
        : chartsService.signupsByDay(Range.parse(range));
    return ApiResponse.of(200, "User signups", data);
  }

  /** Parse "yyyy-MM-dd" → Instant đầu ngày. null/blank → null. 400 nếu sai định dạng. */
  private static Instant parseFrom(String date) {
    if (date == null || date.isBlank()) {
      return null;
    }
    return parseDate(date).atStartOfDay(ZoneId.systemDefault()).toInstant();
  }

  /** Parse "yyyy-MM-dd" → Instant cuối ngày (23:59:59.999). null/blank → null. */
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
