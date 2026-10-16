"use client";
import {
  browserAttemptStorage,
  attemptStorageKey,
  checkoutAttempt,
  readAttempt,
  rememberWorkflow,
  clearAttempt,
} from "./checkout-attempt";
import { memo, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Close from "@mui/icons-material/Close";
import Redeem from "@mui/icons-material/Redeem";
import Refresh from "@mui/icons-material/Refresh";
import RemoveShoppingCartOutlined from "@mui/icons-material/RemoveShoppingCartOutlined";
import { MaterialThumbnail } from "@/features/materials/thumbnail";
import {
  useConfirmGiftsMutation,
  useGiftCartQuery,
  useGiftRedemptionsQuery,
  useGiftWorkflowQuery,
  usePreviewGiftsMutation,
  useSetGiftCartMutation,
} from "@/api/gifts-api";
import {
  giftErrors,
  giftStyles,
  formatPoints,
  type Preview,
  type Redemption,
} from "./models";
import { Feedback } from "@/shared/ui";
export const GiftImage = memo(function GiftImage({
  id,
  size = 56,
  deleted = false,
}: {
  id?: string | null;
  size?: 40 | 56 | 72 | 96 | 160 | 240;
  deleted?: boolean;
}) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        bgcolor: "action.hover",
        borderRadius: "8px",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
    >
      {id && !deleted ? (
        <MaterialThumbnail id={id} fill fit="contain" requestedWidth={size} />
      ) : (
        <Redeem
          sx={{ fontSize: Math.min(size / 2, 36), color: "text.disabled" }}
        />
      )}
    </Box>
  );
});
export function GiftAction({
  label,
  children,
  onClick,
  disabled = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton aria-label={label} onClick={onClick} disabled={disabled}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}
const Quantity = memo(function Quantity({
  value,
  max,
  onSave,
  disabled,
}: {
  value: number;
  max: number;
  onSave: (n: number) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  return (
    <TextField
      aria-label="Số lượng"
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const n = Number(draft);
        if (Number.isInteger(n) && n >= 1 && n <= Math.min(99, max)) onSave(n);
        else setDraft(String(value));
      }}
      disabled={disabled}
      slotProps={{
        htmlInput: { min: 1, max: Math.min(99, max), "aria-label": "Số lượng" },
      }}
      sx={{ width: 72, flexShrink: 0 }}
    />
  );
});
export function GiftCart({
  classId,
  studentId,
  open,
  onClose,
}: {
  classId: string;
  studentId: string;
  open: boolean;
  onClose: () => void;
}) {
  const cart = useGiftCartQuery({ classId, studentId }, { skip: !open }),
    [setCart, setState] = useSetGiftCartMutation(),
    [preview, previewState] = usePreviewGiftsMutation(),
    [confirm, confirmState] = useConfirmGiftsMutation();
  const storage = browserAttemptStorage(),
    storageKey = attemptStorageKey(classId, studentId);
  const [review, setReview] = useState<Preview | null>(null),
    [workflow, setWorkflow] = useState<string | null>(
      () => readAttempt(storage, storageKey)?.workflowId ?? null,
    ),
    key = useRef("");
  const status = useGiftWorkflowQuery(workflow ?? "", {
    skip: !open || !workflow,
  });
  useEffect(() => {
    if (status.data?.state === "DONE" || status.data?.state === "FAILED")
      clearAttempt(storage, storageKey);
  }, [status.data?.state, storage, storageKey]);
  const data = review ?? cart.currentData;
  async function reviewCart() {
    if (!cart.currentData) return;
    try {
      setReview(
        await preview({
          classId,
          studentId,
          items: cart.currentData.items.map((i) => ({
            giftId: i.gift.id,
            quantity: i.quantity,
            expectedPoints: i.gift.points,
          })),
        }).unwrap(),
      );
      key.current = checkoutAttempt(
        storage,
        storageKey,
        {
          classId,
          studentId,
          items: cart.currentData.items.map((i) => ({
            giftId: i.gift.id,
            quantity: i.quantity,
            expectedPoints: i.gift.points,
          })),
        },
        () => crypto.randomUUID(),
      ).key;
    } catch {}
  }
  async function redeem() {
    if (!review || !review.canConfirm) return;
    try {
      const result = await confirm({
        classId,
        studentId,
        items: review.items.map((i) => ({
          giftId: i.gift.id,
          quantity: i.quantity,
          expectedPoints: i.expectedPoints,
        })),
        key: key.current,
      }).unwrap();
      rememberWorkflow(storage, storageKey, result.id);
      setWorkflow(result.id);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        (error.status === 409 || error.status === 422)
      ) {
        setReview(null);
        void cart.refetch();
      }
    }
  }
  return (
    <Dialog
      open={open}
      onClose={confirmState.isLoading ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: { borderRadius: "16px", m: 2, width: "calc(100% - 32px)" },
        },
      }}
    >
      <DialogTitle sx={giftStyles.title}>
        {workflow ? "Yêu cầu đổi quà" : review ? "Xác nhận đổi quà" : "Giỏ quà"}
        <Box sx={{ position: "absolute", top: 12, right: 12 }}>
          <GiftAction
            label="Đóng"
            disabled={confirmState.isLoading}
            onClick={onClose}
          >
            <Close />
          </GiftAction>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Feedback
          loading={cart.isLoading}
          error={cart.error ?? previewState.error ?? confirmState.error}
          retry={cart.refetch}
        />
        {workflow ? (
          <Stack spacing={2}>
            <Alert
              severity={
                status.data?.state === "FAILED"
                  ? "error"
                  : status.data?.state === "DONE"
                    ? "success"
                    : "info"
              }
            >
              {status.data?.state === "DONE"
                ? "Đổi quà thành công. Quà đang chờ giao."
                : status.data?.state === "FAILED"
                  ? (giftErrors[status.data.errorCode] ??
                    "Đổi quà chưa thành công. Điểm đã được hoàn lại.")
                  : "Đang xử lý yêu cầu đổi quà. Kết quả sẽ được gửi qua thông báo."}
            </Alert>
            <Button
              startIcon={<Refresh />}
              onClick={() => void status.refetch()}
              disabled={status.isFetching}
            >
              Kiểm tra trạng thái
            </Button>
          </Stack>
        ) : data ? (
          <Stack spacing={2}>
            <Typography
              sx={{
                fontWeight: 700,
              }}
            >
              {data.nickname || data.studentName} · {data.className}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {data.studentName} · {data.studentCode}
            </Typography>
            {data.items.map((i) => (
              <Stack
                key={i.gift.id}
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: "center",
                }}
              >
                <GiftImage id={i.gift.fileIds[0]} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    {i.gift.name}
                  </Typography>
                  <Typography variant="caption">
                    {formatPoints(i.gift.points)} điểm / quà
                  </Typography>
                  {review ? (
                    <Typography variant="body2">
                      Số lượng: {i.quantity}
                    </Typography>
                  ) : (
                    <Quantity
                      key={`${i.gift.id}:${i.quantity}`}
                      value={i.quantity}
                      max={Math.max(i.quantity, i.gift.available)}
                      disabled={setState.isLoading}
                      onSave={(n) => {
                        if (n !== i.quantity)
                          void setCart({
                            classId,
                            studentId,
                            giftId: i.gift.id,
                            quantity: n,
                            expectedPoints: i.expectedPoints,
                          });
                      }}
                    />
                  )}
                </Box>
                <Stack
                  sx={{
                    alignItems: "flex-end",
                  }}
                >
                  <Typography
                    color="primary"
                    sx={[
                      {
                        fontWeight: 700,
                      },
                      { whiteSpace: "nowrap" },
                    ]}
                  >
                    {formatPoints(i.gift.points * i.quantity)}
                  </Typography>
                  {!review && (
                    <GiftAction
                      label="Bỏ khỏi giỏ"
                      disabled={setState.isLoading}
                      onClick={() =>
                        void setCart({
                          classId,
                          studentId,
                          giftId: i.gift.id,
                          quantity: 0,
                          expectedPoints: i.expectedPoints,
                        })
                      }
                    >
                      <RemoveShoppingCartOutlined />
                    </GiftAction>
                  )}
                </Stack>
              </Stack>
            ))}
            <Paper
              sx={{
                p: 2,
                bgcolor: "action.selected",
                boxShadow: "none",
                borderRadius: "12px",
              }}
            >
              <Stack
                direction="row"
                sx={{
                  justifyContent: "space-between",
                }}
              >
                <Typography>Số dư</Typography>
                <Typography>{formatPoints(data.balanceBefore)}</Typography>
              </Stack>
              <Stack
                direction="row"
                sx={{
                  justifyContent: "space-between",
                }}
              >
                <Typography>Tổng điểm đổi</Typography>
                <Typography
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  {formatPoints(data.totalPoints)}
                </Typography>
              </Stack>
              <Stack
                direction="row"
                sx={[
                  {
                    justifyContent: "space-between",
                  },
                  { borderTop: 1, borderColor: "divider", mt: 1, pt: 1 },
                ]}
              >
                <Typography>Còn lại</Typography>
                <Typography
                  color="primary"
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  {formatPoints(data.balanceAfter)}
                </Typography>
              </Stack>
            </Paper>
            {data.errors
              .filter((e) => e !== "EMPTY_CART")
              .map((e) => (
                <Alert key={e} severity="warning">
                  {giftErrors[e] ?? e}
                </Alert>
              ))}
            {!data.items.length && (
              <Typography color="text.secondary">Giỏ chưa có quà.</Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Chỉ trừ điểm khi xác nhận thành công. Quà sẽ ở trạng thái chờ
              giao.
            </Typography>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        {!workflow && (
          <>
            <Button onClick={() => (review ? setReview(null) : onClose())}>
              Quay lại
            </Button>
            <Button
              variant="contained"
              disabled={
                !data?.items.length ||
                confirmState.isLoading ||
                previewState.isLoading ||
                setState.isLoading ||
                (!!review && !review.canConfirm)
              }
              onClick={() => void (review ? redeem() : reviewCart())}
            >
              {review ? "Xác nhận đổi" : "Xem lại giỏ"}
            </Button>
          </>
        )}
        {workflow && <Button onClick={onClose}>Đóng</Button>}
      </DialogActions>
    </Dialog>
  );
}
export function GiftHistory({
  classId,
  studentId,
  staff = false,
  onDeliver,
}: {
  classId?: string;
  studentId?: string;
  staff?: boolean;
  onDeliver?: (r: Redemption) => void;
}) {
  const [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [search, setSearch] = useState(""),
    [searchInput, setSearchInput] = useState("");
  const query = useGiftRedemptionsQuery({
    classId,
    studentId,
    status: status || undefined,
    search: search || undefined,
    page,
  });
  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          flexWrap: "wrap",
        }}
      >
        {staff && (
          <TextField
            label="Tìm học sinh"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onBlur={() => {
              setSearch(searchInput.trim());
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput.trim());
                setPage(1);
              }
            }}
            sx={{ width: 240, maxWidth: "100%" }}
          />
        )}
        <TextField
          select
          label="Trạng thái"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          slotProps={{ select: { native: true } }}
          sx={{ width: 180 }}
        >
          <option value="">Tất cả</option>
          <option value="PENDING">Chờ giao</option>
          <option value="DELIVERED">Đã giao</option>
        </TextField>
      </Stack>
      <Feedback
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {query.isFetching && !query.isLoading && <LinearProgress />}
      {query.currentData?.items.map((r) => (
        <Paper key={r.id} sx={giftStyles.surface}>
          <Stack spacing={1.5}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography
                sx={{
                  fontWeight: 700,
                }}
              >
                #{r.id.slice(0, 8).toUpperCase()}
              </Typography>
              <Chip
                label={r.status === "PENDING" ? "Chờ giao" : "Đã giao"}
                color={r.status === "PENDING" ? "warning" : "success"}
                variant="outlined"
              />
            </Stack>
            {staff && (
              <Typography
                sx={{
                  fontWeight: 700,
                }}
              >
                {r.nickname || r.studentName} · {r.studentCode}
              </Typography>
            )}
            {r.items.map((i) => (
              <Stack
                key={i.giftId}
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: "center",
                }}
              >
                <GiftImage id={i.fileId} deleted={i.deleted} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    {i.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Số lượng {i.quantity} · {formatPoints(i.points)} điểm
                    {i.deleted ? " · Quà đã xóa" : ""}
                  </Typography>
                </Box>
                <Typography
                  sx={[
                    {
                      fontWeight: 700,
                    },
                    { whiteSpace: "nowrap" },
                  ]}
                >
                  {formatPoints(i.points * i.quantity)}
                </Typography>
              </Stack>
            ))}
            <Stack
              direction="row"
              sx={{
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {new Date(r.createdAt).toLocaleString("vi-VN")} · {r.className}
                <br />
                {r.self ? "Tự đổi" : "Giảng viên đổi hộ"}
              </Typography>
              <Typography
                sx={[
                  {
                    fontWeight: 700,
                  },
                  { color: "secondary.main" },
                ]}
              >
                Tổng {formatPoints(r.totalPoints)} điểm
              </Typography>
            </Stack>
            {staff && r.status === "PENDING" && onDeliver && (
              <Button
                variant="contained"
                sx={{ alignSelf: "flex-end" }}
                onClick={() => onDeliver(r)}
              >
                Xác nhận giao
              </Button>
            )}
          </Stack>
        </Paper>
      ))}
      {query.currentData && !query.currentData.total && (
        <Typography color="text.secondary">Chưa có yêu cầu đổi quà.</Typography>
      )}
      {!!query.currentData?.total && (
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="caption">
            {query.currentData.total} yêu cầu · Trang {page}
          </Typography>
          <Box>
            <Button disabled={page === 1} onClick={() => setPage((v) => v - 1)}>
              Trước
            </Button>
            <Button
              disabled={page * 20 >= query.currentData!.total}
              onClick={() => setPage((v) => v + 1)}
            >
              Sau
            </Button>
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
