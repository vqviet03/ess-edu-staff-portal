'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Feedback } from '@/shared/ui';
import { percentage, skills } from './utils';
import type { ProgressEntry, Report } from './models';
const Charts = dynamic(() => import('./charts'), {ssr: false, loading: () => <Feedback loading/>});
export function Section({title, children}: {title: string; children: React.ReactNode}) { return <Paper component="section" sx={{p: {xs: 2, md: 3}, minWidth: 0}}><Typography variant="h5" component="h2" sx={{mb: 2}}>{title}</Typography>{children}</Paper>; }
function DeferredCharts({entries, deltas = false}: {entries: ProgressEntry[]; deltas?: boolean}) {
  const container = useRef<HTMLDivElement>(null); const [visible, setVisible] = useState(false);
  useEffect(() => { const observer = new IntersectionObserver(items => { if (items.some(item => item.isIntersecting)) {setVisible(true); observer.disconnect();} }, {rootMargin: '240px'}); if (container.current) observer.observe(container.current); return () => observer.disconnect(); }, []);
  return <Box ref={container} sx={{minHeight: deltas ? 220 : 330}}>{visible ? <Charts entries={entries} deltas={deltas}/> : <Feedback loading/>}</Box>;
}
export default function ReportView({report, entries, unitName, progressLoading, progressError, retryProgress}: {report: Report; entries: ProgressEntry[]; unitName: string; progressLoading: boolean; progressError: unknown; retryProgress: () => void}) {
  const progressFeedback = progressLoading ? <Feedback loading/> : progressError ? <Feedback error={progressError} retry={retryProgress}/> : !entries.length ? <Feedback empty="Chưa có lịch sử điểm theo Unit."/> : null;
  return <Box sx={{display: 'grid', gap: 2.5}}>
    <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: '1fr 1fr'}, gap: 2.5, alignItems: 'start'}}>
      <Section title={`Tổng quan kết quả ${unitName}`}>
        <Box sx={{p: 2, bgcolor: 'action.selected', borderRadius: 2, mb: 1.5}}><Typography variant="body2" color="primary" sx={{fontWeight: 700}}>TỔNG ĐIỂM</Typography><Typography sx={{fontSize: '1.75rem', fontWeight: 700}}>{percentage(report.total.percentage)} <Box component="span" sx={{fontSize: '1.1rem'}}>· {report.total.score ?? '—'} / {report.total.maxScore ?? '—'}</Box></Typography></Box>
        <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1}}>
          {skills.map(skill => { const score = report.skills.find(item => item.code === skill.code); return <Box key={skill.code} sx={{bgcolor: 'background.default', p: 1.5, borderRadius: 2}}><Typography variant="body2" sx={{fontWeight: 700}}>{skill.label}</Typography><Typography variant="body2" color="text.secondary">{score?.score ?? '—'} / {score?.maxScore ?? '—'}</Typography><Typography sx={{fontSize: '1.375rem', fontWeight: 700, color: 'primary.main'}}>{percentage(score?.percentage)}</Typography></Box>; })}
          <Box sx={{bgcolor: 'background.default', p: 1.5, borderRadius: 2}}><Typography variant="body2" sx={{fontWeight: 700}}>Tổng điểm</Typography><Typography variant="body2" color="text.secondary">{report.total.score ?? '—'} / {report.total.maxScore ?? '—'}</Typography><Typography sx={{fontSize: '1.375rem', fontWeight: 700, color: 'primary.main'}}>{percentage(report.total.percentage)}</Typography></Box>
        </Box>
      </Section>
      <Section title={`Biểu đồ tiến độ theo kỹ năng${entries.length ? ` (Unit ${entries[0].unitOrder}–${entries[entries.length - 1].unitOrder})` : ""}`}>{progressFeedback ?? <DeferredCharts entries={entries}/>}</Section>
    </Box>
    <Section title="Bảng điểm chi tiết theo từng Unit">
      {progressFeedback ?? <TableContainer><Table size="small" aria-label="Bảng điểm phần trăm theo Unit"><TableHead><TableRow><TableCell>Kỹ năng</TableCell>{entries.map(e => <TableCell key={e.unitId} align="right">{e.unitName}</TableCell>)}<TableCell align="right">Điểm {unitName}</TableCell></TableRow></TableHead><TableBody>
        {[...skills, {code: 'total', label: 'Tổng điểm', color: ''}].map(skill => {const result = skill.code === 'total' ? report.total : report.skills.find(s => s.code === skill.code); return <TableRow key={skill.code} sx={skill.code === 'total' ? {bgcolor: 'action.selected'} : undefined}><TableCell component="th" scope="row" sx={{fontWeight: 600}}>{skill.label}</TableCell>{entries.map(e => <TableCell key={e.unitId} align="right">{percentage(skill.code === 'total' ? e.totalPercentage : e.skills[skill.code as keyof typeof e.skills])}</TableCell>)}<TableCell align="right" sx={{whiteSpace: 'nowrap'}}>{result?.score ?? '—'} / {result?.maxScore ?? '—'}</TableCell></TableRow>;})}
      </TableBody></Table></TableContainer>}
      <Typography variant="body2" color="text.secondary" sx={{mt: 1.5}}>—: chưa có dữ liệu. Tỷ lệ điểm không phải phần trăm hoàn thành khóa học.</Typography>
    </Section>
    <Section title="Thay đổi điểm theo từng kỹ năng qua các Unit">
      <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>Chênh lệch tỷ lệ điểm giữa hai Unit liên tiếp, tính theo điểm phần trăm.</Typography>
      {progressFeedback ?? <DeferredCharts entries={entries} deltas/>}
    </Section>
    <Section title={`Nhận xét theo từng kỹ năng (${unitName})`}><Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: '1fr 1fr'}, gap: 1.5}}>{skills.map(skill => {const score = report.skills.find(item => item.code === skill.code); return <Box key={skill.code} sx={{p: 2, bgcolor: 'background.default', borderRadius: 2}}><Typography sx={{fontWeight: 700, mb: .75}}>{skill.label} · {percentage(score?.percentage)}</Typography><Typography color="text.secondary" sx={{whiteSpace: 'pre-line'}}>{score?.comment || 'Chưa có nhận xét cho kỹ năng này.'}</Typography></Box>;})}</Box></Section>
    <Section title="Nhận xét tổng thể"><Typography color="text.secondary" sx={{whiteSpace: 'pre-line'}}>{report.overallComment || 'Chưa có nhận xét tổng thể.'}</Typography><Typography variant="h6" component="h3" sx={{mt: 3}}>💡 Một số lời khuyên</Typography>{report.advice.length ? <Box component="ul" sx={{pl: 2.5, mb: 0}}>{report.advice.map((text, i) => <Typography component="li" key={i} color="text.secondary" sx={{my: .75}}>{text}</Typography>)}</Box> : <Typography color="text.secondary" sx={{mt: 1}}>Chưa có lời khuyên cho Unit này.</Typography>}</Section>
  </Box>;
}
