package com.ptit.htpt.productservice.web;

import com.ptit.htpt.productservice.api.ApiResponse;
import com.ptit.htpt.productservice.service.ImageStorageService;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Upload ảnh sản phẩm (admin only — protect ở gateway qua admin-path-patterns).
 *
 * <p>Gateway exposes này tại {@code POST /api/products/admin/upload}; internal
 * mapping là {@code /admin/products/upload} (gateway rewrite
 * /api/products/admin/(seg) → /admin/products/(seg) — D-12). Multipart field
 * {@code file}, lưu vào subdir {@code products} dưới {@code app.uploads.dir}, trả về
 * {@code {"url": "/api/products/uploads/products/<uuid>.<ext>"}}.
 *
 * <p>Logic lưu file + validate ở {@link ImageStorageService} (dùng chung cho mọi
 * endpoint upload trong service này — tránh duplicate khi thêm loại ảnh khác).
 */
@RestController
@RequestMapping("/admin/products")
public class AdminUploadController {

  private static final String SUBDIR = "products";

  private final ImageStorageService imageStorage;

  public AdminUploadController(ImageStorageService imageStorage) {
    this.imageStorage = imageStorage;
  }

  @PostMapping("/upload")
  public ApiResponse<Map<String, String>> upload(@RequestParam("file") MultipartFile file) {
    String url = imageStorage.store(file, SUBDIR);
    return ApiResponse.of(201, "Uploaded", Map.of("url", url));
  }
}
