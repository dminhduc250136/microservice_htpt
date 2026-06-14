package com.ptit.htpt.orderservice.service;

import com.ptit.htpt.orderservice.repository.OrderRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Phân khúc khách hàng RFM (DSS admin) — Recency / Frequency / Monetary.
 *
 * <p>Mỗi khách (có đơn DELIVERED) được chấm 1-5 điểm cho từng chiều theo NGŨ PHÂN VỊ
 * (quintile) trên toàn tập khách: R cao = mua gần đây, F cao = mua nhiều lần, M cao =
 * chi nhiều. Từ (R,F,M) suy ra nhóm có tên + gợi ý hành động. Trả về danh sách nhóm
 * kèm số khách + tổng doanh thu nhóm, để admin nắm phân bố tệp khách.
 */
@Service
public class CustomerSegmentService {

  private final OrderRepository orderRepo;

  public CustomerSegmentService(OrderRepository orderRepo) {
    this.orderRepo = orderRepo;
  }

  /** RFM thô + điểm của 1 khách. score là mutable trong lúc tính. */
  private static final class Customer {
    final String userId;
    final int recency;
    final long frequency;
    final BigDecimal monetary;
    int rScore;
    int fScore;
    int mScore;

    Customer(String userId, int recency, long frequency, BigDecimal monetary) {
      this.userId = userId;
      this.recency = recency;
      this.frequency = frequency;
      this.monetary = monetary;
    }
  }

  @Transactional(readOnly = true)
  public SegmentResult customerSegments() {
    List<Object[]> rows = orderRepo.aggregateRfm();
    if (rows.isEmpty()) {
      return new SegmentResult(0, List.of());
    }

    List<Customer> customers = new ArrayList<>();
    for (Object[] r : rows) {
      customers.add(new Customer(
          (String) r[0],
          ((Number) r[1]).intValue(),
          ((Number) r[2]).longValue(),
          r[3] != null ? (BigDecimal) r[3] : BigDecimal.ZERO));
    }
    int n = customers.size();

    // Chấm điểm 1-5 theo quintile. Sắp tốt→kém rồi gán 5..1 theo vị trí.
    // Recency: NHỎ tốt (mua gần đây) → sắp tăng dần. F/M: LỚN tốt → sắp giảm dần.
    assignScores(customers, Comparator.comparingInt((Customer c) -> c.recency), n, (c, s) -> c.rScore = s);
    assignScores(customers, Comparator.comparingLong((Customer c) -> c.frequency).reversed(), n, (c, s) -> c.fScore = s);
    assignScores(customers, Comparator.comparing((Customer c) -> c.monetary).reversed(), n, (c, s) -> c.mScore = s);

    // Gộp theo nhóm.
    Map<String, List<Customer>> grouped = new LinkedHashMap<>();
    for (Customer c : customers) {
      grouped.computeIfAbsent(segmentOf(c), k -> new ArrayList<>()).add(c);
    }

    List<SegmentGroup> groups = new ArrayList<>();
    for (String name : SEGMENT_ORDER) {
      List<Customer> members = grouped.get(name);
      if (members == null || members.isEmpty()) {
        continue;
      }
      BigDecimal totalRevenue = members.stream()
          .map(c -> c.monetary).reduce(BigDecimal.ZERO, BigDecimal::add);
      groups.add(new SegmentGroup(name, SEGMENT_DESC.get(name), members.size(), totalRevenue));
    }

    return new SegmentResult(n, groups);
  }

  /** Hàm gán điểm cho 1 Customer (functional). */
  private interface ScoreSetter {
    void set(Customer c, int score);
  }

  /**
   * Sắp customers theo comparator (tốt→kém) rồi gán điểm 5..1 theo vị trí (quintile):
   * vị trí đầu = 5 điểm, cuối = 1 điểm.
   */
  private static void assignScores(List<Customer> customers, Comparator<Customer> bestFirst,
                                   int n, ScoreSetter setter) {
    List<Customer> sorted = new ArrayList<>(customers);
    sorted.sort(bestFirst);
    for (int i = 0; i < sorted.size(); i++) {
      int score = 5 - (int) Math.floor((double) i * 5 / Math.max(n, 1));
      if (score < 1) {
        score = 1;
      }
      setter.set(sorted.get(i), score);
    }
  }

  // Quy tắc gộp nhóm từ (R,F,M). Đơn giản, dễ giải thích cho báo cáo.
  private static String segmentOf(Customer c) {
    int r = c.rScore;
    int fm = (c.fScore + c.mScore) / 2;
    if (r >= 4 && fm >= 4) {
      return "VIP";
    }
    if (fm >= 4) {
      return "Trung thành";
    }
    if (r >= 4) {
      return "Khách mới / tiềm năng";
    }
    if (r <= 2 && fm >= 3) {
      return "Nguy cơ rời bỏ";
    }
    if (r <= 2) {
      return "Đã ngủ đông";
    }
    return "Cần chăm sóc";
  }

  // Thứ tự hiển thị (giá trị cao → cần cứu).
  private static final List<String> SEGMENT_ORDER = List.of(
      "VIP", "Trung thành", "Khách mới / tiềm năng", "Cần chăm sóc",
      "Nguy cơ rời bỏ", "Đã ngủ đông");

  private static final Map<String, String> SEGMENT_DESC = Map.of(
      "VIP", "Mua gần đây, thường xuyên, chi nhiều — chăm sóc đặc biệt, ưu đãi riêng.",
      "Trung thành", "Mua nhiều lần & chi tốt — giữ chân bằng tích điểm, ưu đãi thân thiết.",
      "Khách mới / tiềm năng", "Mới mua gần đây — khuyến khích mua lại, gợi ý sản phẩm liên quan.",
      "Cần chăm sóc", "Mức trung bình — kích hoạt bằng khuyến mãi để tăng tần suất.",
      "Nguy cơ rời bỏ", "Từng mua tốt nhưng lâu chưa quay lại — gửi ưu đãi 'win-back'.",
      "Đã ngủ đông", "Rất lâu không mua, giá trị thấp — chiến dịch tái kích hoạt chi phí thấp.");

  public record SegmentGroup(String name, String description, int customerCount, BigDecimal totalRevenue) {}

  public record SegmentResult(int totalCustomers, List<SegmentGroup> segments) {}
}
