Để xây dựng một hệ thống mang tính "Enterprise" (quy mô doanh nghiệp) với logic tài chính chặt chẽ như thế này, việc lên danh sách tính năng và lộ trình phát triển là vô cùng quan trọng. Nếu đi sai thứ tự (ví dụ: làm Frontend trước khi Sổ cái Backend ổn định), bạn sẽ phải đập đi xây lại rất nhiều.

Dưới đây là **Tổng hợp chức năng (Feature List)** và **Lộ trình thực thi (Roadmap)** được thiết kế tối ưu nhất để bạn làm việc một cách trơn tru từ đầu đến cuối.

---

### PHẦN 1: TỔNG HỢP TÍNH NĂNG (FEATURE BREAKDOWN)

Hệ thống sẽ được chia thành 4 cổng hiển thị (Portals) dành cho 4 nhóm đối tượng khác nhau:

#### 1. Public Portal (Dành cho Khách vãng lai & Nhà hảo tâm)
* **Trang chủ & Danh sách chiến dịch:** Hiển thị các chiến dịch đang kêu gọi, thanh tiến trình (Progress bar), số tiền mục tiêu, số tiền đã đạt.
* **Quyên góp (Donation):** Tích hợp cổng thanh toán (hoặc Mock/giả lập Momo, VNPay) để nạp tiền vào quỹ.
* **Bảng sao kê minh bạch (Real-time Statement):** * Xem tổng quyên góp, tổng giải ngân, số dư tồn quỹ theo thời gian thực.
    * Tra cứu dòng chảy Sổ cái (Ai nạp, ai rút, tiền đi đâu).
    * Tra cứu chứng từ/hóa đơn giải ngân đính kèm của tình nguyện viên.
* **Trang cá nhân của Donor:** Xem lịch sử các lần đóng góp của chính mình.

#### 2. Volunteer Portal (Dành cho Tình nguyện viên/Người thụ hưởng)
* **Đăng ký & KYC:** Upload CCCD, quét khuôn mặt, điền thông tin ngân hàng để được Admin duyệt trở thành TNV hợp lệ.
* **Gửi yêu cầu giải ngân (Tạm ứng):** Xin tiền từ một chiến dịch cụ thể để đi mua đồ cứu trợ.
* **Quản lý chứng từ (Hoàn ứng):** Upload hình ảnh hóa đơn, hình ảnh trao tặng thực tế.
* **Ký số xác nhận:** Xác nhận chịu trách nhiệm pháp lý cho các chứng từ đã tải lên.

#### 3. Admin Dashboard (Dành cho Ban Quản trị)
* **Quản lý người dùng:** Phê duyệt KYC cho TNV, phân quyền (Role) cho các tài khoản.
* **Quản lý chiến dịch:** Tạo mới, thiết lập trạng thái (Mở/Đóng), chọn loại hình (Flexible/Fixed).
* **Duyệt giải ngân:** Xem xét yêu cầu xin tiền của TNV, quyết định xuất quỹ (tạo biến động Sổ cái).
* **Duyệt chứng từ:** Kiểm tra tính hợp lệ của hóa đơn do TNV gửi về để "xóa nợ" tạm ứng.

#### 4. Auditor Dashboard (Dành cho Ban Kiểm soát)
* **Cảnh báo hệ thống (Alerts):** Nhận thông báo tự động nếu Sổ cái bị lệch số dư hoặc Hash-chain bị đứt (do có ai đó can thiệp DB).
* **Audit Trail (Nhật ký hệ thống):** Xem toàn bộ lịch sử thao tác của Admin (ai duyệt tiền, duyệt lúc mấy giờ).
* **Gắn cờ (Flagging):** Đánh dấu các giao dịch đáng ngờ hoặc chứng từ giải ngân có dấu hiệu làm giả để yêu cầu Admin giải trình.

---

### PHẦN 2: LỘ TRÌNH THỰC THI (ROADMAP TỪ SỐ 0 ĐẾN HOÀN THÀNH)

Nguyên tắc vàng: **"Xây móng Database và Logic tài chính trước, dựng giao diện sau."**

