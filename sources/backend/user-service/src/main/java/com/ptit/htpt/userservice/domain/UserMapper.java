package com.ptit.htpt.userservice.domain;

/** Entity -> DTO boundary tại service layer (RESEARCH §Decision #8).
 *
 * Phase 7 / Plan 03 (D-04): Map thêm fullName + phone.
 * Phase 10 / Plan 10-01 (D-06): Map hasAvatar=false (avatar defer per D-08).
 * Avatar wire-up: hasAvatar suy từ avatarUrl != null.
 */
public final class UserMapper {
  private UserMapper() {}

  public static UserDto toDto(UserEntity e) {
    return new UserDto(
        e.id(),
        e.username(),
        e.email(),
        e.roles(),
        e.fullName(),
        e.phone(),
        e.avatarUrl(),
        e.avatarUrl() != null,
        e.createdAt(),
        e.updatedAt()
    );
  }
}
