package com.ptit.htpt.productservice.repository;

import com.ptit.htpt.productservice.domain.ProductEntity;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<ProductEntity, String> {
  Optional<ProductEntity> findBySlug(String slug);

  /**
   * Phase 14 / Plan 01 (D-06, D-07, D-08): list products với optional filters.
   * keyword=null → bỏ qua keyword. brands=null/empty → bỏ qua brand filter.
   * priceMin / priceMax = null → bỏ qua price bound tương ứng.
   *
   * <p>Sort/order do Pageable quyết định — KHÔNG hardcode ORDER BY trong JPQL.
   * @SQLRestriction("deleted = false") trên ProductEntity tự loại deleted records.
   *
   * <p>cast(:param as type) IS NULL pattern (analog OrderRepository.findByUserIdWithFilters)
   * để Hibernate bind nullable param đúng kiểu khi user truyền null.
   */
  @Query("SELECT p FROM ProductEntity p WHERE "
      + "(cast(:keyword as string) IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', cast(:keyword as string), '%'))) "
      + "AND (cast(:categoryId as string) IS NULL OR p.categoryId = :categoryId) "
      + "AND (:brands IS NULL OR p.brand IN :brands) "
      + "AND (cast(:priceMin as big_decimal) IS NULL OR p.price >= :priceMin) "
      + "AND (cast(:priceMax as big_decimal) IS NULL OR p.price <= :priceMax)")
  Page<ProductEntity> findWithFilters(
      @Param("keyword") String keyword,
      @Param("categoryId") String categoryId,
      @Param("brands") List<String> brands,
      @Param("priceMin") BigDecimal priceMin,
      @Param("priceMax") BigDecimal priceMax,
      Pageable pageable);

  /**
   * Search theo nhiều TỪ KHÓA tách bởi khoảng trắng (đã trim + lowercase ở service).
   *
   * <p>Mỗi token (t0..t4, tối đa 5; CHUỖI RỖNG "" = bỏ qua) khớp chuỗi con trong tên
   * theo OR → CHỈ cần MỘT token khớp là SP được lấy. Nhờ OR, gõ sai 1 từ vẫn ra kết
   * quả: "sam sunf" → "sam" khớp "Samsung", "sunf" không khớp gì → vẫn ra Samsung.
   *
   * <p>Token thiếu truyền "" (KHÔNG truyền null) để PostgreSQL suy được kiểu text cho
   * bind param — null không cast làm PG hiểu nhầm bytea → "operator text ~~ bytea".
   *
   * <p>ORDER BY điểm relevance (rank 0 = tốt nhất):
   * <ol>
   *   <li>0: tên CHỨA nguyên cụm gốc :phrase (khớp sát nhất, vd gõ "macbook pro")
   *   <li>1: tên BẮT ĐẦU bằng token đầu :t0 (vd "samsung..." khi tìm "sam")
   *   <li>2: còn lại (chỉ khớp một phần token)
   * </ol>
   * Trong cùng rank: SP khớp NHIỀU token hơn lên trước (đếm số token khớp giảm dần),
   * rồi tên ngắn hơn (sát từ khóa hơn), rồi soldCount giảm dần.
   *
   * <p>brands/price filter vẫn áp dụng để kết hợp với FilterSidebar.
   */
  @Query("SELECT p FROM ProductEntity p WHERE "
      + "("
      + "  (:t0 <> '' AND LOWER(p.name) LIKE CONCAT('%', :t0, '%')) "
      + "  OR (:t1 <> '' AND LOWER(p.name) LIKE CONCAT('%', :t1, '%')) "
      + "  OR (:t2 <> '' AND LOWER(p.name) LIKE CONCAT('%', :t2, '%')) "
      + "  OR (:t3 <> '' AND LOWER(p.name) LIKE CONCAT('%', :t3, '%')) "
      + "  OR (:t4 <> '' AND LOWER(p.name) LIKE CONCAT('%', :t4, '%')) "
      + ") "
      + "AND (cast(:categoryId as string) IS NULL OR p.categoryId = :categoryId) "
      + "AND (:brands IS NULL OR p.brand IN :brands) "
      + "AND (cast(:priceMin as big_decimal) IS NULL OR p.price >= :priceMin) "
      + "AND (cast(:priceMax as big_decimal) IS NULL OR p.price <= :priceMax) "
      + "ORDER BY "
      + "CASE WHEN LOWER(p.name) LIKE CONCAT('%', :phrase, '%') THEN 0 "
      + "     WHEN LOWER(p.name) LIKE CONCAT(:t0, '%') THEN 1 "
      + "     ELSE 2 END ASC, "
      + "("
      + "  (CASE WHEN :t0 <> '' AND LOWER(p.name) LIKE CONCAT('%', :t0, '%') THEN 1 ELSE 0 END) "
      + "+ (CASE WHEN :t1 <> '' AND LOWER(p.name) LIKE CONCAT('%', :t1, '%') THEN 1 ELSE 0 END) "
      + "+ (CASE WHEN :t2 <> '' AND LOWER(p.name) LIKE CONCAT('%', :t2, '%') THEN 1 ELSE 0 END) "
      + "+ (CASE WHEN :t3 <> '' AND LOWER(p.name) LIKE CONCAT('%', :t3, '%') THEN 1 ELSE 0 END) "
      + "+ (CASE WHEN :t4 <> '' AND LOWER(p.name) LIKE CONCAT('%', :t4, '%') THEN 1 ELSE 0 END) "
      + ") DESC, "
      + "LENGTH(p.name) ASC, p.soldCount DESC")
  Page<ProductEntity> searchByTokens(
      @Param("t0") String t0,
      @Param("t1") String t1,
      @Param("t2") String t2,
      @Param("t3") String t3,
      @Param("t4") String t4,
      @Param("phrase") String phrase,
      @Param("categoryId") String categoryId,
      @Param("brands") List<String> brands,
      @Param("priceMin") BigDecimal priceMin,
      @Param("priceMax") BigDecimal priceMax,
      Pageable pageable);

  /**
   * Phase 14 / Plan 01 (D-03): trả danh sách brand DISTINCT alphabetical, không null/empty.
   * Dùng cho FE FilterSidebar fetch danh sách thương hiệu.
   */
  @Query("SELECT DISTINCT p.brand FROM ProductEntity p "
      + "WHERE p.brand IS NOT NULL AND p.brand <> '' ORDER BY p.brand ASC")
  List<String> findDistinctBrands();

  /**
   * Phase 19 / Plan 03 (ADMIN-05, D-08, D-09): trả về danh sách SP có stock < threshold,
   * sắp xếp theo stock ASC, cap rows qua Pageable (D-09 = 50 ở LowStockService).
   *
   * <p>@SQLRestriction("deleted=false") trên ProductEntity tự loại deleted records.
   */
  @Query("SELECT p FROM ProductEntity p WHERE p.stock < :threshold ORDER BY p.stock ASC")
  List<ProductEntity> findLowStock(@Param("threshold") int threshold, Pageable cap);
}
