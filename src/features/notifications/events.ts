import type {Notification} from "@/features/materials/models";
export const NOTICE_TOAST_EVENT="portal:notice-toast";
export function showNoticeToast(notice:Notification){window.dispatchEvent(new CustomEvent(NOTICE_TOAST_EVENT,{detail:notice}));}
