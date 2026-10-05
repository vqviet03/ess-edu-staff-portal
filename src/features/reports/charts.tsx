'use client';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, Rectangle, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { changes, percentage, skills } from './utils';
import type { ProgressEntry } from './models';
export default function Charts({entries, deltas}: {entries: ProgressEntry[]; deltas: boolean}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const toggle = (code: string) => setHidden(current => current.includes(code) ? current.filter(item => item !== code) : [...current, code]);
  const choices = deltas ? [...skills, {code: 'total', label: 'Tổng điểm', color: ''}] : skills;
  const controls = <Stack direction="row" useFlexGap sx={{gap: .5, flexWrap: 'wrap', mb: 1.5}} aria-label={deltas ? 'Hiện hoặc ẩn biểu đồ thay đổi' : 'Hiện hoặc ẩn kỹ năng'}>{choices.map(skill => <Button key={skill.code} size="small" variant={hidden.includes(skill.code) ? 'outlined' : 'contained'} aria-pressed={!hidden.includes(skill.code)} aria-label={`${hidden.includes(skill.code) ? 'Hiện' : 'Ẩn'} ${skill.label}${deltas ? ' · thay đổi' : ''}`} onClick={() => toggle(skill.code)}>{skill.label}</Button>)}<Button onClick={() => setHidden([])}>Hiện tất cả{deltas ? ' biểu đồ thay đổi' : ' kỹ năng'}</Button><Button onClick={() => setHidden(choices.map(skill => skill.code))}>Ẩn tất cả{deltas ? ' biểu đồ thay đổi' : ' kỹ năng'}</Button></Stack>;
  const theme = useTheme(); const tick = {fill: theme.palette.text.secondary, fontSize: 12};
  const tooltipStyle = {backgroundColor: theme.palette.background.paper, color: theme.palette.text.primary, borderColor: theme.palette.divider, borderRadius: 10};
  const data = entries.map(entry => ({name: entry.unitName, ...entry.skills}));
  if (!deltas) return <><Box>{controls}</Box>{hidden.length === skills.length && <Alert severity="info">Tất cả đường đang ẩn. Chọn kỹ năng để hiển thị lại.</Alert>}<Box data-testid="skills-chart" sx={{height: 370, width: '100%', minWidth: 0}}><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{top: 12, right: 12, left: -20, bottom: 0}} accessibilityLayer>
    <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3"/><XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false}/><YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickFormatter={n => `${n}%`} tick={tick} axisLine={false} tickLine={false}/>
    <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [percentage(value == null ? null : Number(value)), name]}/><Legend wrapperStyle={{fontSize: 12, paddingTop: 14}} iconType="circle"/>
    {skills.map(skill => <Line key={skill.code} hide={hidden.includes(skill.code)} name={skill.label} dataKey={skill.code} type="monotone" stroke={skill.color} strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} connectNulls={false} isAnimationActive={false}/>)}
  </LineChart></ResponsiveContainer></Box></>;
  return <>{controls}{hidden.length === choices.length && <Alert severity="info">Tất cả biểu đồ thay đổi đang ẩn. Chọn kỹ năng để hiển thị lại.</Alert>}<Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, minmax(0, 1fr))'}, gap: 1.5}}>
    {[...skills, {code: 'total' as const, label: 'Tổng điểm', color: ''}].filter(skill => !hidden.includes(skill.code)).map(skill => {
      const values = changes(entries, skill.code); const limit = Math.max(80, ...values.map(v => Math.ceil(Math.abs(v.value ?? 0) / 20) * 20));
      return <Box data-testid="change-chart" key={skill.code} sx={{bgcolor: 'background.default', borderRadius: 2, p: 1.5, minWidth: 0}}><Typography sx={{fontWeight: 700, mb: 1}}>{skill.label}</Typography>{!values.length ? <Typography color="text.secondary">Cần ít nhất 2 Unit để so sánh.</Typography> : <Box sx={{height: 215}}><ResponsiveContainer width="100%" height="100%"><BarChart data={values} accessibilityLayer margin={{top: 20, right: 12, bottom: 0, left: -16}}>
        <CartesianGrid stroke={theme.palette.divider} vertical={false}/><XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false}/><YAxis domain={[-limit, limit]} ticks={[-limit, -limit / 2, 0, limit / 2, limit]} tickFormatter={n => `${n}%`} tick={tick} tickLine={false} axisLine={false}/><ReferenceLine y={0} stroke={theme.palette.text.secondary}/>
        <Tooltip contentStyle={tooltipStyle} formatter={value => [value == null ? 'Chưa có dữ liệu' : `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(1)} điểm phần trăm (tỷ lệ Unit sau − Unit trước)`, 'Thay đổi']}/>
        <Bar dataKey="value" shape={<Rectangle/>} maxBarSize={38} isAnimationActive={false}>{values.map((v, i) => <Cell key={i} fill={(v.value ?? 0) < 0 ? '#f16b95' : '#45c49a'}/>)}<LabelList dataKey="value" position="top" formatter={v => v == null ? '—' : `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(1)}%`} fill={theme.palette.text.primary} fontSize={12}/></Bar>
      </BarChart></ResponsiveContainer></Box>}</Box>;
    })}
  </Box></>;
}
