export interface Gift {
  id: string;
  catalogId: string;
  name: string;
  description: string;
  category: string;
  points: number;
  available: number;
  reserved: number;
  status: string;
  version: number;
  fileIds: string[];
  favorite: boolean;
}
export interface Catalog {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  status: string;
  version: number;
  classIds: string[];
  managerIds: string[];
  canManage: boolean;
  canManageMembers: boolean;
}
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
export interface CheckoutItem {
  giftId: string;
  quantity: number;
  expectedPoints: number;
}
export interface Checkout {
  classId: string;
  studentId: string;
  items: CheckoutItem[];
}
export interface Preview {
  classId: string;
  studentId: string;
  studentName: string;
  nickname: string;
  studentCode: string;
  className: string;
  balanceBefore: number;
  balanceAfter: number;
  totalPoints: number;
  items: {
    gift: Gift;
    quantity: number;
    expectedPoints: number;
    priceChanged: boolean;
  }[];
  canConfirm: boolean;
  errors: string[];
}
export interface Workflow {
  classId?: string;
  id: string;
  state: "PENDING" | "DONE" | "FAILED";
  errorCode: string;
}
export interface Redemption {
  id: string;
  classId: string;
  studentId: string;
  actorId: string;
  studentName: string;
  nickname: string;
  studentCode: string;
  className: string;
  status: "PENDING" | "DELIVERED";
  totalPoints: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  deliveredAt: string | null;
  self: boolean;
  items: {
    giftId: string;
    catalogId: string;
    name: string;
    points: number;
    quantity: number;
    deleted: boolean;
    fileId: string | null;
  }[];
}
export const giftErrors: Record<string, string> = {
  EMPTY_CART: "Giỏ chưa có quà.",
  PRICE_CHANGED: "Giá quà đã thay đổi. Xem lại và xác nhận mức giá mới.",
  OUT_OF_STOCK: "Quà không còn đủ số lượng.",
  GIFT_UNAVAILABLE: "Có quà đã ngừng hiển thị.",
  INSUFFICIENT_POINTS: "Số dư chưa đủ để đổi giỏ quà này.",
  CLASS_NOT_ACTIVE: "Lớp đã dừng đổi quà.",
  ENROLLMENT_INACTIVE: "Học sinh không còn hoạt động trong lớp.",
  ASSIGNMENT_REVOKED: "Phân công giảng viên đã thay đổi.",
};
export const formatPoints = (value: number) => value.toLocaleString("vi-VN");
export const giftStyles = {
  surface: {
    border: "1px solid",
    borderColor: "divider",
    borderRadius: "16px",
    p: { xs: 1.5, md: 2 },
    boxShadow: "none",
  },
  title: { fontSize: 28, fontWeight: 700, lineHeight: 1.4 },
  pills: {
    minHeight: 40,
    "& .MuiTab-root": { minHeight: 36, borderRadius: "999px", px: 2, py: 0.75 },
    "& .Mui-selected": { bgcolor: "action.selected" },
    "& .MuiTabs-indicator": { display: "none" },
  },
} as const;
