export interface AvatarChoice { fileId: string | null; icon: string; color: string }
export interface PersonalProfile {
  loginId: string; fullName: string; nickname: string | null; dateOfBirth: string | null;
  email: string; phone: string; parentPhone: string; parentName: string;
  avatar: AvatarChoice; version: number;
}
export const avatarColors = ["#CDEBD7", "#D6E8FA", "#F8D9E4", "#E3D9F5", "#FBE8B8", "#D1EEE9"] as const;
export const avatarIcons = ["person", "pets", "rabbit", "nature", "robot", "face", "child"] as const;
export function profileError(value: PersonalProfile): string {
  if (!value.fullName.trim()) return "Nhập họ tên.";
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/.test(value.loginId.trim())) return "ID cần 2–64 ký tự chữ, số, dấu chấm, - hoặc _.";
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) return "Email không hợp lệ.";
  if ([value.phone, value.parentPhone].some(p => p && !/^(?:0\d{9}|\+[1-9]\d{7,14})$/.test(p.replace(/[\s().-]/g, "")))) return "Số điện thoại không hợp lệ.";
  return "";
}
