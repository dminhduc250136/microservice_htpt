# Bộ Testcase Nghiệp Vụ — microservice_htpt

> Bảng kiểm thử thủ công / tài liệu, trọng tâm các edge case quan trọng: thêm số lượng lớn sản phẩm, mua quá tồn kho, coupon, phân quyền.
> Mọi request đi qua **api-gateway** (`http://localhost:8080`), gateway verify JWT ở edge rồi inject `X-User-Id`/`X-User-Roles`.
> Envelope phản hồi: `{ timestamp, status, message, data }`. Lỗi nghiệp vụ kèm `code` (vd `STOCK_SHORTAGE`).

## Quy ước
- **Ưu tiên**: P1 = nghiêm trọng / phải pass; P2 = quan trọng; P3 = nên có.
- **Vai trò**: USER = tài khoản thường, ADMIN = quản trị, GUEST = chưa đăng nhập.
- Endpoint ghi theo đường dẫn qua gateway (`/api/...`).

---

## A. Sản phẩm & Tồn kho (Admin) — `/api/products/admin`

| ID | Mô tả | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|----|-------|----------------|----------|------------------|---------|
| SP-01 | Tạo 1 sản phẩm hợp lệ | Đăng nhập ADMIN, có ≥1 category | POST `/api/products/admin` với name/slug/categoryId/status hợp lệ, price=150000, stock=10 | 200/201, sản phẩm xuất hiện trong danh sách, stock=10 | P1 |
| SP-02 | **Thêm 1000 sản phẩm** (tải trọng lớn) | ADMIN, category sẵn | Lặp POST `/api/products/admin` 1000 lần (slug duy nhất `sp-{i}`) | Tất cả tạo thành công; danh sách phân trang đúng tổng số; thời gian phản hồi không tăng đột biến; không lỗi 5xx | P1 |
| SP-03 | Phân trang khi có 1000+ sản phẩm | Đã chạy SP-02 | GET `/api/products?page=0&size=20`, rồi page cuối | `totalElements`≈1000, `totalPages` đúng, page cuối trả phần dư, không trùng/sót item | P1 |
| SP-04 | Tạo sản phẩm **giá âm** | ADMIN | POST với price = -1 | 400, `code` validation (vi phạm `@DecimalMin 0.0`), không tạo | P1 |
| SP-05 | Tạo sản phẩm **giá = 0** (ranh giới) | ADMIN | POST với price = 0 | 200/201 — price=0 hợp lệ (DecimalMin cho phép 0) | P2 |
| SP-06 | Tạo sản phẩm **tồn kho âm** | ADMIN | POST với stock = -5 | 400, validation (`@Min 0`), không tạo | P1 |
| SP-07 | Tạo sản phẩm **tồn kho = 0** | ADMIN | POST với stock = 0 | 200/201, sản phẩm tồn=0 → hiển thị "Hết hàng", không mua được | P2 |
| SP-08 | Tạo sản phẩm **tồn kho cực lớn** | ADMIN | POST với stock = 2_000_000_000 | 200/201 nếu ≤ Integer.MAX (2.147e9); stock vượt int → 400/lỗi parse | P2 |
| SP-09 | Tạo sản phẩm **thiếu tên** (name blank) | ADMIN | POST với name = "" | 400, `@NotBlank` name, không tạo | P1 |
| SP-10 | Tạo sản phẩm **thiếu slug / categoryId / status** | ADMIN | POST lần lượt bỏ trống từng field | 400 cho mỗi field bắt buộc (`@NotBlank`) | P1 |
| SP-11 | Tạo sản phẩm **trùng slug** | Đã có sản phẩm slug `abc` | POST sản phẩm mới slug `abc` | Lỗi (409/400 unique constraint), không tạo bản trùng | P1 |
| SP-12 | Tạo sản phẩm **categoryId không tồn tại** | ADMIN | POST với categoryId = UUID rác | 400/404, không tạo (FK/không hợp lệ) | P2 |
| SP-13 | Tên sản phẩm **rất dài** (>500 ký tự) | ADMIN | POST name 1000 ký tự | 400 nếu vượt giới hạn cột; nếu cho phép thì lưu/hiển thị không vỡ layout | P3 |
| SP-14 | Tên chứa **ký tự đặc biệt / emoji / Unicode VN** | ADMIN | POST name "Áo <b>💥</b> ñ" | Lưu nguyên văn, hiển thị không bị XSS (escape ở UI) | P2 |
| SP-15 | **Sửa giảm tồn kho xuống dưới số đã đặt** | Sản phẩm đã có đơn giữ chỗ | PUT `/api/products/admin/{id}` đặt stock thấp hơn lượng đang reserve | Hệ thống xử lý nhất quán (chặn hoặc cho phép nhưng không bán âm) — kiểm tra không bao giờ bán quá tồn thực | P1 |
| SP-16 | Đổi `status` sang INACTIVE | Sản phẩm ACTIVE | PATCH status=INACTIVE | Sản phẩm ẩn khỏi danh sách public `/api/products`, vẫn xem được ở admin | P2 |
| SP-17 | Xóa / vô hiệu sản phẩm đang nằm trong giỏ người khác | SP trong giỏ USER | ADMIN set INACTIVE/xóa | Checkout của USER xử lý gọn (báo SP không khả dụng), không crash | P2 |
| SP-18 | Tạo sản phẩm với `price` định dạng sai (chữ) | ADMIN | POST price = "abc" | 400 parse lỗi, thông báo rõ ràng | P3 |