#### Bước 1: Khởi tạo & Môi trường (Week 1)
* **Backend:** Khởi tạo dự án bằng Node.js (khuyến nghị dùng **NestJS** vì kiến trúc Module của nó rất hợp với dự án lớn, hoặc Express.js nếu bạn quen tay hơn).
* **Frontend:** Khởi tạo dự án bằng **Next.js** hoặc **React** (kết hợp TailwindCSS để dựng UI nhanh).
* **Database:** Cài đặt PostgreSQL. Cấu hình ORM (Prisma hoặc TypeORM).
* **Storage:** Tạo tài khoản Cloudinary hoặc AWS S3 để chuẩn bị chỗ lưu ảnh hóa đơn.

#### Bước 2: Thiết kế & Ràng buộc Database (Trái tim hệ thống - Week 2)
* Chạy các script tạo bảng (Tables) như đã thống nhất (Users, Campaigns, Sổ cái...).
* **Nhiệm vụ khó nhất:** Viết các `Database Triggers` trong PostgreSQL để:
    * Tự động tính toán chuỗi Hash (SHA-256) mỗi khi có dòng lệnh `INSERT` vào Sổ cái.
    * Chặn đứng (Block) mọi lệnh `UPDATE` hoặc `DELETE` tác động lên bảng Sổ cái.
    * Tự động cập nhật `balance` của các "Ví" (Accounts) khi Sổ cái có giao dịch mới.

#### Bước 3: Phát triển Backend Core APIs (Week 3)
* **Auth Module:** Đăng ký, Đăng nhập (JWT), Phân quyền (Guard/Middleware kiểm tra Role Admin/Auditor).
* **Campaign Module:** API CRUD cho chiến dịch.
* **User/KYC Module:** API upload ảnh CCCD và đổi trạng thái tài khoản.

#### Bước 4: Xây dựng Logic Dòng tiền (Financial Flows - Week 4)
* **Donation Flow:** API nhận tiền đóng góp -> Tự động gọi hàm ghi Sổ cái (1 dòng Nợ, 1 dòng Có).
* **Disbursement Flow:** API xử lý vòng đời: Yêu cầu -> Admin Duyệt -> Ghi Sổ cái xuất tiền -> TNV nộp chứng từ -> Admin duyệt chứng từ.
* *Lưu ý:* Test cực kỳ kỹ các API này bằng Postman. Đảm bảo tổng Nợ luôn bằng tổng Có và Chuỗi Hash không bị gãy.

#### Bước 5: Viết Cron Job & Đối soát tự động (Week 5)
* Viết các Background Jobs (dùng Node-cron hoặc BullMQ) chạy mỗi đêm lúc 12h:
    * Quét lại toàn bộ Hash-chain xem có hợp lệ không.
    * Cộng lại lịch sử Giao dịch xem có khớp với Số dư hiện tại không.
    * Nếu sai lệch, lưu vào bảng `reconciliation_logs` để Auditor check.

#### Bước 6: Phát triển Frontend (Week 6 & 7)
Lúc này API đã chạy hoàn hảo, việc làm FE sẽ rất nhàn.
* **Admin/Auditor:** Dựng layout Dashboard (Ant Design hoặc MUI), ráp API quản lý chiến dịch, duyệt tiền, xem log hệ thống.
* **Public/Donor:** Dựng trang chủ, trang chi tiết chiến dịch (hiển thị Progress Bar xịn xò như MoMo), trang Sao kê trực tuyến.
* **Volunteer:** Màn hình upload hóa đơn, xem danh sách tiền đang tạm ứng.

#### Bước 7: Kiểm thử & Triển khai (Week 8)
* **Kiểm thử:** Đóng vai Hacker, cố tình chọc thẳng vào DB (PGAdmin) sửa số tiền xem Trigger có chặn lại không, hoặc xem màn hình Auditor có báo động đỏ không.
* **Deploy Backend:** Render.com hoặc AWS EC2, set up PostgreSQL thực tế (Supabase hoặc Neon RDS).
* **Deploy Frontend:** Vercel hoặc Netlify.

---

Với lộ trình này, bạn sẽ tránh được rủi ro "Code đến đâu, sửa DB đến đó". Bạn có muốn chúng ta bắt đầu ngay bằng việc viết các đoạn **Mã SQL (Triggers & Hàm Hash) cho PostgreSQL** ở Bước 2, để khóa chặt Sổ cái bảo mật ngay từ tầng Database không?