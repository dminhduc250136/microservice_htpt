'use client';

/**
 * QuickReplyChips — câu hỏi gợi ý ở empty-state của ChatPanel.
 *
 * Pool 24 câu phủ các nhóm hàng shop bán (điện thoại, laptop, chuột, bàn phím,
 * tai nghe) + đa dạng kiểu hỏi (theo nhu cầu, ngân sách, so sánh, chính sách).
 * Mỗi lần mở chat hiện ngẫu nhiên SHOW_COUNT câu để đỡ nhàm + phủ rộng.
 *
 * Random chạy trong useEffect (sau mount, chỉ client) để KHÔNG gây hydration
 * mismatch giữa server và client.
 */
import { useEffect, useState } from 'react';
import styles from './QuickReplyChips.module.css';

/** Số chip hiển thị mỗi lần. */
const SHOW_COUNT = 4;

/** Pool câu hỏi gợi ý (tiếng Việt, ngắn gọn, mang tính tư vấn). */
const POOL = [
  // Laptop
  'Laptop nào tốt cho lập trình tầm 25 triệu?',
  'Laptop gaming RTX dưới 40 triệu?',
  'Laptop mỏng nhẹ pin trâu cho dân văn phòng?',
  'Tư vấn MacBook cho sinh viên thiết kế',
  'Laptop tầm 15 triệu học tập, lướt web?',
  // Điện thoại
  'Điện thoại pin trâu chụp ảnh đẹp?',
  'Điện thoại tầm 10 triệu nào đáng mua?',
  'So sánh iPhone và Samsung dòng cao cấp',
  'Điện thoại chơi game mượt giá tốt?',
  'Smartphone nhỏ gọn dễ cầm một tay?',
  // Chuột
  'Chuột không dây nào đáng mua?',
  'Chuột gaming nhẹ cho FPS?',
  'Chuột văn phòng êm, bấm không ồn?',
  // Bàn phím
  'Bàn phím cơ gõ êm cho văn phòng?',
  'Bàn phím cơ cho game thủ?',
  'Bàn phím không dây gọn nhẹ?',
  // Tai nghe
  'Tư vấn tai nghe chống ồn để làm việc',
  'Tai nghe true wireless tầm 2 triệu?',
  'Tai nghe nghe nhạc bass mạnh?',
  'Tai nghe gaming có mic tốt?',
  // Theo nhu cầu / chính sách
  'Combo bàn phím + chuột cho dân lập trình?',
  'Sản phẩm nào đang giảm giá nhiều nhất?',
  'Shop có hỗ trợ trả góp / thanh toán MoMo không?',
  'Chính sách đổi trả và bảo hành thế nào?',
];

/** Trộn mảng (Fisher-Yates) rồi lấy n phần tử đầu. */
function pickRandom<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

interface Props {
  onPick: (text: string) => void;
}

export default function QuickReplyChips({ onPick }: Props) {
  // Khởi tạo bằng SHOW_COUNT câu đầu (ổn định cho SSR), random lại sau khi mount.
  const [chips, setChips] = useState<string[]>(() => POOL.slice(0, SHOW_COUNT));

  useEffect(() => {
    // Random sau khi mount (chỉ client) để tránh hydration mismatch — đây là lý do
    // hợp lệ để setState trong effect (đồng bộ với nguồn ngẫu nhiên chỉ-có-ở-client).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChips(pickRandom(POOL, SHOW_COUNT));
  }, []);

  return (
    <div className={styles.row} role="group" aria-label="Câu hỏi gợi ý">
      {chips.map((c) => (
        <button
          key={c}
          type="button"
          className={styles.chip}
          onClick={() => onPick(c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
