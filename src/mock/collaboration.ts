import type {Database} from "./fixtures";
import type {Teacher} from "@/types";
import type {FetchArgs} from "@reduxjs/toolkit/query";
import {capabilities} from "@/features/access/capabilities";
import {accessFor,management,ManagementError} from "./management-engine";
import type {ClassAttendance} from "@/features/attendance/models";
import {todayDate,absenceWarning} from "@/features/attendance/models";
import type {NotificationRule} from "@/api/notification-policy-api";
import type {ScheduleConfig,StudySchedule} from "@/features/rewards/models";
type State={days:Record<string,ClassAttendance>;policies:Record<string,NotificationRule[]>;views:Record<string,string[]>;schedules:Record<string,StudySchedule>};
export interface CollaborationDatabase {collaboration?:State}
const features=["MATERIAL","SOCIAL","REPLY","ATTENDANCE","SCHEDULE","REWARD","SCORE","APPROVAL","SYSTEM"];
const fail=(status:number,code:string,message:string):never=>{throw new ManagementError(status,code,message);};
export function collaborationRequest(db:Database,staff:Teacher,req:FetchArgs){
 const url=new URL(req.url,"https://mock.invalid"); const path=url.pathname,method=req.method??"GET",body=(req.body??{}) as Record<string,unknown>;
 const state=((db as Database&CollaborationDatabase).collaboration??={days:{},policies:{},views:{},schedules:{}});
 const match=path.match(/^\/(?:me\/)?classes\/([^/]+)\/(members|notification-settings|schedule|attendance)(.*)$/);
 if(!match){
  const view=path.match(/^\/(posts|comments)\/([^/]+)\/(view|viewers)$/);if(!view)return;
  const key=`${view[1]}:${view[2]}`,ids=state.views[key]??=[];
  if(view[3]==="view"&&method==="POST"){const recorded=!ids.includes(staff.id);if(recorded)ids.push(staff.id);return {recorded};}
  return {items:ids.map(id=>{const t=management(db).teachers.find(t=>t.id===id);return {publicId:t?.id??"",name:t?.fullName??"Thành viên",role:"Giảng viên",viewedAt:new Date().toISOString()};}),total:ids.length,page:1,pageSize:30};
 }
 const classId=decodeURIComponent(match[1]),feature=match[2],tail=match[3];
 const access=accessFor(db,staff,classId),manager=staff.roles?.includes("MANAGER"),canEdit=capabilities(staff,"teacher",access).editLearning,canArrange=manager||canEdit;
 if(!access.canView)fail(403,"FORBIDDEN","Không có quyền xem lớp.");
 if(feature==="members"){
  const m=management(db),students=m.students.filter(s=>m.enrollments.some(e=>e.classId===classId&&e.studentId===s.id&&e.status==="ACTIVE")),teachers=m.teachers.filter(t=>m.assignments.some(a=>a.classId===classId&&a.teacherId===t.id&&a.status==="ACTIVE"));
  return {classId,items:[...students.map(s=>({userId:s.id,publicId:s.id,name:s.fullName,nickname:s.nickname,role:"Học sinh",lastSeenAt:null})),...teachers.map(t=>({userId:t.id,publicId:t.id,name:t.fullName,nickname:null,role:"Giảng viên",lastSeenAt:null}))]};
 }
 if(feature==="notification-settings"){
  const rows=state.policies[classId]??=features.map(feature=>({feature,managers:true,teachers:true,students:true,priority:["SCHEDULE","APPROVAL"].includes(feature)?"IMPORTANT":"NORMAL",version:0}));
  if(method==="PUT"){
   if(!manager)fail(403,"FORBIDDEN","Chỉ quản lý được cài đặt thông báo.");
   if(!Array.isArray(req.body))fail(422,"INVALID_NOTIFICATION_POLICY","Payload không hợp lệ.");
   const proposed=req.body as NotificationRule[];
   if(proposed.some(r=>!features.includes(r.feature)||r.version!==rows.find(x=>x.feature===r.feature)?.version))fail(409,"VERSION_CONFLICT","Cài đặt đã thay đổi.");
   state.policies[classId]=rows.map(r=>{const update=proposed.find(p=>p.feature===r.feature);return update?{...update,priority:["SCHEDULE","APPROVAL"].includes(r.feature)?"IMPORTANT":update.priority,version:r.version+1}:r;});
  }
  return state.policies[classId];
 }
 if(feature==="schedule"){
  const old=state.schedules[classId]??={classId,version:0,effectiveFrom:null,configuration:{mode:"FLEXIBLE",cycle:"WEEKLY",timeMode:"FLEXIBLE",startTime:null,endTime:null,slots:[]},occurrences:[],timeZone:"Asia/Ho_Chi_Minh",plannedSessions:0,planStartDate:null};
  if(method==="PUT"){
   if(!manager)fail(403,"FORBIDDEN","Chỉ quản lý được sửa lịch.");
   if(Number(body.version)!==old.version)fail(409,"VERSION_CONFLICT","Lịch đã thay đổi.");
   const config=body.configuration as ScheduleConfig;
   state.schedules[classId]={...old,version:old.version+1,effectiveFrom:String(body.effectiveFrom),configuration:config,plannedSessions:Number(body.plannedSessions??old.plannedSessions),planStartDate:String(body.planStartDate??old.planStartDate),occurrences:config.slots.filter(s=>s.date).map(s=>({date:s.date!,startTime:s.startTime,endTime:s.endTime}))};
  }
  return state.schedules[classId];
 }
 const date=String(body.date??url.searchParams.get("date")??todayDate()),key=`${classId}:${date}`;
 const roster=db.students[classId]??[];
 const day=state.days[key]??{classId,today:todayDate(),date,version:0,saved:false,scheduled:state.schedules[classId]?.occurrences.some(d=>d.date===date)??false,confirmed:false,replaced:false,reasonKind:null,reason:"",replacesDate:null,startTime:null,endTime:null,updatedBy:null,updatedAt:null,plannedSessions:state.schedules[classId]?.plannedSessions??0,savedSessions:0,supplementalSessions:0,needsAttention:0,items:roster.map(s=>({studentId:s.id,publicId:s.id,name:s.name,nickname:s.nickname,status:"UNSET",stats:{present:0,absent:0,unrecorded:0,plannedSessions:0,absencePercentage:null,warning:"NO_PLAN"}})),calendar:[],changes:[]};
 if(method!=="GET"){
  if(Number(body.version)!==day.version)fail(409,"VERSION_CONFLICT","Buổi học đã thay đổi.");
  if(tail==="/calendar"||tail==="/calendar/cancel"){
   if(!canArrange)fail(403,"FORBIDDEN","Không có quyền xếp lịch.");
   if(day.saved)fail(409,"ATTENDANCE_EXISTS","Buổi đã điểm danh.");
   if(!String(body.reason??"").trim())fail(422,"REASON_REQUIRED","Nhập lý do.");
   if(tail.endsWith("/cancel")){if(date<todayDate()&&!body.confirmPast)fail(422,"PAST_CONFIRMATION_REQUIRED","Xác nhận hủy buổi đã qua.");day.isCancelled=true;day.isPinned=false;day.isPlanned=false;day.isHoliday=false;day.confirmed=false;}
   else{if(!["HOLIDAY","MAKEUP","SUPPLEMENTAL"].includes(String(body.kind)))fail(422,"INVALID_CALENDAR_DAY","Loại buổi không hợp lệ.");day.isHoliday=body.kind==="HOLIDAY";day.isPlanned=!day.isHoliday;day.isPinned=!day.isHoliday;day.isCancelled=false;day.reasonKind=body.kind==="HOLIDAY"?null:body.kind as "MAKEUP"|"SUPPLEMENTAL";day.confirmed=!day.isHoliday;}
   day.reason=String(body.reason);day.version++;
  }else if(tail===""&&method==="PUT"){
   if(!canEdit)fail(403,"FORBIDDEN","Chỉ giảng viên đang phụ trách được điểm danh.");
   if(date>todayDate())fail(422,"INVALID_ATTENDANCE_DATE","Chưa được điểm danh tương lai.");
   if(day.isHoliday||day.isCancelled||!day.scheduled&&!day.confirmed)fail(422,"OFF_SCHEDULE_UNCONFIRMED","Xếp ngày học trước khi điểm danh.");
   if(!Array.isArray(body.rows))fail(422,"INVALID_ATTENDANCE","Thiếu danh sách.");
   const rows=body.rows as {studentId:string;status:"PRESENT"|"ABSENT"}[];
   day.items=day.items.map(s=>{const r=rows.find(r=>r.studentId===s.studentId);if(!r||!["PRESENT","ABSENT"].includes(r.status))throw new ManagementError(422,"INVALID_ATTENDANCE","Trạng thái không hợp lệ.");return {...s,status:r.status,stats:{...s.stats,present:Number(r.status==="PRESENT"),absent:Number(r.status==="ABSENT"),...{absencePercentage:absenceWarning(Number(r.status==="ABSENT"),day.plannedSessions).percentage,warning:absenceWarning(Number(r.status==="ABSENT"),day.plannedSessions).warning}}};});
   day.saved=true;day.isPinned=false;day.isPlanned=false;day.version++;
  }else return;
  state.days[key]=day;
  day.updatedBy=staff.name;day.updatedAt=new Date().toISOString();
 }
 const calendar=Object.values(state.days).filter(d=>d.classId===classId).map(d=>({date:d.date,status:d.isHoliday?"HOLIDAY":d.isCancelled?"CANCELLED":d.isPlanned?"PLANNED":d.saved?"SAVED":"UNSET",scheduled:d.scheduled,confirmed:d.confirmed,reasonKind:d.reasonKind,reason:d.reason,replacesDate:d.replacesDate,replaced:d.replaced,startTime:d.startTime,endTime:d.endTime,isHoliday:d.isHoliday,isPlanned:d.isPlanned,isPinned:d.isPinned,isCancelled:d.isCancelled}));
 return {...day,calendar};
}
