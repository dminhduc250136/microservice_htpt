package com.ptit.htpt.productservice.web;

import com.ptit.htpt.productservice.api.ApiResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Upload ảnh sản phẩm (admin only — protect ở gateway qua admin-path-patterns).
 *
 * <p>POST {@code /products/admin/upload} (multipart/form-data, field {@code file})
 * → lưu vào {@code app.uploads.dir}, trả về {@code {"url": "/uploads/<uuid>.<ext>"}}.
 *
 * <p>FE set {@code thumbnailUrl} của product = giá trị URL trả về này.
 */
@RestController
@RequestMapping("/products/admin")
public class AdminUploadController {

  private final Path uploadsRoot;

  public AdminUploadController(@Value("${app.uploads.dir}") String uploadsDir) {
    this.uploadsRoot = Paths.get(uploadsDir).toAbsolutePath().normalize();
  }

  @PostMapping("/upload")
  public ApiResponse<Map<String, String>> upload(@RequestParam("file") MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File rỗng");
    }
    String contentType = file.getContentType();
    if (contentType == null || !contentType.startsWith("image/")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ chấp nhận file ảnh");
    }
    String original = file.getOriginalFilename();
    String ext = "";
    if (original != null) {
      int dot = original.lastIndexOf('.');
      if (dot >= 0) {
        ext = original.substring(dot).toLowerCase();
      }
    }
    String name = UUID.randomUUID().toString().replace("-", "") + ext;

    try {
      Files.createDirectories(uploadsRoot);
      Path dest = uploadsRoot.resolve(name).normalize();
      if (!dest.startsWith(uploadsRoot)) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên file không hợp lệ");
      }
      file.transferTo(dest);
    } catch (IOException e) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không lưu được file: " + e.getMessage());
    }

    return ApiResponse.of(201, "Uploaded", Map.of("url", "/uploads/" + name));
  }
}
