"use client";
import { useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { Card, Feedback } from "@/shared/ui";
import { useUnsaved } from "@/shared/unsaved";
import { policiesApi, type PortalPolicy } from "@/api/portal-policies-api";
export function PortalPoliciesSettings() {
  const q = policiesApi.usePortalPoliciesQuery();
  return (
    <Stack spacing={2}>
      <Typography variant="h6">Ảnh & nhật ký</Typography>
      <Feedback
        error={q.error}
        loading={q.isLoading}
        retry={() => void q.refetch()}
      />
      {q.data && <PolicyForm key={q.data.version} initial={q.data} />}
      <AuditDeletion />
    </Stack>
  );
}
function PolicyForm({ initial }: { initial: PortalPolicy }) {
  const [draft, setDraft] = useState(initial),
    [reason, setReason] = useState(""),
    [success, setSuccess] = useState(false),
    [save, state] = policiesApi.useSavePortalPoliciesMutation();
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useUnsaved(dirty);
  return (
    <Card>
      <Stack
        component="form"
        spacing={1.5}
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            draft.audit.enabled &&
            !window.confirm(
              `Chỉ giữ ${draft.audit.limit} nhật ký mới nhất. ${draft.audit.deleteMode === "HARD" ? "Xóa thật không thể hoàn tác." : "Nhật ký cũ sẽ ẩn khỏi giao diện."} Tiếp tục?`,
            )
          )
            return;
          try {
            await save({ ...draft, reason }).unwrap();
            setSuccess(true);
          } catch {}
        }}
      >
        <Typography variant="subtitle1">Ảnh upload mới</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          {(["maxWidth", "maxHeight"] as const).map((field) => (
            <TextField
              key={field}
              label={
                field === "maxWidth"
                  ? "Chiều rộng tối đa (px)"
                  : "Chiều cao tối đa (px)"
              }
              type="number"
              value={draft.images[field]}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  images: { ...d.images, [field]: Number(e.target.value) },
                }))
              }
              slotProps={{
                htmlInput: {
                  min: 256,
                  max: field === "maxWidth" ? 7680 : 4320,
                },
              }}
              required
            />
          ))}
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            select
            label="Định dạng nén"
            value={draft.images.format}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                images: {
                  ...d.images,
                  format: e.target.value as PortalPolicy["images"]["format"],
                },
              }))
            }
          >
            {["AVIF", "WEBP", "JPEG"].map((v) => (
              <MenuItem key={v} value={v}>
                {v}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Chất lượng"
            type="number"
            value={draft.images.quality}
            slotProps={{ htmlInput: { min: 30, max: 95 } }}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                images: { ...d.images, quality: Number(e.target.value) },
              }))
            }
          />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Giữ tỷ lệ ảnh, không phóng to. Ảnh vượt kích thước sẽ được nén; ảnh đã
          có giữ nguyên. Thumbnail có ba kích thước 256, 640, 1280 px và được
          tính dung lượng.
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={draft.audit.enabled}
              onChange={(_, enabled) =>
                setDraft((d) => ({ ...d, audit: { ...d.audit, enabled } }))
              }
            />
          }
          label="Tự dọn nhật ký cũ khi có nhật ký mới"
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            type="number"
            label="Số nhật ký giữ lại"
            value={draft.audit.limit}
            slotProps={{ htmlInput: { min: 1, max: 1000000 } }}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                audit: { ...d.audit, limit: Number(e.target.value) },
              }))
            }
          />
          <TextField
            select
            label="Cách xóa"
            value={draft.audit.deleteMode}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                audit: {
                  ...d.audit,
                  deleteMode: e.target.value as "SOFT" | "HARD",
                },
              }))
            }
          >
            <MenuItem value="SOFT">Xóa mềm</MenuItem>
            <MenuItem value="HARD">Xóa thật</MenuItem>
          </TextField>
        </Stack>
        <TextField
          label="Ghi chú chính sách"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
        <Feedback error={state.error} />
        {success && <Alert severity="success">Đã lưu cấu hình.</Alert>}
        <Button
          type="submit"
          loading={state.isLoading}
          disabled={!dirty || !reason.trim()}
          variant="contained"
        >
          Lưu
        </Button>
      </Stack>
    </Card>
  );
}
function AuditDeletion() {
  const [before, setBefore] = useState(""),
    [mode, setMode] = useState<"SOFT" | "HARD">("SOFT"),
    [reason, setReason] = useState(""),
    [preview, state] = policiesApi.usePreviewAuditDeletionMutation(),
    [commit, committing] = policiesApi.useCommitAuditDeletionMutation(),
    [open, setOpen] = useState(false),
    [message, setMessage] = useState("");
  return (
    <Card>
      <Stack spacing={1.5}>
        <Typography variant="h6">Xóa nhật ký thay đổi</Typography>
        <TextField
          label="Nhật ký trước ngày"
          type="datetime-local"
          value={before}
          onChange={(e) => {
            setBefore(e.target.value);
            state.reset();
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          select
          label="Cách xóa"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as typeof mode);
            state.reset();
          }}
        >
          <MenuItem value="SOFT">Xóa mềm</MenuItem>
          <MenuItem value="HARD">Xóa thật</MenuItem>
        </TextField>
        <TextField
          label="Lý do"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Feedback error={state.error || committing.error} />
        {message && <Alert severity="success">{message}</Alert>}
        <Button
          disabled={!before || !reason.trim()}
          loading={state.isLoading}
          onClick={async () => {
            try {
              await preview({
                before: new Date(before).toISOString(),
                mode,
              }).unwrap();
              setOpen(true);
            } catch {}
          }}
        >
          Xem trước
        </Button>
      </Stack>
      <Dialog
        open={open}
        onClose={() => !committing.isLoading && setOpen(false)}
      >
        <DialogTitle>Xác nhận xóa nhật ký</DialogTitle>
        <DialogContent>
          <Typography>
            {state.data?.count ?? 0} nhật ký.{" "}
            {mode === "HARD"
              ? "Xóa thật không thể hoàn tác."
              : "Giữ bản ghi nhưng ẩn khỏi giao diện."}
          </Typography>
          <Feedback error={committing.error} />
        </DialogContent>
        <DialogActions>
          <Button
            disabled={committing.isLoading}
            onClick={() => setOpen(false)}
          >
            Hủy
          </Button>
          <Button
            color="error"
            disabled={!state.data?.count}
            loading={committing.isLoading}
            onClick={async () => {
              try {
                const result = await commit({
                  previewId: state.data!.previewId,
                  reason,
                }).unwrap();
                setMessage(`Đã xóa ${result.deleted} nhật ký.`);
                setOpen(false);
                state.reset();
              } catch {}
            }}
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
