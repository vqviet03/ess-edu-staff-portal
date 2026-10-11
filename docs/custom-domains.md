# eeslern.com và staff.eeslern.com

Học sinh: https://eeslern.com → vqviet03/ess-edu-portal.
Staff: https://staff.eeslern.com → vqviet03/ess-edu-staff-portal.
API vẫn là Cloud Run hiện có, không đổi hostname của API hoặc Cloud Tasks/PubSub.

## 1. DNS tại nhà cung cấp tên miền
Thêm bản ghi sau (TTL Auto hoặc 300). Thay bản ghi A/CNAME xung đột của @ và staff; không xóa MX/TXT email. Với Cloudflare đặt DNS only, chưa bật proxy.

| Loại | Tên/Host | Giá trị |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | vqviet03.github.io |
| CNAME | staff | vqviet03.github.io |

Không nhập repo path hoặc https:// vào giá trị DNS. Không dùng wildcard CNAME.

Nên xác minh sở hữu domain trong GitHub → Settings tài khoản → Pages → Add a domain → eeslern.com và thêm TXT đúng mã GitHub cung cấp. Mã xác minh riêng cho tài khoản, không thể tự đoán.

## 2. CORS cho API (làm trước khi mở domain cho người dùng)
Cloud Run → ess-edu-portal-api → Edit & deploy new revision → Variables & Secrets. Giữ các secret/biến hiện có, đặt biến thường:

Cors__AllowedOrigins__0=https://vqviet03.github.io
Cors__AllowedOrigins__1=https://eeslern.com
Cors__AllowedOrigins__2=https://staff.eeslern.com
Frontend__BaseUrl=https://eeslern.com

Origin không có đường dẫn hoặc dấu / cuối. Không dùng *. Không thay Api__PublicBaseUrl hoặc cấu hình Cloud Tasks/PubSub. Deploy revision. Backend PR có các default tương ứng; environment hiện có vẫn override appsettings, vì vậy cần kiểm tra biến Cloud Run.
Không cần migration hoặc Job mới.

## 3. GitHub Pages và build frontend
Merge PR frontend vào dev theo quy trình review đang dùng.
- Repo ess-edu-portal → Settings → Pages → Custom domain: eeslern.com → Save.
- Repo ess-edu-staff-portal → Settings → Pages → Custom domain: staff.eeslern.com → Save.

Chờ DNS check thành công. Artifact cũ dùng repo path nên phải build/deploy lại sau khi lưu domain.
Hai workflow lấy basePath từ actions/configure-pages: custom domain → chuỗi rỗng, project Pages → /repo. File public/CNAME đi vào out/.

Học sinh: Actions → Deploy GitHub Pages → Run workflow → dev.
Staff: sau khi domain được lưu, Actions → Deploy dev to GitHub Pages → Run workflow → dev (workflow mới hỗ trợ chạy lại thủ công).
Chỉ dev được deploy. PR checks không deploy.

Khi chứng chỉ đã cấp, bật Enforce HTTPS cho cả hai repo. Việc cấp chứng chỉ/DNS có thể cần chờ. GitHub token hiện tại có thể không có quyền sửa Pages; dùng giao diện bằng tài khoản sở hữu repo.

## 4. Kiểm tra
- Mở trực tiếp và reload /login/, /home/, /materials/ của từng domain.
- Kiểm tra CSS/JS/assets chạy từ /_next/, không bị gắn /ess-edu-portal hoặc /ess-edu-staff-portal.
- Đăng nhập ID/password, đăng nhập link với fragment code, gọi API và socket trên domain mới.
- DevTools không có lỗi CORS. API chưa đổi endpoint.
- Kiểm tra HTTPS và đường dẫn tài liệu có auth.

Nếu tên miền chưa có nameserver/DNS công khai, hoàn tất đăng ký và kích hoạt nameserver tại nhà cung cấp trước.
