package com.ptit.htpt.userservice.jwt;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import java.util.Collections;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Verify Google ID token cho luồng "Đăng nhập bằng Google".
 *
 * Frontend dùng Google Identity Services lấy ID token rồi gửi về đây. Verifier
 * kiểm tra chữ ký Google (qua JWKS cache nội bộ của GoogleIdTokenVerifier), hạn,
 * issuer và audience == GOOGLE_CLIENT_ID của ta. Chỉ tin email/name SAU khi verify.
 *
 * Security: KHÔNG bao giờ tự parse ID token bằng JwtUtils (secret HS256 của ta không
 * liên quan tới chữ ký RS256 của Google). Audience check chống token issued cho app khác.
 */
@Component
public class GoogleTokenVerifier {

    private final GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifier(@Value("${app.google.client-id:}") String clientId) {
        if (clientId == null || clientId.isBlank()) {
            // Cho phép app khởi động khi chưa cấu hình Google (login password vẫn chạy).
            // verify() sẽ báo lỗi rõ ràng nếu thực sự gọi endpoint /auth/google mà thiếu config.
            this.verifier = null;
            return;
        }
        this.verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), GsonFactory.getDefaultInstance())
            .setAudience(Collections.singletonList(clientId))
            .build();
    }

    /**
     * Verify ID token và trả về payload đã xác thực.
     *
     * @throws ResponseStatusException 503 nếu Google chưa được cấu hình
     * @throws ResponseStatusException 401 nếu token không hợp lệ / sai audience / hết hạn
     */
    public GoogleIdToken.Payload verify(String idToken) {
        if (verifier == null) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE, "Đăng nhập Google chưa được cấu hình");
        }
        GoogleIdToken token;
        try {
            token = verifier.verify(idToken);
        } catch (Exception e) {
            // GeneralSecurityException / IOException khi gọi JWKS — coi là token không xác thực được.
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Không xác thực được Google token");
        }
        if (token == null) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Google token không hợp lệ");
        }
        GoogleIdToken.Payload payload = token.getPayload();
        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Email Google chưa được xác minh");
        }
        return payload;
    }
}
