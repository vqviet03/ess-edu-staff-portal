import test from "node:test";
import assert from "node:assert/strict";
import {seed} from "../src/mock/fixtures";
import {actor} from "../src/mock/management-engine";
import {collaborationRequest} from "../src/mock/collaboration";
test("manager calendar planning persists; attendance stays teacher-only and rejects future",()=>{
 const db=seed(),manager=actor(db,"MG0001"),teacher=actor(db,"GV0001"),classId="class-green";
 const date=new Date(Date.now()+86400000).toISOString().slice(0,10);
 const planned=collaborationRequest(db,manager,{url:`/classes/${classId}/attendance/calendar`,method:"PUT",body:{date,version:0,kind:"SUPPLEMENTAL",reason:"Ôn tập"}}) as {version:number;isPinned:boolean};
 assert.equal(planned.isPinned,true);
 assert.throws(()=>collaborationRequest(db,teacher,{url:`/classes/${classId}/attendance`,method:"PUT",body:{date,version:planned.version,rows:[]}}));
 assert.throws(()=>collaborationRequest(db,manager,{url:`/classes/${classId}/attendance`,method:"PUT",body:{date,version:planned.version,rows:[]}}));
 const cancelled=collaborationRequest(db,manager,{url:`/classes/${classId}/attendance/calendar/cancel`,method:"POST",body:{date,version:planned.version,reason:"Đổi kế hoạch",confirmPast:false}}) as {isCancelled:boolean};
 assert.equal(cancelled.isCancelled,true);
});
test("class notification defaults protect schedule, versions prevent overwrite",()=>{
 const db=seed(),manager=actor(db,"MG0001"),url="/classes/class-green/notification-settings";
 const rows=collaborationRequest(db,manager,{url}) as {feature:string;priority:string;version:number}[];
 assert.equal(rows.find(r=>r.feature==="SCHEDULE")?.priority,"IMPORTANT");
 collaborationRequest(db,manager,{url,method:"PUT",body:rows});
 assert.throws(()=>collaborationRequest(db,manager,{url,method:"PUT",body:rows}));
});
