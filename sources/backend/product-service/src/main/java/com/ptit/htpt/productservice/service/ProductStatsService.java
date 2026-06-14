package com.ptit.htpt.productservice.service;

import com.ptit.htpt.productservice.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Phase 9 / Plan 09-02 (UI-02): Admin stats service cho product-service.
 * Cung cấp số liệu thật cho admin dashboard KPI cards.
 */
@Service
public class ProductStatsService {

  private final ProductRepository productRepo;

  public ProductStatsService(ProductRepository productRepo) {
    this.productRepo = productRepo;
  }

  @Transactional(readOnly = true)
  public long totalProducts() {
    return productRepo.count();
  }

  /** Số SP tạo trong [from, to] (null = toàn bộ). */
  @Transactional(readOnly = true)
  public long totalProducts(java.time.Instant from, java.time.Instant to) {
    return productRepo.countInRange(from, to);
  }

  /** Danh sách SP tạo trong [from, to] (modal "Sản phẩm mới"). Cap limit. */
  @Transactional(readOnly = true)
  public java.util.List<ProductRow> productsInRange(java.time.Instant from, java.time.Instant to, int limit) {
    int cap = limit <= 0 ? 100 : Math.min(limit, 500);
    java.util.List<ProductRow> rows = new java.util.ArrayList<>();
    for (var p : productRepo.findInRange(from, to,
        org.springframework.data.domain.PageRequest.of(0, cap))) {
      rows.add(new ProductRow(p.id(), p.name(), p.price(), p.stock(), p.status(),
          p.thumbnailUrl(), p.createdAt()));
    }
    return rows;
  }

  public record ProductRow(String id, String name, java.math.BigDecimal price, int stock,
                           String status, String thumbnailUrl, java.time.Instant createdAt) {}
}
