"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import StarOutlined from "@mui/icons-material/StarOutlined";
import Close from "@mui/icons-material/Close";

import FolderOutlined from "@mui/icons-material/FolderOutlined";

import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";

import Refresh from "@mui/icons-material/Refresh";

import {
  useAddGiftMediaMutation,
  useAdjustGiftInventoryMutation,
  useDeleteGiftMutation,
  useGiftCatalogsQuery,
  useGiftDeleteImpactQuery,
  useGiftDeletionQuery,
  useGiftInventoryQuery,
  useGiftOptionsQuery,
  useGiftQuery,
  useGiftVisibilityQuery,
  useImportGiftMediaMutation,
  useReuseGiftCatalogMutation,
  useSaveGiftCatalogMutation,
  useSaveGiftMutation,
  useSaveGiftVisibilityMutation,
} from "@/api/gifts-api";

import { Feedback } from "@/shared/ui";

import { UploadDialog } from "@/features/materials/upload";

import { MaterialBrowser } from "@/features/materials/browser";

import { GiftAction, GiftImage } from "./shared";

import { giftStyles, type Catalog, type Gift } from "./models";

export function CatalogEditor({
  catalog,
  close,
}: {
  catalog?: Catalog;
  close: () => void;
}) {
  const [name, setName] = useState(catalog?.name ?? ""),
    [description, setDescription] = useState(catalog?.description ?? ""),
    [save, state] = useSaveGiftCatalogMutation();
  return (
    <Dialog
      open
      onClose={state.isLoading ? undefined : close}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={giftStyles.title}>
        {catalog ? "Sửa danh sách" : "Tạo danh sách phần thưởng"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Feedback error={state.error} />
          <TextField
            label="Tên danh sách"
            value={name}
            onChange={(e) => setName(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 160 } }}
          />
          <TextField
            label="Mô tả"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={3}
          />
          <Alert severity="info">
            Người tạo là quản lý chính. Có thể thêm giảng viên quản lý và liên
            kết lớp sau khi tạo.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Hủy</Button>
        <Button
          variant="contained"
          disabled={!name.trim() || state.isLoading}
          onClick={() =>
            void save({
              id: catalog?.id,
              name,
              description,
              version: catalog?.version,
            })
              .unwrap()
              .then(close)
              .catch(() => {})
          }
        >
          Lưu danh sách
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function GiftEditor({
  catalog,
  gift,
  close,
}: {
  catalog: Catalog;
  gift?: Gift;
  close: () => void;
}) {
  const [value, setValue] = useState({
      id: gift?.id,
      catalogId: catalog.id,
      name: gift?.name ?? "",
      description: gift?.description ?? "",
      category: gift?.category ?? "",
      points: gift?.points ?? 1,
      quantity: 0,
      status: gift?.status ?? "ACTIVE",
      version: gift?.version ?? 0,
    }),
    [save, state] = useSaveGiftMutation(),
    [upload, setUpload] = useState(false),
    [picker, setPicker] = useState(false),
    [addMedia, addState] = useAddGiftMediaMutation(),
    [importMedia, importState] = useImportGiftMediaMutation(),
    [message, setMessage] = useState("");
  const current = useGiftQuery({ id: value.id ?? "" }, { skip: !value.id }),
    saved = current.currentData,
    files = saved?.fileIds ?? gift?.fileIds ?? [];
  const update = (k: string, v: string | number) =>
    setValue((s) => ({ ...s, [k]: v }));
  async function persist() {
    try {
      const result = await save(value).unwrap();
      setValue((s) => ({ ...s, id: result.id, version: result.version }));
      setMessage("Đã lưu món quà.");
    } catch {}
  }
  return (
    <Dialog
      open
      onClose={state.isLoading ? undefined : close}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle sx={giftStyles.title}>
        {gift ? "Chỉnh sửa món quà" : "Thêm món quà"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Feedback
            error={state.error ?? addState.error ?? importState.error}
          />
          {message && <Alert severity="success">{message}</Alert>}
          <TextField
            label="Tên món quà"
            value={value.name}
            onChange={(e) => update("name", e.target.value)}
            sx={{ maxWidth: 640 }}
          />
          <Stack
            direction={{ xs: "column", sm: "row" }}
            sx={{
              gap: 2,
            }}
          >
            <TextField
              label="Điểm đổi"
              type="number"
              value={value.points}
              onChange={(e) => update("points", Number(e.target.value))}
              sx={{ width: 140 }}
            />
            {!value.id && (
              <TextField
                label="Số lượng ban đầu"
                type="number"
                value={value.quantity}
                onChange={(e) => update("quantity", Number(e.target.value))}
                sx={{ width: 160 }}
              />
            )}
            <TextField
              label="Phân loại"
              value={value.category}
              onChange={(e) => update("category", e.target.value)}
              sx={{ maxWidth: 240 }}
            />
            <TextField
              select
              label="Trạng thái"
              value={value.status}
              onChange={(e) => update("status", e.target.value)}
              sx={{ width: 160 }}
            >
              <MenuItem value="ACTIVE">Đang bật</MenuItem>
              <MenuItem value="HIDDEN">Ẩn</MenuItem>
            </TextField>
          </Stack>
          <TextField
            label="Mô tả"
            value={value.description}
            onChange={(e) => update("description", e.target.value)}
            multiline
            minRows={3}
          />
          <Typography
            sx={{
              fontWeight: 700,
            }}
          >
            Hình ảnh
          </Typography>
          <Stack
            direction="row"
            sx={{
              gap: 1.5,
              flexWrap: "wrap",
            }}
          >
            {files.length ? (
              files.map((id, index) => (
                <Stack key={id} spacing={0.5}>
                  <GiftImage id={id} size={index === 0 ? 160 : 96} />
                  {index === 0 ? (
                    <Typography variant="caption">Ảnh đại diện</Typography>
                  ) : (
                    <GiftAction
                      label="Đặt làm ảnh đại diện"
                      disabled={addState.isLoading}
                      onClick={() =>
                        void Promise.all([
                          addMedia({
                            id: value.id!,
                            fileId: id,
                            position: 0,
                          }).unwrap(),
                          addMedia({
                            id: value.id!,
                            fileId: files[0],
                            position: index,
                          }).unwrap(),
                        ]).catch(() => {})
                      }
                    >
                      <StarOutlined />
                    </GiftAction>
                  )}
                </Stack>
              ))
            ) : (
              <GiftImage size={160} />
            )}
          </Stack>
          <Stack
            direction="row"
            sx={{
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Button
              variant="outlined"
              startIcon={<FileUploadOutlined />}
              disabled={!value.id || files.length >= 5}
              onClick={() => setUpload(true)}
            >
              Tải ảnh lên
            </Button>
            <Button
              variant="outlined"
              startIcon={<FolderOutlined />}
              disabled={!value.id || files.length >= 5}
              onClick={() => setPicker(true)}
            >
              Chọn từ kho
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {value.id
              ? "Ảnh đại diện · Tối đa 5 ảnh. Ảnh được sao chép riêng khi lấy từ kho."
              : "Lưu món quà trước khi thêm hình ảnh và thiết lập lớp hiển thị."}
          </Typography>
          {value.id && (
            <GiftAction
              label="Tải lại hình ảnh"
              onClick={() => void current.refetch()}
            >
              <Refresh />
            </GiftAction>
          )}
          {value.id && <GiftVisibility giftId={value.id} catalog={catalog} />}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close}>Đóng</Button>
        <Button
          variant="contained"
          disabled={!value.name.trim() || value.points < 1 || state.isLoading}
          onClick={() => void persist()}
        >
          Lưu món quà
        </Button>
      </DialogActions>
      {upload && value.id && (
        <UploadDialog
          folderId={null}
          source="reward"
          rewardGiftId={value.id}
          close={() => setUpload(false)}
          added={(f) =>
            void addMedia({
              id: value.id!,
              fileId: f.id,
              position: files.length,
            })
          }
        />
      )}
      <Dialog
        open={picker}
        onClose={() => setPicker(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>Chọn ảnh từ kho</DialogTitle>
        <DialogContent>
          <MaterialBrowser
            picker
            onAdd={(selected) => {
              const images = selected
                .filter((f) => f.mimeType.startsWith("image/"))
                .slice(0, 5 - files.length);
              void Promise.all(
                images.map((f, i) =>
                  importMedia({
                    id: value.id!,
                    fileId: f.id,
                    position: files.length + i,
                  }).unwrap(),
                ),
              )
                .then(() => {
                  setMessage(
                    "Đang sao chép ảnh riêng cho món quà. Dùng nút tải lại để xem khi hoàn tất.",
                  );
                  setPicker(false);
                })
                .catch(() => {});
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPicker(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
      <Box sx={{ position: "absolute", right: 12, top: 12 }}>
        <GiftAction label="Đóng" onClick={close}>
          <Close />
        </GiftAction>
      </Box>
    </Dialog>
  );
}

export function GiftVisibility({
  giftId,
  catalog,
}: {
  giftId: string;
  catalog: Catalog;
}) {
  const options = useGiftOptionsQuery(),
    query = useGiftVisibilityQuery(giftId),
    [save, state] = useSaveGiftVisibilityMutation();
  return (
    <Stack>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
        }}
      >
        Hiển thị tại lớp
      </Typography>
      <Feedback error={query.error ?? state.error} />
      <Stack
        direction="row"
        sx={{
          flexWrap: "wrap",
        }}
      >
        {catalog.classIds.map((id) => (
          <FormControlLabel
            key={id}
            control={
              <Checkbox
                checked={query.data?.includes(id) ?? false}
                disabled={!catalog.canManage || state.isLoading}
                onChange={(_, visible) =>
                  void save({
                    id: giftId,
                    catalogId: catalog.id,
                    rows: [{ classId: id, visible }],
                  })
                }
              />
            }
            label={
              options.data?.classes.find((c) => c.id === id)?.name ??
              "Lớp đã liên kết"
            }
          />
        ))}
      </Stack>
    </Stack>
  );
}

export function ReuseDialog({ close }: { close: () => void }) {
  const [requestId] = useState(() => crypto.randomUUID());
  const options = useGiftOptionsQuery(),
    catalogs = useGiftCatalogsQuery({}),
    [classId, setClass] = useState(""),
    [catalogId, setCatalog] = useState(""),
    [reuse, state] = useReuseGiftCatalogMutation(),
    selected = catalogs.data?.items.find((c) => c.id === catalogId),
    router = useRouter();
  return (
    <Dialog open onClose={close} fullWidth maxWidth="sm">
      <DialogTitle sx={giftStyles.title}>Dùng lại danh sách</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            label="Lớp sử dụng"
            value={classId}
            onChange={(e) => setClass(e.target.value)}
          >
            {options.data?.classes.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Danh sách phần thưởng"
            value={catalogId}
            onChange={(e) => setCatalog(e.target.value)}
          >
            {catalogs.data?.items
              .filter((c) => c.status === "ACTIVE")
              .map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
          </TextField>
          <Alert severity="info">
            {selected?.canManage
              ? "Bạn thuộc nhóm quản lý: lớp sẽ liên kết và dùng chung nội dung, giá, tồn kho."
              : "Tạo bản sao độc lập với file riêng. Tồn kho ban đầu bằng 0; cần nhập số lượng thực tế trước khi cho đổi."}
          </Alert>
          <Feedback error={state.error} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Hủy</Button>
        <Button
          variant="contained"
          disabled={!classId || !catalogId || state.isLoading}
          onClick={() =>
            void reuse({ id: catalogId, classId, requestId })
              .unwrap()
              .then((r) => {
                close();
                router.push(`/rewards/catalogs/?id=${r.catalog.id}`);
              })
              .catch(() => {})
          }
        >
          {selected?.canManage ? "Liên kết danh sách" : "Tạo bản sao"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function InventoryDialog({
  gift,
  close,
}: {
  gift: Gift;
  close: () => void;
}) {
  const [kind, setKind] = useState("ADD"),
    [quantity, setQuantity] = useState(1),
    [reason, setReason] = useState(""),
    [key] = useState(() => crypto.randomUUID()),
    [save, state] = useAdjustGiftInventoryMutation();
  return (
    <Dialog open onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>Điều chỉnh tồn kho</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack
            direction="row"
            sx={{
              gap: 1.5,
              alignItems: "center",
            }}
          >
            <GiftImage id={gift.fileIds[0]} />
            <Typography
              sx={{
                fontWeight: 700,
              }}
            >
              {gift.name}
            </Typography>
          </Stack>
          <Typography>
            Có thể đổi {gift.available} · Đang giữ {gift.reserved}
          </Typography>
          <Stack
            direction="row"
            sx={{
              gap: 1,
            }}
          >
            <TextField
              select
              label="Loại điều chỉnh"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              sx={{ width: 180 }}
            >
              <MenuItem value="ADD">Nhập thêm</MenuItem>
              <MenuItem value="REMOVE">Xuất giảm</MenuItem>
            </TextField>
            <TextField
              label="Số lượng"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              sx={{ width: 110 }}
            />
          </Stack>
          <TextField
            label="Lý do"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            minRows={2}
          />
          <Feedback error={state.error} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Hủy</Button>
        <Button
          variant="contained"
          disabled={!reason.trim() || quantity < 1 || state.isLoading}
          onClick={() =>
            void save({
              id: gift.id,
              catalogId: gift.catalogId,
              kind,
              quantity,
              reason,
              key,
            })
              .unwrap()
              .then(close)
              .catch(() => {})
          }
        >
          Lưu điều chỉnh
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function InventoryHistory({ gift }: { gift: Gift }) {
  const [open, setOpen] = useState(false),
    query = useGiftInventoryQuery({ id: gift.id }, { skip: !open });
  return (
    <Paper sx={giftStyles.surface}>
      <Button onClick={() => setOpen((v) => !v)}>{gift.name}</Button>
      {open && (
        <Stack>
          <Feedback error={query.error} loading={query.isLoading} />
          {query.data?.items.map((i) => (
            <Typography key={i.id} variant="body2" sx={{ py: 1 }}>
              {new Date(i.createdAt).toLocaleString("vi-VN")} · {i.kind} ·{" "}
              {i.quantity} · {i.reason}
            </Typography>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

export function GiftDeleteDialog({
  catalog,
  gift,
  close,
}: {
  catalog: Catalog;
  gift?: Gift;
  close: () => void;
}) {
  const impact = useGiftDeleteImpactQuery({
      catalogId: catalog.id,
      giftId: gift?.id,
    }),
    [confirmation, setConfirmation] = useState(""),
    [reason, setReason] = useState(""),
    [remove, state] = useDeleteGiftMutation(),
    [workflow, setWorkflow] = useState(""),
    status = useGiftDeletionQuery(workflow, { skip: !workflow });
  return (
    <Dialog open onClose={close} fullWidth maxWidth="sm">
      <DialogTitle sx={giftStyles.title}>
        Xóa {gift ? "món quà" : "danh sách phần thưởng"}?
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Stack
            direction="row"
            sx={{
              gap: 1.5,
              alignItems: "center",
            }}
          >
            <GiftImage id={gift?.fileIds[0]} />
            <Typography
              sx={{
                fontWeight: 700,
              }}
            >
              {gift?.name ?? catalog.name}
            </Typography>
          </Stack>
          <Alert severity="error">
            Không thể khôi phục dữ liệu vận hành và file bị xóa.
          </Alert>
          <Typography>
            {impact.data?.classes ?? "…"} lớp bị ảnh hưởng ·{" "}
            {impact.data?.pendingRequests ?? "…"} yêu cầu chờ giao ·{" "}
            {impact.data?.files ?? "…"} file sẽ xóa.
          </Typography>
          <Alert severity="warning">
            Lịch sử đổi và yêu cầu chờ giao được giữ bằng bản ghi riêng. Ảnh đã
            xóa sẽ dùng hình thay thế.
          </Alert>
          {workflow ? (
            <Alert
              severity={
                status.data?.state === "DONE"
                  ? "success"
                  : status.data?.state === "FAILED"
                    ? "error"
                    : "info"
              }
            >
              {status.data?.state === "DONE"
                ? "Đã lưu lịch sử và xóa xong dữ liệu/file."
                : status.data?.state === "FAILED"
                  ? "Chưa xóa xong. Có thể thử lại an toàn."
                  : "Đang lưu lịch sử và xóa file. Chưa hoàn tất."}
            </Alert>
          ) : (
            <>
              <TextField
                label="Nhập tên hoặc XÓA"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
              <TextField
                label="Lý do xóa"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                multiline
                minRows={2}
              />
            </>
          )}
          <Feedback error={state.error ?? status.error} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Đóng</Button>
        {workflow && (
          <GiftAction
            label="Kiểm tra trạng thái"
            onClick={() => void status.refetch()}
          >
            <Refresh />
          </GiftAction>
        )}
        {(!workflow || status.data?.state === "FAILED") && (
          <Button
            color="error"
            variant="contained"
            disabled={state.isLoading || !reason.trim() || !confirmation.trim()}
            onClick={() =>
              void remove({
                catalogId: catalog.id,
                giftId: gift?.id,
                confirmation,
                reason,
              })
                .unwrap()
                .then((r) => setWorkflow(r.id))
                .catch(() => {})
            }
          >
            {workflow ? "Thử lại" : "Xóa vĩnh viễn"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
