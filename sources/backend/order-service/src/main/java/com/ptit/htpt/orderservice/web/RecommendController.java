package com.ptit.htpt.orderservice.web;

import com.ptit.htpt.orderservice.api.ApiResponse;
import com.ptit.htpt.orderservice.service.RecommendService;
import com.ptit.htpt.orderservice.service.RecommendService.RecItem;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Gợi ý sản phẩm (Collaborative Filtering) — mục 7.6.6 nhóm 04.
 *
 * <ul>
 *   <li>{@code GET /orders/recommend/co-purchase/{productId}} — PUBLIC, "mua X cũng mua Y".</li>
 *   <li>{@code GET /orders/recommend/for-me} — cần X-User-Id (gateway inject từ JWT).</li>
 * </ul>
 *
 * <p>Gateway rewrite {@code /api/orders/recommend/...} → {@code /orders/recommend/...}.
 * Trả productId + score; frontend enrich product detail qua {@code /api/products/{id}}.
 */
@RestController
@RequestMapping("/orders/recommend")
public class RecommendController {

  private final RecommendService recommendService;

  public RecommendController(RecommendService recommendService) {
    this.recommendService = recommendService;
  }

  /** PUBLIC: "Khách mua sản phẩm này cũng mua". */
  @GetMapping("/co-purchase/{productId}")
  public ApiResponse<List<RecItem>> coPurchase(
      @PathVariable String productId,
      @RequestParam(value = "limit", defaultValue = "8") int limit) {
    return ApiResponse.of(200, "Co-purchase recommendations",
        recommendService.coPurchased(productId, limit));
  }

  /** "Gợi ý cho bạn" — theo lịch sử mua của user (X-User-Id từ gateway). */
  @GetMapping("/for-me")
  public ApiResponse<List<RecItem>> forMe(
      @RequestHeader(value = "X-User-Id", required = false) String userId,
      @RequestParam(value = "limit", defaultValue = "8") int limit) {
    if (userId == null || userId.isBlank()) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing X-User-Id session header");
    }
    return ApiResponse.of(200, "Personalized recommendations",
        recommendService.forUser(userId, limit));
  }
}
