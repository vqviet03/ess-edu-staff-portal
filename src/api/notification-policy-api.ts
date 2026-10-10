import {api,unwrap} from "./api";
export type NotificationPriority="NORMAL"|"IMPORTANT";
export interface NotificationRule {feature:string;managers:boolean;teachers:boolean;students:boolean;priority:NotificationPriority;version:number}
export const notificationPolicyApi=api.injectEndpoints({endpoints:b=>({
 notificationSettings:b.query<NotificationRule[],string>({query:id=>`/classes/${encodeURIComponent(id)}/notification-settings`,transformResponse:unwrap<NotificationRule[]>,providesTags:(_,__,id)=>[{type:"Class",id}]}),
 saveNotificationSettings:b.mutation<NotificationRule[],{classId:string;rules:NotificationRule[]}>({query:q=>({url:`/classes/${encodeURIComponent(q.classId)}/notification-settings`,method:"PUT",body:q.rules}),transformResponse:unwrap<NotificationRule[]>,invalidatesTags:(_,e,q)=>e?[]:[{type:"Class",id:q.classId},"Audit"]})
})});
export const {useNotificationSettingsQuery,useSaveNotificationSettingsMutation}=notificationPolicyApi;
