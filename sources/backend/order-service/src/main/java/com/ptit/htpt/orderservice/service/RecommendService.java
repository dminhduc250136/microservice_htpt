package com.ptit.htpt.orderservice.service;

import com.ptit.htpt.orderservice.repository.OrderRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Gợi ý sản phẩm cá nhân hóa (Collaborative Filtering) — DSS / mục 7.6.6 nhóm 04.
 *
 * <ul>
 *   <li>Item-based: "Khách mua X cũng mua Y" (cho trang chi tiết SP).</li>
 *   <li>User-based: "Gợi ý cho bạn" theo lịch sử mua (cho khách đã login).</li>
 * </ul>
 *
 * <p>Trả về danh sách productId + điểm đồng-mua; frontend tự enrich product detail
 * qua endpoint public {@code GET /api/products/{id}} (tránh cross-service auth).
 */
@Service
public class RecommendService {

  private final OrderRepository orderRepo;

  public RecommendService(OrderRepository orderRepo) {
    this.orderRepo = orderRepo;
  }

  @Transactional(readOnly = true)
  public List<RecItem> coPurchased(String productId, int limit) {
    return toItems(orderRepo.coPurchasedWith(productId, clamp(limit)));
  }

  @Transactional(readOnly = true)
  public List<RecItem> forUser(String userId, int limit) {
    return toItems(orderRepo.recommendForUser(userId, clamp(limit)));
  }

  private static int clamp(int limit) {
    if (limit <= 0) {
      return 8;
    }
    return Math.min(limit, 20);
  }

  private static List<RecItem> toItems(List<Object[]> rows) {
    List<RecItem> items = new ArrayList<>();
    for (Object[] r : rows) {
      items.add(new RecItem((String) r[0], ((Number) r[1]).longValue()));
    }
    return items;
  }

  /** productId + số đơn đồng-mua (score). */
  public record RecItem(String productId, long score) {}
}
