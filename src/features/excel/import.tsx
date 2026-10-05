"use client";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import {
  useLazyTemplateQuery,
  usePreviewImportMutation,
  useCommitImportMutation,
} from "@/api/api";
import { errorMessage } from "@/api/base-query";
import { Card, Feedback, NavButton, Title } from "@/shared/ui";
import { useUnsaved } from "@/shared/unsaved";
import { route } from "@/utils/context";
import { calculate, percent } from "@/utils/scores";
import {
  skillNames,
  type ImportPreview,
  type StudentResult,
  type SkillSchema,
} from "@/types";
import { useScoreContext } from "@/features/scores/context";
function ResultPreview({
  label,
  result,
  skills,
}: {
  label: string;
  result: StudentResult;
  skills: SkillSchema[];
}) {
  const total = calculate(result, skills);
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="h6">{label}</Typography>
      <Typography>
        {result.attendance} · {total.score ?? "—"}/{total.max} ·{" "}
        {percent(total.percentage)} · {total.entered}/{total.count} phần
      </Typography>
      {skills.map((s) => {
        const r = result.skillResults.find((r) => r.skillCode === s.skillCode);
        return (
          <Box
            key={s.skillCode}
            sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}
          >
            <Typography
              sx={{
                fontWeight: 600,
              }}
            >
              {skillNames[s.skillCode]}: {r?.score ?? "—"}/{s.maxQuestions}
            </Typography>
            <Typography
              sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              Nhận xét: {r?.comment || "—"}
            </Typography>
            <Typography
              sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              Lời khuyên: {r?.advice || "—"}
            </Typography>
          </Box>
        );
      })}
      <Typography sx={{ whiteSpace: "pre-wrap" }}>
        Nhận xét tổng: {result.overallComment || "—"}
      </Typography>
      <Typography sx={{ whiteSpace: "pre-wrap" }}>
        Lời khuyên tổng: {result.overallAdvice || "—"}
      </Typography>
    </Box>
  );
}
export function ExcelImport() {
  const q = useScoreContext(),
    [template, t] = useLazyTemplateQuery(),
    [preview, p] = usePreviewImportMutation(),
    [commit, c] = useCommitImportMutation(),
    [file, setFile] = useState<File | null>(null),
    [mode, setMode] = useState<ImportPreview["mode"]>("MERGE_NON_EMPTY"),
    [data, setData] = useState<ImportPreview | null>(null),
    [key, setKey] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useUnsaved(!!data?.changes.length && !message);
  if (q.loading || q.error || q.empty)
    return (
      <Feedback
        loading={q.loading}
        error={q.error}
        empty={q.empty}
        retry={q.retry}
      />
    );
  const a = q.assessment;
  if (!a) return <Feedback empty="Không có bài đánh giá." />;
  const busy = t.isFetching || p.isLoading || c.isLoading,
    locked = !q.canEdit || a.status === "COMPLETED";
  return (
    <>
      <Title
        title="Import từ Excel"
        subtitle={`${a.name} · Tải mẫu theo schema v${a.schemaVersion} hiện tại.`}
        actions={
          <NavButton href={route("/scores/", q.context)}>← Bảng điểm</NavButton>
        }
      />
      <Stack
        sx={{
          gap: 2.5,
        }}
      >
        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {locked && (
          <Alert severity="info">
            Chỉ xem: quyền giảng viên/phân công hoặc trạng thái bài chưa cho phép import.
          </Alert>
        )}
        <Card>
          <Stack
            sx={{
              gap: 2,
            }}
          >
            <Typography variant="h5">1. Tải file mẫu</Typography>
            <Typography color="text.secondary">
              Mẫu có danh sách học sinh, điểm, nhận xét và lời khuyên theo đúng
              cấu hình. Không sửa ID, Schema hoặc tên cột.
            </Typography>
            <Button
              sx={{ alignSelf: "flex-start" }}
              variant="outlined"
              loading={t.isFetching}
              disabled={busy}
              onClick={async () => {
                try {
                  setError("");
                  const blob = await template(a.id).unwrap();
                  const { download } = await import("./workbook");
                  download(blob, `ESS_${a.id}.xlsx`);
                } catch (e) {
                  setError(errorMessage(e));
                }
              }}
            >
              Tải file mẫu .xlsx
            </Button>
          </Stack>
        </Card>
        <Card>
          <Stack
            sx={{
              gap: 2,
            }}
          >
            <Typography variant="h5">2. Chọn file đã điền</Typography>
            <Typography color="text.secondary">
              File .xlsx, tối đa 5 MB. Nhận xét tiếng Việt và xuống dòng được
              giữ nguyên.
            </Typography>
            <Button
              component="label"
              variant="contained"
              sx={{ alignSelf: "flex-start" }}
              disabled={busy || locked}
            >
              Chọn file Excel
              <input
                aria-label="File Excel"
                type="file"
                accept=".xlsx"
                hidden
                onChange={(e) => {
                  const chosen = e.target.files?.[0];
                  setData(null);
                  setMessage("");
                  setError("");
                  if (!chosen) return;
                  if (
                    !chosen.name.toLowerCase().endsWith(".xlsx") ||
                    chosen.size > 5 * 1024 * 1024
                  ) {
                    setError("Chỉ nhận file .xlsx tối đa 5 MB.");
                    setFile(null);
                  } else setFile(chosen);
                }}
              />
            </Button>
            <Typography>{file?.name || "Chưa chọn file."}</Typography>
            <FormControlLabel
              label="Thay thế toàn bộ dữ liệu trong các dòng nhập (ô trống sẽ xóa dữ liệu cũ)"
              control={
                <Checkbox
                  checked={mode === "REPLACE_ALL"}
                  disabled={busy || locked}
                  onChange={(_, value) => {
                    if (
                      value &&
                      !window.confirm(
                        "Chế độ thay thế sẽ xóa dữ liệu cũ tại các ô trống. Xác nhận chọn?",
                      )
                    )
                      return;
                    setMode(value ? "REPLACE_ALL" : "MERGE_NON_EMPTY");
                    setData(null);
                    setMessage("");
                  }}
                />
              }
            />
            <Alert severity="info">
              {mode === "MERGE_NON_EMPTY"
                ? "Mặc định: ô trống giữ dữ liệu cũ; số 0 vẫn cập nhật."
                : "Thay thế: mọi ô trống trong dòng nhập sẽ xóa dữ liệu cũ."}{" "}
              Tổng điểm luôn được tính lại, không dùng giá trị công thức trong
              file.
            </Alert>
            <Button
              variant="contained"
              sx={{ alignSelf: "flex-start" }}
              disabled={!file || busy || locked}
              loading={p.isLoading}
              onClick={async () => {
                if (!file) return;
                try {
                  setError("");
                  setMessage("");
                  setData(null);
                  const response = await preview({
                    assessmentId: a.id,
                    file,
                    mode,
                  }).unwrap();
                  setData(response);
                  setKey(crypto.randomUUID());
                } catch (e) {
                  setError(errorMessage(e));
                }
              }}
            >
              Kiểm tra dữ liệu
            </Button>
          </Stack>
        </Card>
        {data && (
          <Card>
            <Stack
              sx={{
                gap: 2,
              }}
            >
              <Typography variant="h5">3. Kiểm tra và xác nhận</Typography>
              <Typography>
                {data.changes.length} học sinh thay đổi · {data.errors.length}{" "}
                lỗi · Preview hết hạn{" "}
                {new Date(data.expiresAt).toLocaleTimeString("vi-VN")}
              </Typography>
              {!!data.errors.length && (
                <>
                  <Alert severity="error">
                    File có lỗi, chưa thể import. Sửa file và kiểm tra lại.
                  </Alert>
                  <TableContainer>
                    <Table aria-label="Lỗi import">
                      <TableHead>
                        <TableRow>
                          <TableCell>Dòng</TableCell>
                          <TableCell>Cột</TableCell>
                          <TableCell>Lỗi</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.errors.map((e, i) => (
                          <TableRow key={i}>
                            <TableCell>{e.row}</TableCell>
                            <TableCell>{e.column}</TableCell>
                            <TableCell>{e.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Button
                    onClick={async () => {
                      try {
                        const { download, errorWorkbook } =
                          await import("./workbook");
                        download(
                          await errorWorkbook(data.errors),
                          "ESS_loi_import.xlsx",
                        );
                      } catch (e) {
                        setError(errorMessage(e));
                      }
                    }}
                  >
                    Tải danh sách lỗi .xlsx
                  </Button>
                </>
              )}
              {data.changes.map((change) => (
                <Accordion key={change.studentId}>
                  <AccordionSummary expandIcon="↓">
                    <Typography>
                      {q.students.find((s) => s.id === change.studentId)?.name}{" "}
                      · {change.studentId}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      sx={{
                        gap: 3,
                      }}
                    >
                      <ResultPreview
                        label="Trước"
                        result={change.before}
                        skills={a.skills}
                      />
                      <ResultPreview
                        label="Sau"
                        result={change.after}
                        skills={a.skills}
                      />
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
              {!data.changes.length && !data.errors.length && (
                <Feedback empty="Không có dữ liệu thay đổi." />
              )}
              <Button
                variant="contained"
                sx={{ alignSelf: "flex-start" }}
                disabled={
                  busy || locked || !!data.errors.length || !data.changes.length
                }
                loading={c.isLoading}
                onClick={async () => {
                  if (
                    !window.confirm(
                      `Xác nhận import ${data.changes.length} học sinh${mode === "REPLACE_ALL" ? " và xóa dữ liệu ở các ô trống" : ""}?`,
                    )
                  )
                    return;
                  try {
                    setError("");
                    const saved = await commit({
                      assessmentId: a.id,
                      previewId: data.previewId,
                      mode,
                      key,
                    }).unwrap();
                    setMessage(`Import thành công: ${saved.updated} học sinh.`);
                    setData(null);
                    setFile(null);
                  } catch (e) {
                    setError(errorMessage(e));
                  }
                }}
              >
                Xác nhận import
              </Button>
            </Stack>
          </Card>
        )}
        <Typography color="text.secondary" variant="body2">
          Chưa ghi dữ liệu cho đến khi bạn xác nhận. Nếu điểm hoặc schema thay
          đổi trong lúc chuẩn bị, hãy tải mẫu mới.
        </Typography>
      </Stack>
    </>
  );
}
