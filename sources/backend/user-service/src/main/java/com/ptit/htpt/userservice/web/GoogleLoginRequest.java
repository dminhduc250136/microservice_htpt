package com.ptit.htpt.userservice.web;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body cho POST /auth/google.
 *
 * idToken là Google ID token (JWT) lấy từ Google Identity Services ở frontend.
 * Backend verify chữ ký + audience qua GoogleTokenVerifier trước khi tin tưởng claims.
 */
public record GoogleLoginRequest(
    @NotBlank String idToken
) {}
