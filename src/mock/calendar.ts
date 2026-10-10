import type {StudySchedule} from "@/features/rewards/models";
import type {ClassAttendance} from "@/features/attendance/models";
type Occurrence=StudySchedule["occurrences"][number];
export function projectCalendar(schedule:StudySchedule|undefined,days:ClassAttendance[]){
 if(!schedule)return {occurrences:[] as Occurrence[],displaced:new Set<string>()};
 const config=schedule.configuration,first=schedule.planStartDate??schedule.effectiveFrom;
 const fixed:Occurrence[]=[];
 if(first){
  const cursor=new Date(first+"T00:00:00Z"),end=new Date(cursor);end.setUTCFullYear(end.getUTCFullYear()+10);
  for(;cursor<=end;cursor.setUTCDate(cursor.getUTCDate()+1)){
   const date=cursor.toISOString().slice(0,10);
   if(schedule.effectiveFrom&&date<schedule.effectiveFrom)continue;
   const slot=config.slots.find(s=>config.mode==="FLEXIBLE"?s.date===date:s.day===(config.cycle==="WEEKLY"?(cursor.getUTCDay()||7):cursor.getUTCDate()));
   if(!slot)continue;
   fixed.push({date,startTime:config.timeMode==="SHARED"?config.startTime:config.timeMode==="PER_DAY"?slot.startTime:null,endTime:config.timeMode==="SHARED"?config.endTime:config.timeMode==="PER_DAY"?slot.endTime:null});
  }
 }
 const active=days.filter(d=>!d.isCancelled),holidays=new Set(active.filter(d=>d.isHoliday).map(d=>d.date)),replaced=new Set(active.flatMap(d=>d.replacesDate?[d.replacesDate]:[]));
 const candidates=fixed.filter(d=>!holidays.has(d.date)&&!replaced.has(d.date)),count=schedule.plannedSessions??0,required=count>0?Math.max(0,count-active.filter(d=>d.reasonKind==="MAKEUP").length):candidates.length;
 const recorded=candidates.filter(d=>active.some(a=>a.date===d.date&&a.saved));
 const selected=[...recorded,...candidates.filter(d=>!recorded.some(r=>r.date===d.date)).slice(0,Math.max(0,required-recorded.length))];
 const displaced=new Set([...fixed.slice(0,count>0?count:candidates.length).filter(d=>!holidays.has(d.date)&&!selected.some(s=>s.date===d.date)).map(d=>d.date),...replaced]);
 const extra=active.filter(d=>d.reasonKind&&!d.isHoliday).map(d=>({date:d.date,startTime:d.startTime,endTime:d.endTime}));
 return {occurrences:[...new Map([...selected,...extra].map(d=>[d.date,d])).values()].sort((a,b)=>a.date.localeCompare(b.date)),displaced};
}
