import type {api} from "@/api/api";
export function notificationResourceTags(type:string,classId?:string|null):Parameters<typeof api.util.invalidateTags>[0]{
 const id=classId?{id:classId}:{};
 if(type==="SCHEDULE")return [{type:"Attendance",...id},{type:"Schedule",...id},{type:"Rewards",...id}];
 if(type==="ATTENDANCE")return [{type:"Attendance",...id},{type:"Rewards",...id}];
 if(type==="REWARD")return [{type:"Rewards",...id}];
 if(type==="SCORE")return ["Reports","Assessments"];
 if(type==="SOCIAL"||type==="REPLY")return ["Posts","Comments"];
 if(type==="MATERIAL")return classId?["Posts","Materials"]:["Materials","Folders","Storages","DeletionRequests"];
 if(type==="APPROVAL"||type==="CONSENT")return ["DeletionRequests"];
 if(type==="STORAGE")return ["Storages"];
 return [];
}
