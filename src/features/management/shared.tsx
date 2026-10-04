"use client";
import { useState, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCommitChangesMutation } from "@/api/management-api";
import { errorMessage } from "@/api/base-query";
import { capabilities } from "@/features/access/capabilities";
import { useWorkspace } from "@/features/access/hooks";
import { Card, Feedback } from "@/shared/ui";
import { confirmLeave, useUnsaved } from "@/shared/unsaved";
import type { BulkPreview, Entity, ManagedRecord } from "./models";
import { fieldNames } from "./validation";
export const entityLabels: Record<Entity, string> = {
  students: "Học sinh",
  teachers: "Giảng viên / Staff",
  classes: "Lớp học",
  accounts: "Tài khoản",
  labels: "Nhãn phụ trách",
};
export const statusLabels: Record<string, string> = {
  ACTIVE: "Hoạt động",
  PAUSED: "Tạm dừng",
  INACTIVE: "Ngừng hoạt động",
  COMPLETED: "Hoàn thành",
  DRAFT: "Nháp",
  ENDED: "Đã kết thúc",
  PENDING: "Chờ kích hoạt",
  LOCKED: "Đã khóa",
};
export const showValue = (value: unknown): string =>
  value === null || value === "" || value === undefined
    ? "—"
    : Array.isArray(value)
      ? value.join(" | ")
      : typeof value === "string"
        ? (statusLabels[value] ?? value)
        : String(value);
