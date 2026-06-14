package com.ptit.htpt.userservice.web;

import com.ptit.htpt.userservice.api.ApiResponse;
import com.ptit.htpt.userservice.service.UserStatsService;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
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
 * role check (KHÔNG @PreAuthorize). Path /admin/users/stats khớp gateway
 * route `/api/users/admin/stats` → rewrite → `/admin/users/stats`.
 *
 * NOTE: AdminUserController cũng dùng @RequestMapping("/admin/users") — KHÔNG conflict
 * vì Spring map handler theo full URL pattern. `/stats` chưa được map ở AdminUserController.
 */
@RestController
@RequestMapping("/admin/users")
public class AdminStatsController {

  private final UserStatsService statsService;
  private final JwtRoleGuard jwtRoleGuard;

  public AdminStatsController(UserStatsService statsService, JwtRoleGuard jwtRoleGuard) {
    this.statsService = statsService;
    this.jwtRoleGuard = jwtRoleGuard;
  }

  @GetMapping("/stats")
  public ApiResponse<Map<String, Long>> stats(
      @RequestParam(value = "from", required = false) String from,
      @RequestParam(value = "to", required = false) String to,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader
  ) {
    jwtRoleGuard.requireAdmin(authHeader);
    long total = (from != null || to != null)
        ? statsService.totalUsers(parseFrom(from), parseTo(to))
        : statsService.totalUsers();
    return ApiResponse.of(200, "User stats", Map.of("totalUsers", total));
  }

  /** Danh sách khách đăng ký trong [from, to] (modal "Khách mới"). */
  @GetMapping("/recent-list")
  public ApiResponse<Object> recentList(
      @RequestParam(value = "from", required = false) String from,
      @RequestParam(value = "to", required = false) String to,
      @RequestParam(value = "limit", defaultValue = "100") int limit,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
    jwtRoleGuard.requireAdmin(authHeader);
    return ApiResponse.of(200, "Recent users",
        java.util.Map.of("users", statsService.usersInRange(parseFrom(from), parseTo(to), limit)));
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