---

## B. Giỏ hàng & Đặt hàng — `/api/orders`, `/api/orders/cart`

| ID | Mô tả | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|----|-------|----------------|----------|------------------|---------|
| GH-01 | Thêm SP vào giỏ (hợp lệ) | USER, SP còn hàng | Thêm SP qty=1 vào giỏ | Giỏ có item, tổng tiền đúng | P1 |
| GH-02 | **Mua số lượng lớn hơn tồn kho** | SP stock=5 | Đặt hàng qty=10 | **409 `STOCK_SHORTAGE`**, chi tiết requested=10/available=5, đơn KHÔNG tạo, tồn kho không đổi | P1 |
| GH-03 | **Mua đúng bằng tồn kho** (ranh giới) | SP stock=5 | Đặt hàng qty=5 | Đặt thành công, tồn kho về 0, SP thành "Hết hàng" | P1 |
| GH-04 | Mua **nhiều hơn tồn 1 đơn vị** (ranh giới trên) | SP stock=5 | Đặt qty=6 | 409 STOCK_SHORTAGE | P1 |
| GH-05 | Thêm vào giỏ **số lượng 0** | USER | Thêm item qty=0 | 400 validation, không thêm | P1 |
| GH-06 | Thêm vào giỏ **số lượng âm** | USER | Thêm item qty=-3 | 400 validation, không thêm | P1 |
| GH-07 | Đặt hàng khi **giỏ trống** | USER, giỏ rỗng | POST `/api/orders` | 400/409 "giỏ trống", không tạo đơn | P1 |
| GH-08 | Đặt hàng SP đã **INACTIVE / hết hàng** | SP stock=0 | Thêm + đặt | Chặn (409/400), thông báo SP không khả dụng | P1 |
| GH-09 | **Race: 2 đơn cùng mua SP còn 1 cái cuối** | SP stock=1, 2 user | Đồng thời đặt qty=1 | Đúng 1 đơn thành công, đơn còn lại 409 STOCK_SHORTAGE; tồn kho không âm | P1 |
| GH-10 | Cập nhật số lượng item trong giỏ vượt tồn | SP stock=3, giỏ có qty=2 | Sửa qty=99 | Chặn hoặc cảnh báo khi checkout (409), không cho đặt vượt tồn | P2 |
| GH-11 | Giỏ chứa **nhiều SP, 1 SP thiếu hàng** | SP A đủ, SP B stock=1 đặt 5 | Đặt cả giỏ | 409 STOCK_SHORTAGE liệt kê đúng SP B; toàn đơn rollback (không trừ SP A) | P1 |
| GH-12 | Số lượng **cực lớn** (tràn số) | USER | Đặt qty=2_147_483_648 (>int max) | 400 parse/validation, không treo | P2 |
| GH-13 | Tổng tiền đơn tính đúng với nhiều item + qty | USER | Giỏ 3 SP khác giá, qty khác nhau | `totalAmount` = Σ(price×qty) chính xác tới đồng | P1 |
| GH-14 | Đặt hàng khi **chưa chọn địa chỉ** | USER không có địa chỉ | Vào checkout đặt hàng | Chặn, yêu cầu nhập/chọn địa chỉ | P2 |
| GH-15 | Sau đặt hàng thành công, **tồn kho giảm đúng** | SP stock=10, đặt 3 | Đặt + kiểm tra lại SP | stock còn 7 (event giảm tồn qua RabbitMQ tới inventory) | P1 |
| GH-16 | Giỏ hàng **không rò rỉ giữa user** (IDOR) | 2 user có giỏ riêng | User A xem giỏ | Chỉ thấy item của A, không thấy của B | P1 |
| GH-17 | Đặt hàng với **token hết hạn** giữa chừng | USER token expired | POST đơn | 401 từ gateway, không tạo đơn | P2 |

---

## C. Coupon & Thanh toán — `/api/orders/coupons`, `/api/payments`