export function ManagerOnly({ children }: { children: ReactNode }) {
  const { staff, selected } = useWorkspace();
  return capabilities(staff, selected).manage ? (
    <>{children}</>
  ) : (
    <Feedback
      error={new Error("Cần không gian Quản lý và vai trò MANAGER hoạt động.")}
    />
  );
}
export function PreviewPanel({
  preview,
  onSaved,
  close,
}: {
  preview: BulkPreview;
  onSaved: (count: number) => void;
  close: () => void;
}) {
  const [confirmations, setConfirmations] = useState<string[]>([]),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [commit, state] = useCommitChangesMutation();
  useUnsaved(preview.count > 0);
  const names: Record<string, string> = {
    STATUS_IMPACT: "Tôi xác nhận ảnh hưởng đổi trạng thái và thao tác mềm",
    ASSIGNMENT_IMPACT:
      "Tôi xác nhận kết thúc các phân công hiện tại bị ảnh hưởng",
    INCOMPLETE_CLASS: "Tôi xác nhận ngoại lệ hoàn thành lớp chưa đủ Unit",
    RELATIONSHIP_IMPACT:
      "Tôi xác nhận thay đổi phân công / ghi danh và lưu lịch sử",
  };
  return (
    <Stack spacing={2}>
      <Alert severity={preview.errors.length ? "error" : "info"}>
        {preview.scope} · {preview.count} bản ghi · {preview.errors.length} lỗi.
        Chưa ghi dữ liệu.
      </Alert>
      {error && <Alert severity="error">{error}</Alert>}
      {preview.warnings.map((w, i) => (
        <Alert key={i} severity="warning">
          {w}
        </Alert>
      ))}
      {preview.errors.length > 0 && (
        <Card>
          <Typography variant="h6">Lỗi cần sửa</Typography>
          {preview.errors.map((e, i) => (
            <Typography key={i} color="error" sx={{ my: 1 }}>
              Dòng {e.row} · {fieldNames[e.column] ?? e.column}: {e.message}
            </Typography>
          ))}
          <Button
            onClick={async () => {
              try {
                const { errorsWorkbook } = await import("./excel-workbook"),
                  { download } = await import("@/features/excel/workbook");
                download(
                  await errorsWorkbook(preview.errors),
                  "ESS_loi_nhap.xlsx",
                );
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            Tải danh sách lỗi .xlsx
          </Button>
        </Card>
      )}
      {preview.changes.length > 0 && (
        <TableContainer
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            maxHeight: 360,
          }}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow>
                {["Dòng / ID", "Thuộc tính", "Trước → Sau"].map((x) => (
                  <TableCell key={x}>{x}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {preview.changes.flatMap((c) =>
                Object.entries(c.after)
                  .filter(
                    ([k, v]) =>
                      ![
                        "createdAt",
                        "updatedAt",
                        "version",
                        "studentCount",
                        "completedUnits",
                      ].includes(k) &&
                      JSON.stringify(v) !==
                        JSON.stringify(
                          (
                            c.before as unknown as Record<
                              string,
                              unknown
                            > | null
                          )?.[k],
                        ),
                  )
                  .map(([key, value]) => (
                    <TableRow key={`${c.entity}:${c.id}:${key}`}>
                      <TableCell>
                        {c.row ?? ""} · {c.id}
                      </TableCell>
                      <TableCell>{fieldNames[key] ?? key}</TableCell>
                      <TableCell sx={{ whiteSpace: "pre-wrap" }}>
                        {showValue(
                          (
                            c.before as unknown as Record<
                              string,
                              unknown
                            > | null
                          )?.[key],
                        )}{" "}
                        → {showValue(value)}
                      </TableCell>
                    </TableRow>
                  )),
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {!!preview.impacts.length && (
        <Card>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Ảnh hưởng đến {preview.impacts.length} lớp
          </Typography>
          <Stack spacing={2}>
            {preview.impacts.map((i) => (
              <Box key={i.classId}>
                <Typography sx={{ fontWeight: 600 }}>{i.className}</Typography>
                <Typography>
                  {i.remainingTeachers.length
                    ? `Người phụ trách còn lại: ${i.remainingTeachers.join(", ")}`
                    : "Không còn giảng viên hợp lệ"}
                </Typography>
                {i.afterUnstaffed && (
                  <Alert severity="warning">
                    Lớp đang học sẽ xuất hiện trong cảnh báo trống giảng viên.
                  </Alert>
                )}
                <Typography variant="body2" color="text.secondary">
                  {i.message}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Card>
      )}
      <Typography variant="body2" color="text.secondary">
        Giữ hồ sơ, điểm, báo cáo và lịch sử. Khôi phục không tự khôi phục phân
        công hoặc ghi danh.
      </Typography>
      {preview.requiredConfirmations.map((c) => (
        <FormControlLabel
          key={c}
          control={
            <Checkbox
              checked={confirmations.includes(c)}
              onChange={(_, checked) =>
                setConfirmations((old) =>
                  checked ? [...old, c] : old.filter((v) => v !== c),
                )
              }
            />
          }
          label={names[c] ?? c}
        />
      ))}
      <TextField
        label={
          preview.requiredConfirmations.length
            ? "Lý do thay đổi (bắt buộc)"
            : "Lý do / ghi chú nhật ký"
        }
        multiline
        minRows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <Stack direction="row" spacing={1}>
        <Button disabled={state.isLoading} onClick={close}>
          Quay lại chỉnh sửa
        </Button>
        <Button
          variant="contained"
          loading={state.isLoading}
          disabled={
            !!preview.errors.length ||
            !preview.count ||
            preview.requiredConfirmations.some(
              (c) => !confirmations.includes(c),
            ) ||
            (!!preview.requiredConfirmations.length && !reason.trim())
          }
          onClick={async () => {
            try {
              setError("");
              const result = await commit({
                previewId: preview.previewId,
                version: preview.version,
                confirmations,
                reason,
                key: `ess-${preview.previewId}`,
              }).unwrap();
              onSaved(result.updated);
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        >
          Xác nhận cập nhật {preview.count} bản ghi
        </Button>
      </Stack>
    </Stack>
  );
}
export function PreviewDialog({
  preview,
  close,
  onSaved,
}: {
  preview: BulkPreview;
  close: () => void;
  onSaved: (count: number) => void;
}) {
  return (
    <Dialog
      open
      fullWidth
      maxWidth="md"
      onClose={() => {
        if (confirmLeave()) close();
      }}
    >
      <DialogTitle>Xem trước & xác nhận ảnh hưởng</DialogTitle>
      <DialogContent>
        <PreviewPanel
          key={preview.previewId}
          preview={preview}
          close={close}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  );
}
export function recordData(record: ManagedRecord): Record<string, unknown> {
  return { ...record };
}
