export interface IntroductionMedia {
  materialId: string;
  name: string;
  mimeType: string;
}
export interface IntroductionContent {
  texts: Record<string, string>;
  media: Record<string, IntroductionMedia>;
  grades: string[];
}
export interface IntroductionPage {
  content: IntroductionContent;
  version: number;
  publishedAt: string | null;
  published?: boolean;
}
export interface Registration {
  parentName: string;
  phone: string;
  studentName: string;
  grade: string;
  consent: boolean;
  website: string;
  requestKey: string;
}
export const defaultTexts: Record<string, string> = {
  brand: "EES EDU",
  navAbout: "Về EES",
  navClasses: "Lớp học",
  navApp: "Ứng dụng EES",
  login: "Đăng nhập",
  register: "Đăng ký học",
  explore: "Khám phá EES",
  heroLabel: "CÙNG CON HỌC HỎI, MỖI NGÀY",
  heroTitle: "Vững tiếng Anh.\nTự tin mỗi ngày.",
  heroDescription:
    "Một hành trình học tập kết nối lớp học, luyện tập và sự đồng hành của gia đình.",
  heroFootnote:
    "Lộ trình rõ ràng · Thực hành thường xuyên\nPhụ huynh dễ dàng theo dõi",
  heroCaption: "Ảnh minh họa lớp học",
  aboutLabel: "VỀ EES",
  aboutTitle: "Một môi trường để con\nhọc hỏi và tự tin hơn.",
  aboutDescription:
    "EES kết hợp hoạt động trên lớp với công cụ theo dõi học tập. Con được thực hành, phụ huynh nắm được tiến độ, giảng viên có thông tin để hỗ trợ phù hợp.",
  benefit1Number: "01",
  benefit1Title: "Học có định hướng",
  benefit1Description:
    "Các Unit giúp con hình dung nội dung đang học và từng bước tiếp theo.",
  benefit2Number: "02",
  benefit2Title: "Thực hành để ghi nhớ",
  benefit2Description:
    "Bài tập, hoạt động nghe nói và phản hồi giúp việc học tiếp tục sau giờ lên lớp.",
  benefit3Number: "03",
  benefit3Title: "Đồng hành cùng gia đình",
  benefit3Description:
    "Báo cáo và thông báo giúp phụ huynh theo dõi, hỗ trợ con đúng lúc.",
  galleryLabel: "KHÔNG GIAN HỌC TẬP",
  galleryTitle: "Những giờ học\nđầy tương tác.",
  galleryDescription: "Khám phá, trao đổi và cùng nhau thực hành tiếng Anh.",
  galleryOneCaption: "Học cùng giảng viên",
  galleryTwoCaption: "Luyện tập qua hoạt động",
  galleryFootnote:
    "Ảnh minh họa · Nội dung hình ảnh được dùng để trình bày thiết kế.",
  appLabel: "ỨNG DỤNG EES",
  appTitle: "Việc học của con,\nđược kết nối rõ ràng.",
  appBenefit1: "✓  Theo dõi tiến độ theo từng Unit.",
  appBenefit2: "✓  Xem tài liệu, làm và nộp bài tập.",
  appBenefit3: "✓  Theo dõi lịch học, điểm danh và thông báo.",
  appBenefit4: "✓  Ghi nhận nỗ lực qua điểm thưởng và đổi quà.",
  previewBrand: "EES EDU",
  previewTitle: "Hành trình học tập",
  previewUnit: "Tiếng Anh · Unit 3",
  previewProgress: "Tiến độ và phản hồi",
  previewProgressNote: "Bài học · Bài tập · Kết quả",
  previewLink1: "Tài liệu học tập  →",
  previewLink2: "Bài tập của con  →",
  previewLink3: "Điểm thưởng & quà  →",
  previewFootnote: "Giao diện minh họa",
  faqLabel: "TRƯỚC KHI ĐĂNG KÝ",
  faqTitle: "Phụ huynh thường hỏi",
  faq1Question: "Chọn lớp cho con như thế nào?",
  faq1Answer:
    "EES sẽ trao đổi về độ tuổi, nền tảng và mục tiêu học để tư vấn lựa chọn phù hợp.",
  faq2Question: "Tôi có thể theo dõi việc học trên app không?",
  faq2Answer:
    "Phụ huynh có thể theo dõi thông tin học tập qua tài khoản học sinh trên EES.",
  faq3Question: "Gửi form có phải là xác nhận nhập học không?",
  faq3Answer:
    "Form là yêu cầu tư vấn. EES sẽ liên hệ trao đổi trước khi xác nhận việc học.",
  formLabel: "BẮT ĐẦU CÙNG EES",
  formTitle: "Đăng ký học tại EES",
  formDescription:
    "Để lại thông tin, EES sẽ liên hệ tư vấn lộ trình phù hợp cho con.",
  parentLabel: "Họ tên phụ huynh *",
  parentPlaceholder: "Nhập họ và tên",
  phoneLabel: "Số điện thoại *",
  phonePlaceholder: "Số điện thoại liên hệ",
  studentLabel: "Họ tên học sinh *",
  studentPlaceholder: "Tên của con",
  gradeLabel: "Lớp đang học",
  gradePlaceholder: "Chọn lớp",
  consent: "Tôi đồng ý để EES liên hệ tư vấn theo thông tin đã cung cấp.",
  formSubmit: "Gửi đăng ký tư vấn",
  privacy: "Thông tin chỉ được dùng để liên hệ tư vấn học tập.",
  successTitle: "Đã gửi thông tin đăng ký",
  successMessage:
    "Cảm ơn phụ huynh đã quan tâm đến EES. Thông tin đã được ghi nhận để tư vấn lộ trình học phù hợp cho con.",
  successClose: "Đóng",
  privacyTitle: "Thông tin đăng ký được sử dụng thế nào?",
  privacyDescription:
    "Thông tin phụ huynh và học sinh được dùng để liên hệ, tìm hiểu nhu cầu và tư vấn lớp học. Việc gửi form chưa phải xác nhận nhập học.",
  privacyClose: "Đã hiểu",
  footerTagline: "Cùng con học hỏi, mỗi ngày.",
  footerCopyright: "© EES EDU · Giới thiệu · Đăng ký học",
  brochureLabel: "Thông tin khóa học",
  metaTitle: "EES EDU · Cùng con học hỏi, mỗi ngày",
  metaDescription:
    "Khám phá môi trường học tiếng Anh tại EES và đăng ký tư vấn lộ trình phù hợp cho con.",
};
export const defaultContent: IntroductionContent = {
  texts: defaultTexts,
  media: {},
  grades: [
    "Mầm non",
    ...Array.from({ length: 12 }, (_, i) => `Lớp ${i + 1}`),
    "Khác",
  ],
};
export const resolveContent = (
  value: IntroductionContent,
): IntroductionContent => ({
  ...value,
  texts: { ...defaultTexts, ...value.texts },
});
export const mediaPath = (id: string, base = "/api/v1") =>
  `${base}/introduction/media/${encodeURIComponent(id)}`;
