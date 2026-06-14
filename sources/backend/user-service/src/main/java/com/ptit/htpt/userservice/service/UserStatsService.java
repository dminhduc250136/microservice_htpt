package com.ptit.htpt.userservice.service;

import com.ptit.htpt.userservice.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Phase 9 / Plan 09-02 (UI-02): Admin stats service cho user-service.
 * Cung cấp số liệu thật cho admin dashboard KPI cards.
 */
@Service
public class UserStatsService {

  private final UserRepository userRepo;

  public UserStatsService(UserRepository userRepo) {
    this.userRepo = userRepo;
  }

  @Transactional(readOnly = true)
  public long totalUsers() {
    return userRepo.count();
  }

  /** Số user đăng ký trong [from, to] (null = toàn bộ). */
  @Transactional(readOnly = true)
  public long totalUsers(java.time.Instant from, java.time.Instant to) {
    return userRepo.countInRange(from, to);
  }

  /** Danh sách user đăng ký trong [from, to] (modal "Khách mới"). Cap limit. */
  @Transactional(readOnly = true)
  public java.util.List<UserRow> usersInRange(java.time.Instant from, java.time.Instant to, int limit) {
    int cap = limit <= 0 ? 100 : Math.min(limit, 500);
    java.util.List<UserRow> rows = new java.util.ArrayList<>();
    for (var u : userRepo.findInRange(from, to,
        org.springframework.data.domain.PageRequest.of(0, cap))) {
      rows.add(new UserRow(u.id(), u.email(), u.fullName(), u.createdAt()));
    }
    return rows;
  }

  public record UserRow(String id, String email, String fullName, java.time.Instant createdAt) {}
}
