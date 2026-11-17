# Staff API mới và proxy cùng origin

API mới: `https://ess-edu-api-920149468670.asia-southeast1.run.app/v1`.
Không cần đổi backend, database, JWT hay Cloud Tasks để thêm proxy.
GitHub Pages không có reverse proxy; Worker chạy riêng trên Cloudflare, không phải Next API Route.

## Chuyển API trước

Workflow dev và .env.example dùng API mới làm mặc định. Nếu repo có Actions Variable
`NEXT_PUBLIC_API_BASE_URL`, đổi giá trị đó sang API mới vì variable ưu tiên default.
CI vẫn dùng HTTP fixtures ở `api.example.com`, không gọi/mutate dữ liệu production.

## Bật proxy

1. Đưa DNS zone `eeslern.com` lên Cloudflare bằng account chủ domain. Copy đầy đủ DNS
   đang dùng, gồm A/CNAME/TXT/MX; đổi nameservers ở Hostinger theo Cloudflare.
2. Bật proxy (đám mây cam) cho CNAME `staff` đang trỏ GitHub Pages. Giữ HTTPS GitHub
   Pages và Cloudflare SSL mode Full (strict); không đổi Pages CNAME/domain.
3. Từ thư mục `infra/staff-api-proxy`, chạy `npx wrangler login`, sau đó
   `npx wrangler deploy`. File wrangler.toml chỉ chứa URL công khai, không có secret.
   Route chỉ `/api/*`, phần website vẫn do GitHub Pages phục vụ.
4. Xác minh `https://staff.eeslern.com/api/v1/application-settings` trả JSON; API
   được bảo vệ vẫn phải trả 401 nếu chưa có JWT. Đăng nhập kiểm tra WebSocket
   `wss://staff.eeslern.com/api/v1/events/ws` và preview/upload/Excel.
5. Chỉ sau khi proxy hoạt động, đổi Actions Variable `NEXT_PUBLIC_API_BASE_URL` thành
   `https://staff.eeslern.com/api/v1` và chạy Deploy dev to GitHub Pages trên dev.
   Người dùng đăng nhập lại vì phiên browser gắn với base URL hiện tại.

Proxy chuyển nguyên method/body/JWT/idempotency/version, không retry, không cache API,
không log payload. File stream không đọc toàn bộ vào RAM. URL API trong JSON/Location
được đổi sang cùng host; URL của storage upload được giữ để upload theo contract hiện có.
WebSocket upgrade được chuyển tiếp; không timer/worker polling. RTK Query vẫn là tầng
request duy nhất của ứng dụng. Không làm service-worker proxy giả trong browser.

Không thể tuyên bố proxy đã live chỉ vì code Worker đã commit. Cần account Cloudflare,
DNS và Worker deployment thật. Các gói Cloudflare có quota/giới hạn riêng; image/blob
và JSON không được cache chung giữa tài khoản. Cloud Run URL vẫn có thể được tìm ra
từ hạ tầng; proxy đổi host request trên browser, không thay thế backend authentication.
