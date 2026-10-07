"use client";
import { createContext, Suspense, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Remove from "@mui/icons-material/Remove";
import Add from "@mui/icons-material/Add";
import Help from "@mui/icons-material/HelpOutlined";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { pageGuide } from "./content";
export const zoomLevels = [75, 85, 100, 115, 125] as const;
const Display = createContext({ zoom: 100, open: false, setZoom: (value: number) => { void value; }, toggle: () => {} });
export function AppDisplayProvider({ children, storageKey }: { children: ReactNode; storageKey: string }) {
  const [zoom, changeZoom] = useState(100), [open, setOpen] = useState(false);
  useEffect(() => { try { const saved = Number(localStorage.getItem(storageKey)); if ((zoomLevels as readonly number[]).includes(saved)) changeZoom(saved); } catch {} }, [storageKey]);
  const setZoom = (value: number) => { if (!(zoomLevels as readonly number[]).includes(value)) return; changeZoom(value); try { localStorage.setItem(storageKey, String(value)); } catch {} };
  return <Display.Provider value={{ zoom, setZoom, open, toggle: () => setOpen((value) => !value) }}>{children}</Display.Provider>;
}
export const useAppDisplay = () => useContext(Display);
export function DisplayTools() {
  const display = useAppDisplay(), index = (zoomLevels as readonly number[]).indexOf(display.zoom);
  return <Stack direction="row" useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", gap: .5 }} aria-label="Hướng dẫn và kích thước giao diện">
    <IconButton aria-label="Thu nhỏ giao diện" disabled={index === 0} onClick={() => display.setZoom(zoomLevels[index - 1])}><Remove /></IconButton>
    <Button aria-label="Đặt lại kích thước 100%" onClick={() => display.setZoom(100)}>{display.zoom}%</Button>
    <IconButton aria-label="Phóng to giao diện" disabled={index === zoomLevels.length - 1} onClick={() => display.setZoom(zoomLevels[index + 1])}><Add /></IconButton>
    <Tooltip title={display.open ? "Ẩn hướng dẫn" : "Hướng dẫn"}><IconButton aria-label={display.open ? "Ẩn hướng dẫn" : "Hướng dẫn"} color={display.open ? "primary" : "default"} aria-controls="page-guide" aria-expanded={display.open} onClick={display.toggle}><Help /></IconButton></Tooltip>
  </Stack>;
}
export function AppScale({ children }: { children: ReactNode }) {
  const { zoom } = useAppDisplay();
  return <Box data-testid="application-scale" data-zoom={zoom} sx={{ zoom: zoom / 100 }}>{children}</Box>;
}
export function GuideLayout({ children, workspace }: { children: ReactNode; workspace?: string | null }) {
  const { open } = useAppDisplay();
  return <Box sx={{ display: { md: "grid" }, gridTemplateColumns: open ? "minmax(0,1fr) 320px" : "minmax(0,1fr)", alignItems: "start", gap: 2 }}>
    <Box sx={{ minWidth: 0, pb: open ? { xs: "46vh", md: 0 } : 0 }}>{children}</Box>
    {open && <Suspense fallback={<Typography>Đang tải hướng dẫn…</Typography>}><GuidePanel workspace={workspace} /></Suspense>}
  </Box>;
}
function Illustration({ kind }: { kind: string }) {
  return <Box sx={{ bgcolor: "action.selected", borderRadius: 2, p: 1.5, my: 1 }}>
    <Typography variant="caption" color="text.secondary">Minh họa · không phải dữ liệu của tài khoản</Typography>
    {kind === "chart" ? <svg viewBox="0 0 270 110" role="img" aria-label="Minh họa đường điểm qua các Unit" style={{ width: "100%", display: "block" }}><path d="M25 10V85H260" fill="none" stroke="currentColor" opacity=".4"/><path d="M35 65C65 65 75 25 110 25S160 50 195 50S235 20 255 20" fill="none" stroke="#2786e8" strokeWidth="3"/>{[[35,65],[110,25],[195,50],[255,20]].map(([x,y]) => <circle key={x} cx={x} cy={y} r="4" fill="#2786e8"/>)}<text x="30" y="104" fill="currentColor" fontSize="12">U1</text><text x="105" y="104" fill="currentColor" fontSize="12">U2</text><text x="190" y="104" fill="currentColor" fontSize="12">U3</text></svg> : <Stack direction="row" sx={{ gap: .5, mt: 1, flexWrap: "wrap" }}>{(kind === "workflow" ? ["Nháp", "Hoàn thành", "Công bố", "Báo cáo"] : kind === "table" ? ["Học sinh", "Điểm 0 / 4", "Nhận xét", "Lưu"] : kind === "report" ? ["Lớp học", "Unit", "66%", "Nhận xét"] : ["1. Nhập", "2. Kiểm tra", "3. Xác nhận"]).map((label, index) => <Box key={label} sx={{ border: 1, borderColor: "divider", bgcolor: "background.paper", borderRadius: 1, px: 1, py: .75, fontSize: 12 }}>{index + 1} · {label}</Box>)}</Stack>}
  </Box>;
}
function GuidePanel({ workspace }: { workspace?: string | null }) {
  const pathname = usePathname(), params = useSearchParams(), { toggle } = useAppDisplay();
  const guide = pageGuide(pathname, params.get("entity"), workspace);
  return <Paper id="page-guide" component="aside" aria-label="Hướng dẫn màn hình hiện tại" sx={{ position: { xs: "fixed", md: "sticky" }, bottom: { xs: 0, md: "auto" }, left: { xs: 0, md: "auto" }, right: { xs: 0, md: "auto" }, top: { md: 16 }, zIndex: { xs: 1100, md: "auto" }, maxHeight: { xs: "42vh", md: "calc(100vh - 32px)" }, overflowY: "auto", p: 2, border: 1, borderColor: "divider", boxShadow: { xs: 5, md: 0 } }}>
    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", position: "sticky", top: -16, bgcolor: "background.paper", py: 1, zIndex: 1 }}><Typography component="h2" variant="h6">Hướng dẫn</Typography><Button onClick={toggle}>Ẩn hướng dẫn</Button></Stack>
    <Typography component="h3" sx={{ fontWeight: 700 }}>{guide.title}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{guide.intro}</Typography>
    {guide.steps.map((step, index) => <Box key={step.title} sx={{ mt: 2 }}><Typography component="h4" sx={{ fontWeight: 700 }}>{index + 1}. {step.title}</Typography>{step.illustration && <Illustration kind={step.illustration} />}{step.text.map((text) => <Typography key={text} variant="body2" sx={{ mt: .75 }}>{text}</Typography>)}</Box>)}
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>Bạn có thể thao tác ở nội dung chính trong khi xem hướng dẫn. Trên điện thoại, hướng dẫn nằm ở phía dưới và có vùng cuộn riêng. Thu/phóng chỉ đổi cách hiển thị, giữ nguyên dữ liệu.</Typography>
  </Paper>;
}
