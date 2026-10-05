import test from "node:test";
import assert from "node:assert/strict";
import { seed } from "../src/mock/fixtures";
import { management, actor } from "../src/mock/management-engine";
import { reportRequest } from "../src/mock/reports";
import { skillCodes, type StaffReport } from "../src/features/reports/models";
import { changes, selectUnit } from "../src/features/reports/utils";
import { relatedTags } from "../src/features/operations/models";
import { operationCommand } from "../src/mock/operations";
import { pageGuide } from "../src/features/help/content";
const path = "/classes/class-green/students/HV1001/units/unit-class-green-3/report";
const comments = (r:StaffReport) => ({version:r.version,assessmentId:r.assessmentId,resultVersion:r.resultVersion,skills:skillCodes.map(code => ({code,comment:"Tiếng Việt\nxuống dòng "+code})),overallComment:"Nhận xét mới"});
function setup() {const db=seed();management(db);const teacher=actor(db,"GV0001"),manager=actor(db,"MG0001"),dual=actor(db,"BOTH0001");return {db,teacher,manager,dual};}
test("Report mock: manager/teacher xem cùng snapshot, nguồn đầy đủ và quyền sửa đúng lớp",()=>{
 const {db,teacher,manager,dual}=setup(); const before=reportRequest(db,teacher,path,"GET",undefined)!.data as StaffReport;
 assert.equal(before.report.total.score,23.1);assert.equal(before.report.total.maxScore,35);assert.equal(before.report.total.percentage,66);assert(before.canEditComments);
 for(const staff of [manager,dual]) {const r=reportRequest(db,staff,path,"GET",undefined)!.data as StaffReport;assert.deepEqual(r.report,before.report);assert(!r.canEditComments);assert.throws(()=>reportRequest(db,staff,path+"/comments","PATCH",comments(r)),(e:unknown)=>!!e && typeof e === "object" && "status" in e && e.status === 403);}
 assert.throws(()=>reportRequest(db,teacher,path.replace("HV1001","outside"),"GET",undefined));
});
test("Report comments: chỉ sửa nhận xét, đồng bộ nguồn, persist, conflict và invalidate query",()=>{
 const {db,teacher}=setup(),before=reportRequest(db,teacher,path,"GET",undefined)!.data as StaffReport,req=comments(before);
 const saved=reportRequest(db,teacher,path+"/comments","PATCH",req)!.data as StaffReport;
 assert.deepEqual(saved.report.total,before.report.total);assert.deepEqual(saved.report.advice,before.report.advice);assert.equal(saved.version,before.version+1);assert.equal(saved.resultVersion,before.resultVersion!+1);
 assert(saved.report.skills.every(s => s.comment?.startsWith("Tiếng Việt\n")));assert.equal(db.results["assessment-published"][0].overallComment,"Nhận xét mới");
 assert.throws(()=>reportRequest(db,teacher,path+"/comments","PATCH",req),(e:unknown)=>!!e && typeof e === "object" && "status" in e && e.status === 409);
 assert.deepEqual((reportRequest(JSON.parse(JSON.stringify(db)),teacher,path,"GET",undefined)!.data as StaffReport).report,saved.report);
 assert(relatedTags(["reports"]).includes("Reports"));assert(relatedTags(["results"]).includes("Reports"));assert.equal(operationCommand(path+"/comments","PATCH"),"Staff.ReportComments");
});
test("Báo cáo chỉ công bố; Unit cao nhất; subset/null và chênh lệch đúng dữ liệu",()=>{
 const {db,teacher}=setup(); const items=(reportRequest(db,teacher,"/classes/class-green/students/HV1001/units","GET",undefined)!.data as {items:{id:string;order:number;name:string;hasReport:boolean}[]}).items;
 assert.equal(selectUnit(items,null)?.order,3);db.publications={};assert.deepEqual(reportRequest(db,teacher,"/classes/class-green/students/HV1001/units","GET",undefined)!.data,{items:[]});
 const r={vocabulary:null,grammar:0,pronunciation:null,listening:80,reading:null,speaking:52.5,writing:null};
 const entries=[{unitId:"u1",unitOrder:1,unitName:"U1",totalPercentage:70,skills:r},{unitId:"u2",unitOrder:2,unitName:"U2",totalPercentage:66,skills:{...r,speaking:60}}];
 assert.equal(changes(entries,"total")[0].value,-4);assert.equal(changes(entries,"grammar")[0].value,0);assert.equal(changes(entries,"vocabulary")[0].value,null);assert.equal(changes(entries,"speaking")[0].value,7.5);
});
test("Hướng dẫn bao phủ báo cáo, bảng, Excel, phiên, schema và quản lý",()=>{
 for(const route of ["/reports/","/scores/","/student-score/","/manage/grid/","/manage/excel/","/class/","/assessment/","/session/","/import/","/manage/profile/"]) {const guide=pageGuide(route,"accounts","manager");assert(guide.steps.length>=3);assert(guide.steps.some(step=>step.illustration));}
});
