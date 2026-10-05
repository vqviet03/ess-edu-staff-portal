export const skillCodes = ['vocabulary', 'grammar', 'pronunciation', 'listening', 'reading', 'speaking', 'writing'] as const;
export type SkillCode = typeof skillCodes[number];
export interface ReportStudent { id: string; studentCode: string; fullName: string; nickname: string | null }
export interface ReportClass { id: string; name: string; subject: string; isActive: boolean }
export interface Unit { id: string; name: string; order: number; hasReport: boolean }
export interface Score { score: number | null; maxScore: number | null; percentage: number | null }
export interface Report { classId: string; unitId: string; testedAt: string | null; total: Score; skills: (Score & {code: SkillCode; comment: string | null})[]; overallComment: string | null; advice: string[] }
export interface ProgressEntry { unitId: string; unitOrder: number; unitName: string; totalPercentage: number | null; skills: Record<SkillCode, number | null> }
export interface StaffReport { report: Report; version: number; assessmentId: string | null; resultVersion: number | null; canEditComments: boolean }
export interface ReportContext { classId: string; studentId: string }
export interface UnitContext extends ReportContext { unitId: string }
export interface CommentsInput { version: number; skills: {code: SkillCode; comment: string}[]; overallComment: string; assessmentId: string | null; resultVersion: number | null }
