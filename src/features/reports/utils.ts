import { ReportClass, ProgressEntry, SkillCode, Unit } from './models';
export const skills: { code: SkillCode; label: string; color: string }[] = [
  { code: 'vocabulary', label: 'Vocabulary', color: '#2786e8' },
  { code: 'grammar', label: 'Grammar', color: '#9459d9' },
  { code: 'pronunciation', label: 'Pronunciation', color: '#e4497d' },
  { code: 'listening', label: 'Listening', color: '#25af76' },
  { code: 'reading', label: 'Reading', color: '#dda318' },
  { code: 'speaking', label: 'Speaking', color: '#1aa7b2' },
  { code: 'writing', label: 'Writing', color: '#e38db5' },
];
export const percentage = (n: number | null | undefined) => n == null ? '—' : `${n.toFixed(1)}%`;
export const difference = (before: number | null, after: number | null) => before === null || after === null ? null : Math.round((after - before) * 10) / 10;
export const selectClass = (items: ReportClass[], id: string | null) => items.find(x => x.id === id) ?? items.find(x => x.isActive) ?? items[0] ?? null;
export const selectUnit = (items: Unit[], id: string | null) => items.find(x => x.id === id) ?? [...items].sort((a, b) => b.order - a.order)[0] ?? null;
export const changes = (items: ProgressEntry[], code: SkillCode | 'total') => {
  const sorted = [...items].sort((a, b) => a.unitOrder - b.unitOrder);
  return sorted.slice(1).map((entry, i) => ({ label: `U${sorted[i].unitOrder} → U${entry.unitOrder}`, value: difference(code === 'total' ? sorted[i].totalPercentage : sorted[i].skills[code], code === 'total' ? entry.totalPercentage : entry.skills[code]) }));
};