| ID | Mô tả | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|----|-------|----------------|----------|------------------|---------|
| CP-01 | Áp coupon PERCENT hợp lệ | Coupon -10% còn hiệu lực, đơn ≥ min | Nhập mã ở checkout | Giảm 10%, tổng tiền cập nhật đúng | P1 |
| CP-02 | Coupon **hết hạn** | Coupon expiresAt < hôm nay | Áp mã | Từ chối, báo "hết hạn", không giảm | P1 |
| CP-03 | Coupon **hết lượt dùng** | Coupon maxUses đã đạt | Áp mã | Từ chối, báo hết lượt | P1 |
| CP-04 | Đơn **dưới giá trị tối thiểu** của coupon | Coupon min=500k, đơn 100k | Áp mã | Từ chối, báo chưa đạt tối thiểu | P1 |
| CP-05 | Coupon **không tồn tại** | — | Áp mã "RAC123" | Từ chối, báo mã không hợp lệ | P1 |
| CP-06 | Coupon **chữ hoa/thường** | Coupon "SALE10" | Nhập "sale10" | Theo quy ước hệ thống (khớp hoặc rõ ràng không khớp) — nhất quán | P3 |
| CP-07 | Áp 2 lần coupon / coupon chồng | Đã áp 1 coupon | Áp thêm mã 2 | Chỉ 1 coupon áp dụng, hành vi nhất quán | P2 |
| CP-08 | Tạo coupon **giá trị âm / >100%** (admin) | ADMIN | Tạo PERCENT=150 hoặc -10 | Validation chặn giá trị vô lý | P2 |
| CP-09 | Thanh toán **COD** | Đơn hợp lệ | Chọn COD, đặt | Đơn tạo trạng thái chờ, không gọi cổng thanh toán | P1 |
| CP-10 | Thanh toán **MoMo** tạo link | Đơn hợp lệ, MoMo cấu hình | Chọn MoMo | Nhận payUrl hợp lệ, redirect sang sandbox | P2 |
| CP-11 | MoMo **IPN chữ ký sai** | — | Gửi IPN với signature giả | 400/từ chối (verify HMAC), đơn không chuyển PAID | P1 |
| CP-12 | MoMo IPN hợp lệ → đơn chuyển PAID | Đã tạo payment | Gửi IPN đúng chữ ký | Đơn cập nhật PAID, idempotent (gửi 2 lần không cộng đôi) | P1 |
| CP-13 | Giảm giá làm tổng tiền **< 0** | Coupon giảm > giá trị đơn | Áp coupon lớn | Tổng tiền sàn về 0, không âm | P2 |

---

## D. Auth & Phân quyền — `/api/users/auth`, gateway

| ID | Mô tả | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|----|-------|----------------|----------|------------------|---------|
| AU-01 | Đăng nhập đúng mật khẩu | User tồn tại | POST login | 200, trả accessToken + user | P1 |
| AU-02 | Đăng nhập **sai mật khẩu** | User tồn tại | POST login sai pass | 401, không trả token | P1 |
| AU-03 | **USER gọi endpoint ADMIN** | Đăng nhập USER | GET `/api/products/admin` | 403 `AUTH_ROLE_DENIED` (gateway chặn) | P1 |
| AU-04 | **GUEST gọi endpoint cần auth** | Chưa đăng nhập | GET `/api/orders` | 401 `AUTH_TOKEN_MISSING` | P1 |
| AU-05 | **Token hết hạn** | Token expired | Gọi API protected | 401 `AUTH_TOKEN_EXPIRED` | P1 |
| AU-06 | **Token chữ ký giả** | Token tự ký | Gọi API protected | 401 `AUTH_TOKEN_INVALID` | P1 |
| AU-07 | **Giả mạo header `X-User-Id`** | GUEST | Gửi request kèm `X-User-Id: admin` | Gateway STRIP header client; không được nâng quyền (vẫn 401) | P1 |
| AU-08 | **IDOR: xem đơn người khác** | User A có đơn, User B login | B gọi GET `/api/orders/{id của A}` | 403/404, không trả đơn của A | P1 |
| AU-09 | Đăng nhập Google ID token hợp lệ | Google cấu hình | POST `/api/users/auth/google` | 200, link theo email, trả token | P2 |
| AU-10 | Google **ID token giả / sai audience** | — | POST với token rác | 401, không cấp phiên | P1 |
| AU-11 | Đăng ký **email đã tồn tại** | Email đã dùng | POST register | 409/400, không tạo trùng | P2 |
| AU-12 | Đăng ký mật khẩu **quá yếu / sai định dạng** | — | POST register pass "123" | 400 validation | P3 |

---

## Ghi chú thực thi
- **Hàm hóa dữ liệu lớn (SP-02/03, GH-09)**: nên dùng script gọi API qua gateway (Playwright `request` hoặc REST client) thay vì thao tác UI thủ công 1000 lần.
- **Race condition (GH-09)**: cần gửi 2 request gần như đồng thời (Promise.all) để kiểm tra khóa tồn kho.
- **Mã lỗi tham chiếu**: `STOCK_SHORTAGE` (409), `AUTH_TOKEN_MISSING/EXPIRED/INVALID` (401), `AUTH_ROLE_DENIED` (403) — theo gateway + order-service hiện tại.
- Các giá trị ranh giới (0, =tồn, tồn+1, int max) là trọng tâm hồi quy mỗi lần sửa logic tồn kho/đơn hàng.
