package com.ptit.htpt.productservice.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Logic chung cho mọi endpoint upload ảnh trong product-service.
 *
 * <p>Validate (kiểu file, kích thước), sinh tên ngẫu nhiên, lưu vào {@code app.uploads.dir}
 * dưới {@code subdir} (tách thư mục con cho từng loại ảnh để dễ dọn). Trả về URL
 * public dạng {@code /api/products/uploads/<subdir>/<file>} — đường này đi qua gateway
 * và resource handler ở {@code UploadConfig}.
 *
 * <p>Why service riêng: trước đây controller tự lo cả validate + lưu file. Khi thêm
 * endpoint upload khác (banner, review image) sẽ phải copy logic. Tách ra service
 * để controller chỉ map HTTP → call.
 */
@Service
public class ImageStorageService {

  private static final Set<String> ALLOWED_EXT = Set.of(
      ".jpg", ".jpeg", ".png", ".webp", ".gif"
  );
  private static final long MAX_SIZE_BYTES = 5L * 1024 * 1024; // 5 MB

  private final Path uploadsRoot;
  private final String publicUrlPrefix;

  public ImageStorageService(
      @Value("${app.uploads.dir}") String uploadsDir,
      @Value("${app.uploads.public-url-prefix:/api/products/uploads}") String publicUrlPrefix) {
    this.uploadsRoot = Paths.get(uploadsDir).toAbsolutePath().normalize();
    this.publicUrlPrefix = publicUrlPrefix.endsWith("/")
        ? publicUrlPrefix.substring(0, publicUrlPrefix.length() - 1)
        : publicUrlPrefix;
  }

  /**
   * Lưu ảnh vào {@code <uploads>/<subdir>/<uuid><ext>} và trả URL public.
   *
   * @param file multipart file
   * @param subdir thư mục con (vd. "products", "avatars") — không được rỗng, không chứa "/"
   * @return URL public, vd. {@code /api/products/uploads/products/abc.png}
   */
  public String store(MultipartFile file, String subdir) {
    validate(file);
    if (subdir == null || subdir.isBlank() || subdir.contains("/") || subdir.contains("\\")) {
      throw new IllegalArgumentException("subdir không hợp lệ: " + subdir);
    }

    String ext = extractExtension(file.getOriginalFilename());
    String name = UUID.randomUUID().toString().replace("-", "") + ext;

    Path dir = uploadsRoot.resolve(subdir).normalize();
    if (!dir.startsWith(uploadsRoot)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "subdir thoát khỏi uploads root");
    }
    Path dest = dir.resolve(name).normalize();
    if (!dest.startsWith(dir)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên file không hợp lệ");
    }

    try {
      Files.createDirectories(dir);
      file.transferTo(dest);
    } catch (IOException e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "Không lưu được file: " + e.getMessage());
    }

    return publicUrlPrefix + "/" + subdir + "/" + name;
  }

  private void validate(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File rỗng");
    }
    String contentType = file.getContentType();
    if (contentType == null || !contentType.startsWith("image/")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ chấp nhận file ảnh");
    }
    if (file.getSize() > MAX_SIZE_BYTES) {
      throw new ResponseStatusException(
          HttpStatus.PAYLOAD_TOO_LARGE,
          "File vượt giới hạn " + (MAX_SIZE_BYTES / 1024 / 1024) + "MB");
    }
    String ext = extractExtension(file.getOriginalFilename()).toLowerCase();
    if (!ext.isEmpty() && !ALLOWED_EXT.contains(ext)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Phần mở rộng không được phép: " + ext);
    }
  }

  private String extractExtension(String original) {
    if (original == null) return "";
    int dot = original.lastIndexOf('.');
    if (dot < 0) return "";
    return original.substring(dot).toLowerCase();
  }
}
