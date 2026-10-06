export interface Guide { title: string; intro: string; steps: { title: string; text: string[]; illustration?: string }[] }
const step = (title: string, text: string[], illustration?: string) => ({ title, text, illustration });
const login: Guide = { title: "Đăng nhập", intro: "Truy cập đúng tài khoản do trung tâm cấp; giao diện sáng/tối và thu/phóng có thể đổi ngay tại đây.", steps: [step("ID và mật khẩu", ["Nhập ID đăng nhập và mật khẩu, dùng nút Hiện/Ẩn để kiểm tra ký tự. Nút Đăng nhập hiển thị trạng thái đang xử lý; lỗi nằm ngay trong form.", "Không lưu mật khẩu trong trình duyệt. Khi hết phiên, đăng nhập lại để tiếp tục; dữ liệu đã lưu vẫn được giữ."], "form"), step("Liên kết đăng nhập", ["Mở link do trung tâm cấp. Mã chỉ dùng một lần và có thời hạn; mã sai/hết hạn/đã dùng có nút quay lại đăng nhập.", "Đăng xuất kết thúc phiên hiện tại. Thời gian đăng nhập và thông tin thiết bị/IP phục vụ bảo mật tài khoản."])] };
const report: Guide = { title: "Báo cáo học tập", intro: "Đọc kết quả đánh giá theo Unit, đối chiếu các kỹ năng và nhận xét để biết phần cần luyện tập. Tỷ lệ điểm khác tiến độ hoàn thành khóa học.", steps: [step("Chọn lớp, học sinh và Unit", ["Chọn lớp để xem đúng lịch sử học tập. Staff chọn thêm học sinh; tab Unit dùng dữ liệu đã công bố cho học sinh đó.", "Mặc định mở Unit có thứ tự cao nhất. Đổi lớp/học sinh sẽ chọn lại Unit, tránh nhầm báo cáo. Nếu chưa công bố, màn hình báo chưa có dữ liệu."], "report"), step("Tổng quan kết quả", ["Mỗi ô ghi điểm đạt / điểm tối đa và tỷ lệ phần trăm của kỹ năng. Tổng điểm chia tổng điểm tối đa, không lấy trung bình phần trăm các kỹ năng.", "Dấu — là chưa có dữ liệu; số 0 là một kết quả đã nhập. Ngày kiểm tra thiếu được giữ là chưa có."], "report"), step("Đường kỹ năng và bảng Unit", ["Mỗi màu là một kỹ năng; trục ngang là các Unit, trục dọc là tỷ lệ điểm. Chạm hoặc rê lên node để đọc chi tiết. Đường cong đi qua đúng điểm; chỗ chưa có dữ liệu không được nối thay.", "Bấm tên kỹ năng để ẩn/hiện, hoặc Hiện tất cả để khôi phục. Chỉ thay cách xem biểu đồ, bảng và dữ liệu gốc giữ nguyên.", "Bảng điểm theo Unit giúp so sánh số liệu chính xác; trên điện thoại có thể cuộn ngang."], "chart"), step("Biểu đồ thay đổi", ["Mỗi biểu đồ so sánh hai Unit liên tiếp. Xanh là tăng, hồng là giảm; dấu +/− và tooltip thể hiện chênh lệch theo điểm phần trăm.", "Ví dụ 60% → 70% là +10 điểm phần trăm. Có thể ẩn/hiện từng biểu đồ kỹ năng hoặc tổng điểm; thiếu một mốc thì chưa tính chênh lệch."], "chart"), step("Nhận xét và lời khuyên", ["Đọc nhận xét theo kỹ năng, nhận xét tổng thể và các lời khuyên. Những phần chưa có được ghi rõ; không thay bằng nhận định tự động.", "Staff: quản lý xem báo cáo; giảng viên đang phụ trách lớp ACTIVE có thể bấm Sửa nhận xét. Form chỉ đổi nhận xét, giữ điểm/schema và lời khuyên. Lưu thành công cập nhật báo cáo học sinh và nguồn bài đánh giá khi còn khớp.", "Nếu báo xung đột, giữ nội dung đang nhập và tải phiên bản mới trước khi quyết định lưu lại. Đổi học sinh/Unit khi chưa lưu cần xác nhận."], "form")] };
const classGuide: Guide = { title: "Dashboard lớp", intro: "Tổng hợp hồ sơ lớp, tiến độ Unit, học sinh và phiên học. Lớp lịch sử vẫn xem được; quyền sửa phụ thuộc phân công hiện tại.", steps: [step("Tiến độ lớp", ["Số Unit riêng biệt đã có phiên hoàn thành / tổng Unit. Tạo phiên nháp không tăng tiến độ; nhiều phiên cùng Unit chỉ tính một lần.", "Trạng thái PAUSED/COMPLETED/INACTIVE chuyển nội dung học tập sang chỉ xem."], "report"), step("Học sinh", ["Tab Học sinh có ID, tên, biệt danh, ngày sinh và trạng thái. Bấm Báo cáo học tập ở từng bạn để mở báo cáo giống học sinh.", "Chỉnh sửa hồ sơ có validation và version; thay trạng thái quản lý cần preview ảnh hưởng. Học sinh lịch sử giữ điểm và báo cáo."], "table"), step("Phiên học", ["Tạo phiên với tên tùy ý, ngày học, Unit và ghi chú. Chọn phiên để quản lý nhiều bài đánh giá PROGRESS_TRACKING/FINAL_TEST.", "Giảng viên chỉ tạo/sửa trên lớp đang phụ trách. Quản lý thuần và không gian Quản lý chỉ xem nghiệp vụ học tập."], "workflow")] };
const assessment: Guide = { title: "Bài đánh giá và schema", intro: "Cấu hình các kỹ năng, nhập điểm rồi công bố báo cáo cho học sinh. Final test dùng cùng quy tắc điểm.", steps: [step("Cấu hình kỹ năng", ["Chọn một hoặc nhiều kỹ năng. Mỗi kỹ năng có số câu/điểm tối đa nguyên dương, thứ tự và tùy chọn thập phân.", "Ví dụ Speaking 2.1 / 4 cần bật thập phân. Khi schema đã có điểm, đọc ảnh hưởng và xác nhận; xử lý điểm vượt giới hạn mới trước khi lưu."], "form"), step("Nhập và hoàn thành", ["Mở Bảng nhập nhanh hoặc form từng học sinh. Có thể lưu nháp với ô trống, nhưng để hoàn thành phải nhập đủ phần hoặc đánh dấu vắng.", "Hoàn thành khóa sửa điểm/schema. Chuyển về nháp cần gỡ công bố trước nếu bài đã được công bố."], "table"), step("Công bố báo cáo", ["Hoàn thành chưa tự hiển thị cho học sinh. Bấm Công bố để tạo báo cáo Unit; một Unit chỉ có một nguồn công bố.", "Gỡ công bố để sửa điểm/schema, sau đó hoàn thành và công bố lại. Nhận xét trên báo cáo có thể sửa riêng bởi giảng viên đang phụ trách, giữ điểm và nguồn khớp."], "workflow")] };
const scores: Guide = { title: "Nhập điểm học sinh", intro: "Điểm, nhận xét kỹ năng và lời khuyên dùng chung giữa bảng và form từng học sinh.", steps: [step("Học sinh và tham gia", ["Chọn đúng học sinh. PRESENT = tham gia, ABSENT = vắng, UNSET = chưa xác nhận. Vắng không tự tạo điểm 0; đổi sang vắng khi có điểm cần xác nhận."], "table"), step("Các phần kỹ năng", ["Nhập điểm 0 đến tối đa; chỉ dùng thập phân nếu schema cho phép. Mỗi kỹ năng có Điểm → Nhận xét → Lời khuyên.", "Ô trống lưu null và còn thiếu; 0 được giữ là điểm hợp lệ. Tỷ lệ = điểm / tối đa × 100, hiển thị làm tròn 1 chữ số."], "table"), step("Tổng và lưu", ["Tổng điểm cộng các kỹ năng, rồi chia tổng tối đa; không trung bình tỷ lệ. Tổng tạm tính ghi số phần đã nhập / tổng phần.", "Bảng chỉ lưu các dòng đã sửa, lỗi ở từng cell/dòng; cuộn ngang và Tab/Shift+Tab để nhập. Form có Lưu và Lưu & học sinh tiếp theo.", "Trên mobile ưu tiên form từng bạn. Lỗi/version conflict giữ form; rời trang chưa lưu có cảnh báo."], "form")] };
const imports: Guide = { title: "Import Excel điểm", intro: "Dùng template đúng lớp, phiên, bài đánh giá và schema hiện tại; xem trước rồi xác nhận.", steps: [step("Tải mẫu và nhập", ["File có Scores, Schema, Instructions. Scores điền sẵn học sinh; không đổi student_id. Nhập attended, điểm, nhận xét, lời khuyên; giữ tiếng Việt/xuống dòng.", "Cột tổng chỉ để đọc; hệ thống tính lại khi import. Không dùng template bài khác hoặc schema cũ."], "table"), step("Xem trước", ["Chọn .xlsx, kiểm tra lỗi theo dòng/cột: ID, tham gia, giới hạn điểm, thập phân, schema/version. Tải danh sách lỗi để sửa.", "Mặc định ô trống giữ dữ liệu cũ; 0 vẫn cập nhật. Xóa dữ liệu cần chọn chế độ rõ ràng và xác nhận."], "form"), step("Xác nhận", ["Chỉ lưu khi hết lỗi. Backend kiểm tra lại và commit nguyên tử; xung đột yêu cầu preview lại. Lặp yêu cầu cùng khóa không ghi hai lần.", "Nhập thành công cập nhật bảng điểm; hoàn thành/công bố báo cáo là bước riêng."], "workflow")] };
const management: Guide = { title: "Quản lý danh sách", intro: "Tìm kiếm, lọc, phân trang và quản lý hồ sơ; các thao tác ảnh hưởng quan hệ đều cần xem trước.", steps: [step("Phạm vi và lựa chọn", ["Tìm tên/ID, lọc trạng thái; danh sách lớn có phân trang và scroll ngang. Chọn các dòng trên trang hoặc Toàn bộ kết quả filter; kiểm tra số lượng/phạm vi.", "Học sinh, giảng viên, lớp, tài khoản và nhãn có ID ổn định. Nhãn phân công không cấp quyền sửa lớp."], "table"), step("Thêm và cập nhật", ["Thêm từng hồ sơ: nhập họ tên để gợi ý ID. Có thể chỉnh ID và kiểm tra trùng. Vũ Quốc Việt → vq.viet; ID trùng thêm số.", "Lớp tự cấp ess21, ess22…; chỉnh hậu tố tên, không đổi số lớp. Tổng Unit không được nhỏ hơn Unit đã dùng.", "Bảng/Excel hỗ trợ nhiều dòng và preview. Tài khoản tạo cùng hồ sơ ở PENDING, cấp link kích hoạt dùng một lần; không xuất mật khẩu/token."], "form"), step("Thay trạng thái và bulk", ["Bulk chỉ đổi trường đã chọn. Đọc trước/sau, lớp và phân công bị ảnh hưởng, nhập lý do và đủ xác nhận rồi commit.", "Ngừng hồ sơ kết thúc quan hệ hiện tại nhưng giữ điểm/lịch sử. Khôi phục không tự khôi phục phân công/ghi danh. Không được làm mất quản lý hoạt động cuối cùng."])] };
const profile: Guide = { title: "Hồ sơ và quan hệ", intro: "Xem thông tin hiện tại, tài khoản liên kết, lớp và lịch sử; tách trạng thái hồ sơ khỏi trạng thái tài khoản.", steps: [step("Thông tin hồ sơ", ["Chỉnh sửa tên, liên hệ, ghi chú, trạng thái; ID ổn định giữ nguyên. Thay trạng thái phải xem trước ảnh hưởng và xác nhận.", "Lớp có tiến độ theo Unit riêng biệt, tổng Unit và các quan hệ. Nội dung học tập cho quản lý là chỉ xem."], "form"), step("Phân công / ghi danh", ["Phân công có nhiều giảng viên, nhãn theo từng lớp và các giai đoạn lịch sử. Thêm người mới giữ người cũ; phân công lại cần xác nhận riêng.", "Từ lớp/học sinh, dùng Báo cáo học tập để xem kết quả đã công bố. Để sửa nhận xét, chuyển không gian Giảng viên và có phân công hợp lệ."] ,"workflow"), step("Tài khoản và phiên", ["PENDING chờ kích hoạt, ACTIVE được đăng nhập, LOCKED bị chặn. Cấp lại link vô hiệu hóa mã cũ; mã có hạn và dùng một lần.", "Phiên đăng nhập: đặt năm/tháng/ngày/giờ/phút, lớn hơn 0 và tối đa 10 năm; áp dụng lần đăng nhập tiếp theo. Buộc kết thúc phiên cần lý do; tài khoản có MANAGER được bảo vệ.", "Lịch sử hiển thị lần đăng nhập thành công, thời gian Việt Nam và thiết bị/IP khi ghi nhận được. IP có thể là proxy; vị trí chính xác chưa xác định."])] };
const grid: Guide = { title: "Nhập hồ sơ bằng bảng / Excel", intro: "Tạo mới hoặc cập nhật nhiều học sinh/giảng viên với cùng quy tắc hồ sơ và quyền.", steps: [step("Chọn nhóm và chế độ", ["CREATE: chỉ họ tên bắt buộc; ID trống tự sinh, ID trùng thêm số trong preview. UPDATE: cần ID hồ sơ đã có, ô trống giữ dữ liệu cũ.", "Tải template riêng đúng nhóm. Workbook có Data, Schema, Instructions; ví dụ nằm trong hướng dẫn, không nhập thành hồ sơ."], "table"), step("Nhập và kiểm tra", ["Có thể dán vùng ô từ Excel, thêm dòng và Xóa dòng. Dòng hoàn toàn trống được bỏ qua; xóa dòng đã có dữ liệu cần xác nhận.", "Ngày sinh YYYY-MM-DD; vai trò TEACHER, MANAGER hoặc TEACHER|MANAGER. Tạo tài khoản TRUE/FALSE; tài khoản mới chờ kích hoạt. Không tự phân công/ghi danh lớp."], "table"), step("Xem trước và lưu", ["Preview hiển thị ID cuối cùng, trước/sau, lỗi dòng/cột và ảnh hưởng trạng thái/quyền. Tải danh sách lỗi để sửa; chưa hết lỗi chưa được lưu.", "Nhập lý do, xác nhận đủ ảnh hưởng rồi lưu. Khi dữ liệu đã đổi, xem trước lại; lỗi giữ dữ liệu nhập. Excel export theo phạm vi chọn/filter, không chứa mật khẩu/token."], "form")] };
export function pageGuide(pathname: string, entity: string | null, workspace?: string | null): Guide {
  if (pathname.includes("/materials"))
    return {
      title: "Kho tài liệu",
      intro: "Duyệt, chọn và xem file; lựa chọn được giữ qua các thư mục.",
      steps: [
        step(
          "Mở thư mục hoặc cây",
          [
            "Nhấn icon thư mục để mở các mục con. Chuyển Cây thư mục để mở từng nhánh. Breadcrumb và Quay lại giúp về cấp cha.",
            "Tìm tên, chọn phạm vi hiện tại/toàn kho; dùng loại file và sắp xếp để thu hẹp kết quả.",
          ],
          "workflow",
        ),
        step(
          "Chọn và xem",
          [
            "Checkbox chọn file, thumbnail mở bản xem. File đã chọn có viền và nền đậm; danh sách lựa chọn cho phép bỏ từng file hoặc tất cả.",
            "Trong picker, thư mục chỉ điều hướng. Nút Thêm đưa toàn bộ file đang chọn vào bài đăng.",
          ],
          "table",
        ),
        step(
          "Upload và quản lý",
          [
            "Chọn nhiều file, chọn storage theo loại, theo dõi tiến trình và hủy/thử lại từng file. File chỉ khả dụng sau khi API xác minh.",
            "Giảng viên đổi tên file mình đăng và gửi yêu cầu xóa. Quản lý tạo/sửa thư mục, di chuyển file, xem nhật ký và duyệt ảnh hưởng.",
          ],
          "form",
        ),
      ],
    };
  if (pathname.includes("/storages"))
    return {
      title: "Storage",
      intro: "Theo dõi dung lượng các nhóm tài liệu.",
      steps: [
        step(
          "Đọc dung lượng",
          [
            "Tổng/đã dùng/giữ chỗ/còn lại đều tính bằng byte. Các mốc 30%, 60%, 80%, 95% đổi màu và nhãn.",
            "Ngừng file không xóa vật lý, nên không tự giải phóng dung lượng. Kiểm tra storage gần đầy trước khi upload.",
          ],
          "chart",
        ),
      ],
    };
  if (pathname.includes("/deletion-requests"))
    return {
      title: "Duyệt xóa",
      intro: "Ngừng tài liệu có kiểm tra các bài đang sử dụng.",
      steps: [
        step(
          "Kiểm tra ảnh hưởng",
          [
            "Mở từng post/phiên học liên quan trước khi duyệt. Chọn giữ liên kết không khả dụng hoặc gỡ liên kết và nhập lý do.",
            "Từ chối hoặc duyệt chỉ cập nhật trạng thái mềm; file và nhật ký vẫn được giữ.",
          ],
          "workflow",
        ),
      ],
    };
  if (pathname.includes("/notifications"))
    return {
      title: "Thông báo",
      intro: "Thông báo thuộc tài khoản và lớp còn được phép truy cập.",
      steps: [
        step(
          "Lọc và xử lý",
          [
            "Lọc loại hoặc đã đọc/chưa đọc. Mở nội dung để tới đối tượng, đánh dấu từng thông báo hoặc đọc tất cả.",
            "Ẩn thông báo là xóa mềm. Số chưa đọc tự làm mới khi đang dùng portal.",
          ],
          "table",
        ),
      ],
    };
  if (pathname.includes("/reports")) return report;
  if (pathname.includes("/manage/grid") || pathname.includes("/manage/excel")) return grid;
  if (pathname.includes("/manage/profile")) return { ...profile, title: `Hồ sơ ${entity === "teachers" ? "giảng viên" : entity === "classes" ? "lớp học" : entity === "accounts" ? "tài khoản" : entity === "labels" ? "nhãn" : "học sinh"}` };
  if (pathname.includes("/manage/list")) return management;
  if (pathname.includes("/manage/warnings")) return { title: "Lớp cần xử lý", intro: "Cảnh báo lớp đang học chưa có giảng viên phụ trách hợp lệ.", steps: [step("Đọc cảnh báo", ["Lớp còn một giảng viên hợp lệ khác không bị coi là trống. Cảnh báo chỉ hết khi đã có phân công hợp lệ hoặc lớp không còn đang học."], "table"), step("Xử lý", ["Mở hồ sơ lớp để phân công/xác nhận giảng viên, hoặc thay trạng thái đúng nghiệp vụ với lý do và preview. Nhãn không thay thế phân công ACTIVE."])] };
  if (pathname.includes("/manage/audit")) return { title: "Nhật ký thay đổi", intro: "Đối chiếu ai thay đổi, thời gian, đối tượng và lý do; giữ lịch sử hệ thống.", steps: [step("Tìm và đọc", ["Lọc/tìm trong nhật ký, xem hành động và ID liên quan. Nhật ký không cho xóa dữ liệu hoặc xuất mật khẩu/token."], "table"), step("Tác vụ nền", ["IN_PROGRESS đang xử lý; DONE đã lưu, FAILED chưa hoàn tất. Thông báo tự cập nhật dữ liệu liên quan; nếu lỗi, mở lại form để kiểm tra trước khi gửi."])] };
  if (pathname.includes("/student-score") || pathname.includes("/scores")) return scores;
  if (pathname.includes("/assessment")) return assessment;
  if (pathname.includes("/import")) return imports;
  if (pathname.includes("/session"))
    return {
      ...assessment,
      title: "Phiên học",
      steps: [
        step(
          "Tài liệu và trao đổi",
          [
            "Tab Tài liệu có bài đăng theo phiên, file theo nhóm Bài học/Hướng dẫn/Audio, tương tác và bình luận.",
            "Giảng viên đang phụ trách lớp ACTIVE tạo/sửa bài. Chọn file từ kho hoặc upload trực tiếp, rồi lưu nháp/công bố. Chuyển tab giữ bản nháp và cuộn.",
          ],
          "workflow",
        ),
        step(
          "Thông tin phiên",
          [
            "Tên phiên, ngày học, Unit liên quan và ghi chú mô tả buổi học. Phiên nháp không tăng tiến độ; nhiều phiên hoàn thành cùng Unit không được đếm trùng.",
          ],
          "form",
        ),
        step(
          "Bài đánh giá",
          [
            "Tạo nhiều bài PROGRESS_TRACKING hoặc FINAL_TEST, đặt tên dễ nhận biết. Mở bài để cấu hình kỹ năng, nhập điểm và công bố.",
          ],
          "workflow",
        ),
        ...assessment.steps.slice(1),
      ],
    };
  if (pathname.includes("/class")) return classGuide;
  if (pathname.includes("/activate")) return { ...login, title: "Kích hoạt tài khoản", steps: [step("Đặt mật khẩu", ["Mở link còn hạn, nhập mật khẩu mới và xác nhận khớp; kiểm tra hướng dẫn độ dài trên form.", "Link chỉ dùng một lần. Mã sai/hết hạn/đã dùng: liên hệ quản lý cấp lại. Thành công quay về đăng nhập."], "form")] };
  if (pathname.includes("/home")) return workspace === "manager" ? { title: "Tổng quan quản lý", intro: "Theo dõi quy mô hiện tại, tiến độ Unit và lớp cần xử lý.", steps: [step("Chỉ số hiện tại và thời gian", ["Số học sinh/giảng viên hoạt động và lớp theo trạng thái là ảnh chụp hiện tại. Chỉ số theo khoảng thời gian dùng phạm vi được ghi trên màn hình; không trộn hai cách tính."], "report"), step("Lọc và biểu đồ", ["Chọn thời gian, lớp, trạng thái để thu hẹp phạm vi. Tiến độ Unit là Unit riêng biệt hoàn thành / tổng Unit, có mẫu số rõ ràng.", "Bảng lớp cần xử lý dẫn tới hồ sơ lớp/phân công. Xuất thống kê giữ đúng phạm vi filter."], "chart"), step("Đi đến nghiệp vụ", ["Menu quản lý mở hồ sơ/lớp/tài khoản/nhãn/cảnh báo/nhật ký. Nội dung học tập chỉ xem; tài khoản hai vai trò chuyển Giảng viên để sửa lớp đang phụ trách."])] } : { title: "Danh sách lớp giảng viên", intro: "Lớp đang phụ trách và lịch sử giảng dạy; tìm đúng lớp trước khi nhập điểm hoặc xem báo cáo.", steps: [step("Tìm lớp", ["Tìm tên/mã lớp, lọc trạng thái và phân trang. Mỗi dòng có lịch, số học sinh, tiến độ Unit và trạng thái."], "table"), step("Mở lớp", ["Bấm tên lớp để xem dashboard, học sinh, phiên và báo cáo. Lớp không còn phụ trách hoặc không ACTIVE chỉ xem; phân công và vai trò quyết định quyền sửa."])] };
  return login;
}
