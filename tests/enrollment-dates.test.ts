import test from "node:test";
import assert from "node:assert/strict";
import {validateEnrollmentDates, type EnrollmentDates} from "../src/features/management/enrollment-dates";
import {managementRequest, management, actor} from "../src/mock/management-engine";
import {seed} from "../src/mock/fixtures";
import type {BulkPreview} from "../src/features/management/models";

test("admission dates allow old, future, overlapping and after-departure dates; malformed dates rejected", () => {
  const history: EnrollmentDates["history"] = [
    {id:"old", joinedOn:"2026-10-06", endedOn:"2026-10-09", startAt:"2026-10-06T16:00:00Z", endAt:"2026-10-09T02:00:00Z", status:"ENDED", reason:""},
    {id:"current", joinedOn:"2026-10-09", endedOn:null, startAt:"2026-10-09T14:00:00Z", endAt:null, status:"ACTIVE", reason:""},
  ];
  const periods = [{id:"old",joinedOn:"2026-09-18",endedOn:"2026-10-06"}, {id:"current",joinedOn:"2026-10-09",endedOn:null}];
  assert.deepEqual(validateEnrollmentDates(periods, history), []);
  for (const [index, joinedOn] of [[1,"2026-10-05"],[0,"1990-01-01"],[1,"2035-05-01"],[0,"2026-11-01"]] as const) {
    assert.deepEqual(validateEnrollmentDates(periods.map((p,i)=>i===index?{...p,joinedOn}:p), history), []);
  }
  assert.ok(validateEnrollmentDates([{...periods[0],endedOn:null},periods[1]],history).length);
  assert.ok(validateEnrollmentDates([{...periods[0],joinedOn:"2026-02-30"},periods[1]],history).length);
  assert.ok(validateEnrollmentDates([periods[0]],history).length);
});

test("mock dates API commits history once, keeps status/createdAt, enforces version/role and records audit", async () => {
  const db=seed(), m=management(db), e=m.enrollments[0], manager=actor(db,"MG0001");
  e.history=[
    {startAt:"2026-09-30T17:00:00Z",endAt:"2026-10-04T16:59:59Z",status:"ENDED",reason:""},
    {startAt:"2026-10-04T17:00:00Z",endAt:null,status:"ACTIVE",reason:""},
  ];
  const request=async (url:string, method="GET", body?:unknown, key?:string) =>
    (await managementRequest(db,manager,{url,method,body,headers:key?{"Idempotency-Key":key}:undefined},()=>{}))!.data as {data: unknown};
  const dates=(await request(`/manager/enrollments/dates?classId=${e.classId}&studentId=${e.studentId}`)).data as EnrollmentDates;
  const created=e.createdAt, status=e.status;
  const preview=(await request("/manager/enrollments/dates/preview","POST",{classId:e.classId,studentId:e.studentId,version:e.version,periods:dates.history.map((p,i)=>({id:p.id,joinedOn:i===0?"2026-09-18":p.joinedOn,endedOn:i===0?"2026-10-03":p.endedOn}))})).data as BulkPreview;
  const body={previewId:preview.previewId,version:preview.version,confirmations:preview.requiredConfirmations,reason:"Đối chiếu hồ sơ"};
  const first=await request("/manager/changes/commit","POST",body,"dates-test");
  assert.deepEqual(await request("/manager/changes/commit","POST",body,"dates-test"),first);
  assert.equal(e.createdAt,created); assert.equal(e.status,status); assert.equal(e.datesConfirmed,true);
  assert.equal(e.history[0].joinedOn,"2026-09-18"); assert.equal(e.history[1].joinedOn,dates.history[1].joinedOn);
  assert.equal(m.audit.filter(a=>a.action==="CORRECT_DATES").length,1);
  await assert.rejects(()=>request("/manager/enrollments/dates/preview","POST",{classId:e.classId,studentId:e.studentId,version:dates.version,periods:dates.history}),/thay đổi/);
  await assert.rejects(()=>managementRequest(db,actor(db,"GV0001"),{url:`/manager/enrollments/dates?classId=${e.classId}&studentId=${e.studentId}`},()=>{}),/MANAGER/);
});
