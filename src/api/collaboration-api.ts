import { api, unwrap } from "./api";
import type { Members, PresenceSignal, PresenceState } from "@/features/presence/state";
import { PRESENCE_SIGNAL_EVENT, PRESENCE_CONNECTION_EVENT, applyPresence } from "@/features/presence/state";
import type { Viewers } from "@/features/presence/models";
export const collaborationApi = api.injectEndpoints({
 endpoints:b=>({
  classMembers:b.query<Members,string>({
   query:id=>`/classes/${encodeURIComponent(id)}/members`,
   transformResponse:unwrap<Members>,providesTags:(_,__,id)=>[{type:"Members",id}]
  }),
  livePresence:b.query<PresenceState,string>({
   queryFn:()=>({data:{connections:{},lastSeen:{},connected:false}}),keepUnusedDataFor:0,
   async onCacheEntryAdded(classId,{updateCachedData,cacheDataLoaded,cacheEntryRemoved}){
    if(typeof window==="undefined") return;
    const signal=(e:Event)=>{const item=(e as CustomEvent<PresenceSignal>).detail;if(item.classId===classId) updateCachedData(s=>applyPresence(s,item));};
    const connection=(e:Event)=>updateCachedData(s=>{s.connected=(e as CustomEvent<boolean>).detail;if(!s.connected)s.connections={};});
    try {await cacheDataLoaded;window.addEventListener(PRESENCE_SIGNAL_EVENT,signal);window.addEventListener(PRESENCE_CONNECTION_EVENT,connection);await cacheEntryRemoved;}
    finally {window.removeEventListener(PRESENCE_SIGNAL_EVENT,signal);window.removeEventListener(PRESENCE_CONNECTION_EVENT,connection);}
   }
  }),
  recordContentView:b.mutation<{recorded:boolean},{kind:"POST"|"COMMENT";id:string}>({
   query:q=>({url:`/${q.kind==="POST"?"posts":"comments"}/${q.id}/view`,method:"POST"}),transformResponse:unwrap<{recorded:boolean}>
  }),
  contentViewers:b.query<Viewers,{kind:"POST"|"COMMENT";id:string;page:number}>({
   query:q=>({url:`/${q.kind==="POST"?"posts":"comments"}/${q.id}/viewers`,params:{page:q.page}}),
   transformResponse:unwrap<Viewers>
  })
 })
});
export const {useClassMembersQuery,useLivePresenceQuery,useRecordContentViewMutation,useContentViewersQuery}=collaborationApi;
