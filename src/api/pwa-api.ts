import {api} from "./api";
import type {NotificationPreferences} from "@/features/pwa/models";
import type {Notification} from "@/features/materials/models";
const unwrap=<T,>(r:{data:T})=>r.data;
export const pwaApi=api.enhanceEndpoints({addTagTypes:["NotificationPreferences"]}).injectEndpoints({endpoints:b=>({
 notificationPreferences:b.query<NotificationPreferences,void>({query:()=>"/me/notification-preferences",transformResponse:unwrap<NotificationPreferences>,providesTags:["NotificationPreferences"],keepUnusedDataFor:86400}),
 saveNotificationPreferences:b.mutation<NotificationPreferences,Pick<NotificationPreferences,"pushEnabled"|"types"|"version">>({query:body=>({url:"/me/notification-preferences",method:"PATCH",body}),transformResponse:unwrap<NotificationPreferences>,async onQueryStarted(_, {dispatch,queryFulfilled}){try{const {data}=await queryFulfilled;dispatch(pwaApi.util.updateQueryData("notificationPreferences",undefined,()=>data));}catch{}}}),
 subscribePush:b.mutation<{enabled:boolean},{endpoint:string;keys:{p256dh:string;auth:string};portal:"student"|"staff"}>({query:body=>({url:"/me/notification-preferences/subscription",method:"POST",body})}),
 unsubscribePush:b.mutation<{disabled:boolean},{endpoint:string}>({query:body=>({url:"/me/notification-preferences/subscription",method:"DELETE",body})}),
 pushNotice:b.query<Notification,string>({query:id=>`/notifications/${encodeURIComponent(id)}`,transformResponse:unwrap<Notification>,keepUnusedDataFor:60})
})});
export const {useNotificationPreferencesQuery,useSaveNotificationPreferencesMutation,useSubscribePushMutation,useUnsubscribePushMutation,useLazyPushNoticeQuery}=pwaApi;
