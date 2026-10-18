export interface PortalBranding {
  name: string;
  foreground: string;
  background: string;
  iconSvg?: string | null;
}
export interface PortalBrandings {
  student: PortalBranding;
  staff: PortalBranding;
}
export interface NotificationPreferences {
  pushEnabled: boolean;
  types: Record<string, boolean>;
  version: number;
  configured: boolean;
  publicKey: string | null;
}
export const notificationTypes: Record<string, string> = {
  MATERIAL: "Tài liệu",
  POST: "Bài đăng",
  COMMENT: "Bình luận và trả lời",
  REACTION: "Tương tác",
  ASSIGNMENT: "Bài tập",
  SCORE: "Công bố kết quả kiểm tra",
  SUBMISSION: "Nộp bài tập",
  ASSIGNMENT_RESULT: "Kết quả bài tập",
  ATTENDANCE: "Điểm danh",
  SCHEDULE: "Lịch học",
  REWARD: "Điểm động viên",
  APPROVAL: "Phê duyệt",
  CONSENT: "Yêu cầu đồng ý",
  STORAGE: "Kho lưu trữ",
  SYSTEM: "Hệ thống",
  PRESENCE: "Trạng thái online",
  VIEW: "Lượt xem",
};
export function wantsNotification(
  type: string,
  priority: string = "NORMAL",
  types: Record<string, boolean> = {},
) {
  const key =
    type === "SOCIAL" || type === "REPLY"
      ? "COMMENT"
      : type === "ASSIGNMENT_RESULT"
        ? "GRADE"
        : type;
  return (
    types[type] ??
    types[key] ??
    (priority === "IMPORTANT" ||
      !["REACTION", "SYSTEM", "PRESENCE", "VIEW", "REWARD"].includes(key))
  );
}
export const defaultBranding: PortalBranding = {
  name: "",
  foreground: "#317b58",
  background: "#e6f2e9",
};
