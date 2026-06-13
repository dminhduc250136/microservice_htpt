package com.ptit.htpt.productservice.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ptit.htpt.productservice.domain.CategoryEntity;
import com.ptit.htpt.productservice.domain.CategoryMapper;
import com.ptit.htpt.productservice.domain.ProductEntity;
import com.ptit.htpt.productservice.repository.CategoryRepository;
import com.ptit.htpt.productservice.repository.ProductRepository;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductCrudService {
  private final ProductRepository productRepo;
  private final CategoryRepository categoryRepo;
  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

  public ProductCrudService(ProductRepository productRepo, CategoryRepository categoryRepo) {
    this.productRepo = productRepo;
    this.categoryRepo = categoryRepo;
  }

  /** Parse specifications JSON (TEXT) → List<SpecItem>; trả rỗng nếu null/lỗi. */
  private static List<SpecItem> parseSpecifications(String json) {
    if (json == null || json.isBlank()) {
      return Collections.emptyList();
    }
    try {
      return OBJECT_MAPPER.readValue(json, new TypeReference<List<SpecItem>>() {});
    } catch (Exception e) {
      return Collections.emptyList();
    }
  }

  public Map<String, Object> listProducts(int page, int size, String sort, boolean includeDeleted) {
    return listProducts(page, size, sort, includeDeleted, null, null, null, null, null);
  }

  public Map<String, Object> listProducts(int page, int size, String sort,
                                          boolean includeDeleted, String keyword) {
    return listProducts(page, size, sort, includeDeleted, keyword, null, null, null, null);
  }

  /**
   * Phase 14 / Plan 01 (D-06, D-07, D-08): list products với JPQL filters.
   *
   * <p>{@code includeDeleted} giữ trong chữ ký để KHÔNG break callers cũ — không còn ý nghĩa
   * vì @SQLRestriction filter ở SQL layer (đồng bộ comment cũ Phase 5/8).
   *
   * <p>Normalize: empty/blank keyword/categoryId → null, empty brands list → null để
   * JPQL `IS NULL` clause skip điều kiện tương ứng.
   */
  public Map<String, Object> listProducts(int page, int size, String sort,
                                          boolean includeDeleted, String keyword,
                                          String categoryId, List<String> brands,
                                          BigDecimal priceMin, BigDecimal priceMax) {
    String normalizedKeyword = (keyword == null || keyword.isBlank()) ? null : keyword.trim();
    String normalizedCategoryId = (categoryId == null || categoryId.isBlank()) ? null : categoryId.trim();
    List<String> normalizedBrands = (brands == null || brands.isEmpty()) ? null : brands;

    int safePage = Math.max(page, 0);
    int safeSize = size <= 0 ? 20 : Math.min(size, 100);

    Page<ProductEntity> resultPage;
    if (normalizedKeyword != null) {
      // Có keyword → tách từng từ, search OR (chỉ cần 1 từ khớp), xếp theo độ khớp.
      // OR giúp gõ sai 1 từ vẫn ra kết quả ("sam sunf" → "sam" khớp Samsung).
      // KHÔNG dùng sort của user ở đây vì ORDER BY relevance nằm trong JPQL (tránh
      // xung đột "multiple ORDER BY"); FE chọn sort khác chỉ áp dụng khi không search.
      List<String> tokens = tokenizeKeyword(normalizedKeyword);
      // Gộp khoảng trắng thừa để rank-0 (khớp nguyên cụm) hoạt động kể cả khi user
      // gõ nhiều dấu cách giữa các từ (vd "sam   sung" → "sam sung").
      String phrase = normalizedKeyword.toLowerCase().replaceAll("\\s+", " ");
      Pageable pageable = PageRequest.of(safePage, safeSize); // KHÔNG kèm Sort
      resultPage = productRepo.searchByTokens(
          tokenAt(tokens, 0), tokenAt(tokens, 1), tokenAt(tokens, 2),
          tokenAt(tokens, 3), tokenAt(tokens, 4),
          phrase, normalizedCategoryId, normalizedBrands, priceMin, priceMax, pageable);
    } else {
      // Không keyword → giữ filter category/brand/price + tôn trọng sort do user chọn.
      Pageable pageable = PageRequest.of(safePage, safeSize, parseSort(sort));
      resultPage = productRepo.findWithFilters(
          null, normalizedCategoryId, normalizedBrands, priceMin, priceMax, pageable);
    }

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("content", resultPage.getContent().stream().map(this::toResponse).toList());
    response.put("totalElements", resultPage.getTotalElements());
    response.put("totalPages", resultPage.getTotalPages());
    response.put("currentPage", resultPage.getNumber());
    response.put("pageSize", resultPage.getSize());
    response.put("isFirst", resultPage.isFirst());
    response.put("isLast", resultPage.isLast());
    return response;
  }

  /** Số chiều embedding (Gemini text-embedding-004 = 768; khớp cột vector(768)). */
  private static final int EMBEDDING_DIM = 768;

  /**
   * Vector search (semantic RAG) — Đợt 1 AI. Nhận embedding câu hỏi (768 chiều) đã
   * embed ở frontend, trả top-K sản phẩm gần nghĩa nhất theo cosine distance.
   *
   * <p>Response CÙNG SHAPE với {@link #listProducts} (content[]/totalElements/...) để
   * frontend tái dùng mapProduct. searchByEmbedding trả id theo thứ tự gần→xa; ta
   * load entity theo id rồi GIỮ NGUYÊN thứ tự đó (findAllById không đảm bảo order).
   */
  public Map<String, Object> vectorSearch(List<Float> embedding, int topK) {
    int safeTopK = topK <= 0 ? 8 : Math.min(topK, 50);
    List<ProductEntity> ordered = Collections.emptyList();

    if (embedding != null && embedding.size() == EMBEDDING_DIM) {
      String vec = toVectorLiteral(embedding);
      List<String> ids = productRepo.searchByEmbedding(vec, safeTopK);
      if (!ids.isEmpty()) {
        Map<String, ProductEntity> byId = new LinkedHashMap<>();
        productRepo.findAllById(ids).forEach(p -> byId.put(p.id(), p));
        // Giữ thứ tự gần→xa từ DB; bỏ id không load được (vd vừa bị xóa).
        ordered = ids.stream().map(byId::get).filter(p -> p != null).toList();
      }
    }

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("content", ordered.stream().map(this::toResponse).toList());
    response.put("totalElements", (long) ordered.size());
    response.put("totalPages", 1);
    response.put("currentPage", 0);
    response.put("pageSize", safeTopK);
    response.put("isFirst", true);
    response.put("isLast", true);
    return response;
  }

  /**
   * Lưu embedding cho 1 SP (backfill). Validate đúng {@link #EMBEDDING_DIM} chiều
   * trước khi ghi để khỏi nhét vector sai kích thước vào cột vector(768).
   * Trả về số dòng cập nhật (0 nếu id không tồn tại).
   */
  public int updateEmbedding(String id, List<Float> embedding) {
    if (embedding == null || embedding.size() != EMBEDDING_DIM) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
          "embedding phải có đúng " + EMBEDDING_DIM + " phần tử");
    }
    // Đảm bảo SP tồn tại (404 rõ ràng thay vì update 0 dòng âm thầm).
    getProduct(id, true);
    return productRepo.updateEmbedding(id, toVectorLiteral(embedding));
  }

  /** Đếm SP đã có embedding (verify backfill). */
  public long countEmbeddings() {
    return productRepo.countWithEmbedding();
  }

  /**
   * Format List&lt;Float&gt; → pgvector literal "[0.1,0.2,...]". {@code Float.toString}
   * luôn dùng "." làm dấu thập phân (không phụ thuộc Locale) → an toàn cú pháp vector.
   */
  private static String toVectorLiteral(List<Float> embedding) {
    StringBuilder sb = new StringBuilder(embedding.size() * 12 + 2);
    sb.append('[');
    for (int i = 0; i < embedding.size(); i++) {
      if (i > 0) {
        sb.append(',');
      }
      sb.append(embedding.get(i).floatValue());
    }
    sb.append(']');
    return sb.toString();
  }

  public ProductEntity getProduct(String id, boolean includeDeleted) {
    ProductEntity product = productRepo.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    if (!includeDeleted && product.deleted()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
    }
    return product;
  }

  public ProductEntity getProductBySlug(String slug) {
    if (slug == null || slug.isBlank()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
    }
    return productRepo.findBySlug(slug)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
  }

  public ProductEntity createProduct(ProductUpsertRequest request) {
    ProductEntity product = ProductEntity.create(
        request.name(),
        request.slug(),
        request.categoryId(),
        request.price(),
        request.status(),
        request.brand(),
        request.thumbnailUrl(),
        request.shortDescription(),
        request.description(),
        request.specifications(),
        request.originalPrice()
    );
    product.setStock(request.stock());
    return productRepo.save(product);
  }

  public ProductEntity updateProduct(String id, ProductUpsertRequest request) {
    ProductEntity current = getProduct(id, true);
    current.update(
        request.name(),
        request.slug(),
        request.categoryId(),
        request.price(),
        request.status(),
        request.brand(),
        request.thumbnailUrl(),
        request.shortDescription(),
        request.description(),
        request.specifications(),
        request.originalPrice(),
        request.stock()
    );
    return productRepo.save(current);
  }

  public ProductEntity updateProductStatus(String id, ProductStatusRequest request) {
    ProductEntity current = getProduct(id, true);
    current.setStatus(request.status());
    return productRepo.save(current);
  }

  public void deleteProduct(String id) {
    ProductEntity current = getProduct(id, true);
    current.softDelete();
    productRepo.save(current);
  }

  public Map<String, Object> listCategories(int page, int size, String sort, boolean includeDeleted) {
    List<CategoryEntity> all = categoryRepo.findAll().stream()
        .filter(category -> includeDeleted || !category.deleted())
        .sorted(categoryComparator(sort))
        .toList();
    Map<String, Object> page0 = paginate(all, page, size);
    @SuppressWarnings("unchecked")
    List<CategoryEntity> content = (List<CategoryEntity>) page0.get("content");
    page0.put("content", content.stream().map(CategoryMapper::toDto).toList());
    return page0;
  }

  /**
   * Phase 14 / Plan 01 (D-03): trả danh sách thương hiệu DISTINCT alphabetical
   * cho FE FilterSidebar. Delegate trực tiếp sang repository.
   */
  public List<String> listBrands() {
    return productRepo.findDistinctBrands();
  }

  public CategoryEntity getCategory(String id, boolean includeDeleted) {
    CategoryEntity category = categoryRepo.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
    if (!includeDeleted && category.deleted()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found");
    }
    return category;
  }

  public CategoryEntity createCategory(CategoryUpsertRequest request) {
    CategoryEntity category = CategoryEntity.create(request.name(), request.slug());
    return categoryRepo.save(category);
  }

  public CategoryEntity updateCategory(String id, CategoryUpsertRequest request) {
    CategoryEntity current = getCategory(id, true);
    current.update(request.name(), request.slug());
    return categoryRepo.save(current);
  }

  public void deleteCategory(String id) {
    CategoryEntity current = getCategory(id, true);
    current.softDelete();
    categoryRepo.save(current);
  }

  /**
   * Map a ProductEntity to the rich ProductResponse the frontend consumes. Defaults
   * applied for fields not yet persisted on the entity. Category lookup uses
   * categoryRepo.findById; if the category has been deleted or is missing, emit a
   * placeholder CategoryRef with the raw categoryId so the FE can still render.
   */
  public ProductResponse toResponse(ProductEntity product) {
    CategoryRef categoryRef = categoryRepo.findById(product.categoryId())
        .map(c -> new CategoryRef(c.id(), c.name(), c.slug()))
        .orElseGet(() -> new CategoryRef(product.categoryId(), "—", product.categoryId()));

    return new ProductResponse(
        product.id(),
        product.name(),
        product.slug(),
        product.description() != null ? product.description() : "",
        product.shortDescription() != null ? product.shortDescription() : "",
        product.price(),
        product.originalPrice(),
        null,                                          // discount
        Collections.emptyList(),                       // images default
        product.thumbnailUrl() != null ? product.thumbnailUrl() : "",
        categoryRef,
        product.brand(),
        product.avgRating() != null ? product.avgRating() : BigDecimal.ZERO,
        product.reviewCount(),
        product.soldCount(),
        product.stock(),                               // D-02: đọc từ ProductEntity.stock (Phase 8 PERSIST-01)
        product.status(),
        Collections.emptyList(),                       // tags default
        parseSpecifications(product.specifications()),
        product.createdAt(),
        product.updatedAt()
    );
  }

  /**
   * Phase 14 / Plan 01: parse sort param "field,dir" → Spring Sort (dùng cho Pageable).
   * Default updatedAt DESC nếu sort null/blank.
   */
  /** Số token tối đa đưa vào searchByTokens (khớp t0..t4 trong query). */
  private static final int MAX_TOKENS = 5;

  /**
   * Tách keyword (đã trim) thành các từ theo khoảng trắng, lowercase, bỏ từ rỗng,
   * giới hạn {@link #MAX_TOKENS} từ đầu. Vd "  Sam  Sung  " → ["sam","sung"].
   */
  private static List<String> tokenizeKeyword(String keyword) {
    List<String> tokens = new ArrayList<>();
    for (String part : keyword.toLowerCase().split("\\s+")) {
      String t = part.trim();
      if (!t.isEmpty()) {
        tokens.add(t);
        if (tokens.size() >= MAX_TOKENS) break;
      }
    }
    return tokens;
  }

  /**
   * Token thứ i, hoặc chuỗi RỖNG "" nếu thiếu (KHÔNG null — để PostgreSQL suy được
   * kiểu text cho bind param; null không cast gây lỗi "operator text ~~ bytea").
   * Query dùng {@code :tN <> ''} để bỏ qua token rỗng.
   */
  private static String tokenAt(List<String> tokens, int i) {
    return i < tokens.size() ? tokens.get(i) : "";
  }

  private static Sort parseSort(String sort) {
    if (sort == null || sort.isBlank()) {
      return Sort.by(Sort.Direction.DESC, "updatedAt");
    }
    String[] parts = sort.split(",");
    String field = parts[0].trim();
    Sort.Direction dir = (parts.length > 1 && "desc".equalsIgnoreCase(parts[1].trim()))
        ? Sort.Direction.DESC : Sort.Direction.ASC;
    return Sort.by(dir, field);
  }

  private Comparator<CategoryEntity> categoryComparator(String sort) {
    if (sort == null || sort.isBlank()) {
      return Comparator.comparing(CategoryEntity::updatedAt).reversed();
    }
    boolean desc = sort.endsWith(",desc");
    Comparator<CategoryEntity> comparator = sort.startsWith("name")
        ? Comparator.comparing(CategoryEntity::name, String.CASE_INSENSITIVE_ORDER)
        : Comparator.comparing(CategoryEntity::id);
    return desc ? comparator.reversed() : comparator;
  }

  private <T> Map<String, Object> paginate(List<T> source, int page, int size) {
    int safePage = Math.max(page, 0);
    int safeSize = size <= 0 ? 20 : Math.min(size, 100);
    int totalElements = source.size();
    int from = Math.min(safePage * safeSize, totalElements);
    int to = Math.min(from + safeSize, totalElements);
    List<T> content = new ArrayList<>(source.subList(from, to));
    int totalPages = totalElements == 0 ? 1 : (int) Math.ceil((double) totalElements / safeSize);

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("content", content);
    result.put("totalElements", totalElements);
    result.put("totalPages", totalPages);
    result.put("currentPage", safePage);
    result.put("pageSize", safeSize);
    result.put("isFirst", safePage <= 0);
    result.put("isLast", safePage >= Math.max(totalPages - 1, 0));
    return result;
  }

  public record ProductUpsertRequest(
      @NotBlank String name,
      @NotBlank String slug,
      @NotBlank String categoryId,
      @DecimalMin("0.0") BigDecimal price,
      @NotBlank String status,
      String brand,               // nullable — D-03
      String thumbnailUrl,        // nullable — D-03
      String shortDescription,    // nullable — D-03
      String description,         // nullable — full description (PDP tab "Mô tả")
      String specifications,      // nullable — JSON string [{label,value}] (PDP tab "Thông số")
      BigDecimal originalPrice,   // nullable — D-03
      @Min(0) int stock           // D-01: stock field cho admin set/update (Phase 8)
  ) {}

  public record ProductStatusRequest(@NotBlank String status) {}

  /** Vector search request: embedding câu hỏi (768 chiều) + topK (mặc định 8). */
  public record VectorSearchRequest(List<Float> embedding, Integer topK) {}

  /** Backfill embedding cho 1 SP. */
  public record EmbeddingRequest(List<Float> embedding) {}

  /** Phase 5: schema mới cho category — drop {@code parentId, status}, thêm {@code slug}. */
  public record CategoryUpsertRequest(@NotBlank String name, @NotBlank String slug) {}

  public record ProductResponse(
      String id,
      String name,
      String slug,
      String description,
      String shortDescription,
      BigDecimal price,
      BigDecimal originalPrice,
      Integer discount,
      List<String> images,
      String thumbnailUrl,
      CategoryRef category,
      String brand,
      BigDecimal rating,
      int reviewCount,
      int soldCount,
      int stock,
      String status,
      List<String> tags,
      List<SpecItem> specifications,
      Instant createdAt,
      Instant updatedAt
  ) {}

  public record SpecItem(String label, String value) {}

  public record CategoryRef(
      String id,
      String name,
      String slug
  ) {}
}
