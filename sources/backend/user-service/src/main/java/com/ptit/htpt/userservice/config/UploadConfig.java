package com.ptit.htpt.userservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Serve file đã upload (lưu ở {@code app.uploads.dir}) qua URL
 * {@code /users/uploads/**} — gateway route {@code /api/users/**} forward thẳng tới đây
 * (RewritePath strip /api/users/ → /users/). Browser truy cập qua
 * {@code /api/users/uploads/<subdir>/<file>}.
 *
 * <p>Volume Docker mount thư mục này nên file persist qua restart container.
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
    registry.addResourceHandler("/users/uploads/**").addResourceLocations(location);
  }
}
