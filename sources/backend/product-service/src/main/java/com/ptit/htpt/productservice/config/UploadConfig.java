package com.ptit.htpt.productservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Serve file đã upload (lưu ở {@code app.uploads.dir}) qua URL
 * {@code /products/uploads/**} — nằm dưới prefix /products để khớp gateway
 * route /api/products/**. Browser truy cập qua {@code /api/products/uploads/<subdir>/<file>}.
 * Volume Docker mount thư mục này nên file persist qua restart container.
 *
 * <p>Pattern {@code /**} bắt cả subdir (products/, avatars/, …) — ImageStorageService
 * lưu file vào {@code <uploadsDir>/<subdir>/<name>} tương ứng.
 */
@Configuration
public class UploadConfig implements WebMvcConfigurer {

  private final String uploadsDir;

  public UploadConfig(@Value("${app.uploads.dir}") String uploadsDir) {
    this.uploadsDir = uploadsDir;
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    String location = "file:" + (uploadsDir.endsWith("/") ? uploadsDir : uploadsDir + "/");
    registry.addResourceHandler("/products/uploads/**").addResourceLocations(location);
  }
}
