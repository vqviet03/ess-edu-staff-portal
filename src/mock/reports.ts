import { z } from "zod";
import type { Database } from "./fixtures";
import { assertLearning, management, ManagementError } from "./management-engine";
import type { Teacher } from "@/types";
import { calculate } from "@/utils/scores";
import { skillCodes, type Report, type SkillCode, type StaffReport } from "@/features/reports/models";
const input = z.object({version:z.number().int().positive(),assessmentId:z.string().nullable(),resultVersion:z.number().int().nonnegative().nullable(),skills:z.array(z.object({code:z.enum(skillCodes),comment:z.string().max(4000)})).length(7),overallComment:z.string().max(4000)}).refine(v => new Set(v.skills.map(s => s.code)).size === 7);
const fail = (status:number,code:string,message:string):never => {throw new ManagementError(status,code,message);};
export function reportRequest(db:Database,staff:Teacher,path:string,method:string,body:unknown):{data:unknown;changed:boolean} | null {
  const match = path.match(/^\/classes\/([^/]+)\/students\/([^/]+)\/(units|progress)(?:\/([^/]+)\/report(?:\/(comments))?)?$/);
  if(!match) return null;
  const [,rawClass,rawStudent,kind,rawUnit,comments] = match, classId = decodeURIComponent(rawClass), studentId = decodeURIComponent(rawStudent), unitId = rawUnit ? decodeURIComponent(rawUnit) : "";
  assertLearning(db,staff,classId);
  const managed = management(db), enrollment = managed.enrollments.find(e => e.classId === classId && e.studentId === studentId);
  if(!enrollment) return fail(404,"STUDENT_NOT_FOUND","Học sinh không thuộc lớp này.");
  const publications = Object.entries(db.publications ?? {}).filter(([key,source]) => key.startsWith(classId+":") && source.results.some(r => r.studentId === studentId)).map(([key,source]) => ({order:Number(key.slice(classId.length+1)),source,key})).sort((a,b) => a.order-b.order);
  const rows = publications.map(({order,source,key}) => {
    const snapshot = source.results.find(r => r.studentId === studentId)!;
    const total = calculate(snapshot,source.skills);
    const id = `unit-${classId}-${order}`;
    const assessment = db.assessments.find(a => a.id === source.assessmentId), session = db.sessions.find(s => s.id === assessment?.sessionId), current = db.results[source.assessmentId]?.find(r => r.studentId === studentId);
    const linked = current && snapshot.attendance === current.attendance && source.skills.every(s => current.skillResults.find(r => r.skillCode === s.skillCode)?.score === snapshot.skillResults.find(r => r.skillCode === s.skillCode)?.score);
    const skills = skillCodes.map(code => {const part = snapshot.skillResults.find(s => s.skillCode === code.toUpperCase()), max = source.skills.find(s => s.skillCode === code.toUpperCase())?.maxQuestions ?? null, score = part?.score ?? null; return {code,score,maxScore:max,percentage:score === null || max === null ? null : score/max*100,comment:part?.comment ?? null};});
    const report:Report = {classId,unitId:id,testedAt:session ? session.date+"T00:00:00Z" : null,total:{score:total.score,maxScore:snapshot.attendance === "PRESENT" ? total.max : null,percentage:total.percentage},skills,overallComment:snapshot.overallComment,advice:snapshot.overallAdvice ? [snapshot.overallAdvice] : []};
    let canEdit = enrollment.status === "ACTIVE" && managed.students.some(s => s.id === studentId && s.status === "ACTIVE");
    if(canEdit) {try {assertLearning(db,staff,classId,true);} catch {canEdit=false;}}
    const versionKey = `${key}:${studentId}`;
    const data:StaffReport = {report,version:db.reportVersions?.[versionKey] ?? 1,assessmentId:linked ? source.assessmentId : null,resultVersion:linked ? current.version : null,canEditComments:canEdit};
    return {order,id,data,source,snapshot,current,assessment,versionKey};
  });
  if(!unitId && method === "GET") return {changed:false,data:{items:kind === "units" ? rows.map(r => ({id:r.id,name:`Unit ${r.order}`,order:r.order,hasReport:true})) : rows.map(r => ({unitId:r.id,unitName:`Unit ${r.order}`,unitOrder:r.order,totalPercentage:r.data.report.total.percentage,skills:Object.fromEntries(r.data.report.skills.map(s => [s.code,s.percentage])) as Record<SkillCode,number|null>}))}};
  const row = rows.find(r => r.id === unitId);
  if(!row) return fail(404,"REPORT_NOT_FOUND","Chưa có báo cáo đã công bố.");
  if(method === "GET" && !comments) return {changed:false,data:row.data};
  if(method !== "PATCH" || !comments) return fail(405,"METHOD_NOT_ALLOWED","Phương thức không hợp lệ.");
  if(!row.data.canEditComments) return fail(403,"CLASS_READ_ONLY","Chỉ giảng viên đang phụ trách lớp ACTIVE mới được sửa nhận xét.");
  const parsed = input.safeParse(body);
  if(!parsed.success) return fail(422,"VALIDATION_ERROR","Nhận xét cần đủ 7 kỹ năng không trùng, tối đa 4.000 ký tự.");
  const request=parsed.data;
  if(request.version !== row.data.version || request.assessmentId !== row.data.assessmentId || request.resultVersion !== row.data.resultVersion) return fail(409,"VERSION_CONFLICT","Báo cáo hoặc kết quả nguồn đã thay đổi. Tải lại trước khi lưu.");
  for(const skill of row.snapshot.skillResults) skill.comment = request.skills.find(s => s.code.toUpperCase() === skill.skillCode)!.comment;
  row.snapshot.overallComment=request.overallComment;
  if(row.data.assessmentId && row.current && row.assessment) {for(const skill of row.current.skillResults) skill.comment = request.skills.find(s => s.code.toUpperCase() === skill.skillCode)!.comment;row.current.overallComment=request.overallComment;row.current.version++;row.assessment.version++;}
  db.reportVersions ??= {};db.reportVersions[row.versionKey]=row.data.version+1;
  const updated = reportRequest(db,staff,path.replace(/\/comments$/,""),"GET",undefined)!;
  managed.audit.push({id:crypto.randomUUID(),at:new Date().toISOString(),actorId:staff.id,action:"UPDATE_REPORT_COMMENTS",entity:"reports",ids:[row.versionKey],reason:"Cập nhật nhận xét báo cáo",changes:[]});
  return {data:updated.data,changed:true};
}
