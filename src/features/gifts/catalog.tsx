"use client";
import { memo, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import Favorite from "@mui/icons-material/Favorite";
import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import AddShoppingCart from "@mui/icons-material/AddShoppingCart";
import ShoppingBagOutlined from "@mui/icons-material/ShoppingBagOutlined";
import Close from "@mui/icons-material/Close";
import {
  useGiftCartQuery,
  useGiftCategoriesQuery,
  useGiftFavoriteMutation,
  useGiftsQuery,
  useSetGiftCartMutation,
} from "@/api/gifts-api";
import { Feedback } from "@/shared/ui";
import { GiftAction, GiftCart, GiftHistory, GiftImage } from "./shared";
import { formatPoints, giftStyles, type Gift } from "./models";
const GiftCard = memo(function GiftCard({
  gift,
  balance,
  onOpen,
  onFavorite,
  onAdd,
  busy,
  student,
}: {
  gift: Gift;
  balance: number;
  onOpen: (g: Gift) => void;
  onFavorite: (g: Gift) => void;
  onAdd: (g: Gift) => void;
  busy: boolean;
  student: boolean;
}) {
  const reason =
    gift.available < 1 ? "Hết quà" : gift.points > balance ? "Thiếu điểm" : "";
  return (
    <Paper
      sx={{
        ...giftStyles.surface,
        p: 1.5,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Box
        component="button"
        onClick={() => onOpen(gift)}
        aria-label={`Xem ${gift.name}`}
        sx={{
          border: 0,
          cursor: "pointer",
          p: 0,
          bgcolor: "action.hover",
          width: "100%",
          height: { xs: 144, md: 180 },
          display: "grid",
          placeItems: "center",
          borderRadius: "8px",
          "&>div": { width: "100%", height: "100%" },
        }}
      >
        <GiftImage id={gift.fileIds[0]} size={160} />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography
          component="button"
          onClick={() => onOpen(gift)}
          sx={{
            border: 0,
            p: 0,
            bgcolor: "transparent",
            color: "text.primary",
            textAlign: "left",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {gift.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {gift.available > 0 ? `Còn ${gift.available} quà` : "Tạm hết quà"}
        </Typography>
      </Box>
      <Typography
        color="primary"
        sx={{
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        {formatPoints(gift.points)} điểm
      </Typography>
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {student && (
          <GiftAction
            label={gift.favorite ? "Bỏ yêu thích" : "Yêu thích"}
            disabled={busy}
            onClick={() => onFavorite(gift)}
          >
            {gift.favorite ? <Favorite color="error" /> : <FavoriteBorder />}
          </GiftAction>
        )}
        <Button
          size="small"
          variant={reason ? "outlined" : "contained"}
          startIcon={
            !reason ? <AddShoppingCart sx={{ fontSize: 18 }} /> : undefined
          }
          disabled={!!reason || busy}
          onClick={() => onAdd(gift)}
          sx={{
            borderRadius: "999px",
            px: 1.25,
            whiteSpace: "nowrap",
            fontSize: 12,
            minWidth: 0,
            "& .MuiButton-startIcon": {
              display: { xs: "none", sm: "inline-flex" },
            },
            ml: "auto",
          }}
        >
          {reason || "Thêm vào giỏ"}
        </Button>
      </Stack>
    </Paper>
  );
});
export function GiftCatalogView({
  classId,
  studentId,
  student = true,
  initialTab = "all",
}: {
  classId: string;
  studentId: string;
  student?: boolean;
  initialTab?: string;
}) {
  const [tab, setTab] = useState(initialTab),
    [search, setSearch] = useState(""),
    [appliedSearch, setAppliedSearch] = useState(""),
    [page, setPage] = useState(1),
    [category, setCategory] = useState(""),
    [inStock, setInStock] = useState(false),
    [affordable, setAffordable] = useState(false),
    [open, setOpen] = useState<Gift | null>(null),
    [cartOpen, setCartOpen] = useState(false);
  const categories = useGiftCategoriesQuery(
    { classId },
    { skip: tab === "history" },
  );
  const gifts = useGiftsQuery(
      {
        classId,
        inStock,
        affordable,
        studentId,
        category: category || undefined,
        favorite: tab === "favorites",
        search: appliedSearch || undefined,
        page,
      },
      { skip: tab === "history" },
    ),
    cart = useGiftCartQuery(
      { classId, studentId },
      { skip: !studentId || tab === "history" },
    ),
    [favorite, favoriteState] = useGiftFavoriteMutation(),
    [setCart, setCartState] = useSetGiftCartMutation();
  const balance = cart.currentData?.balanceBefore ?? 0,
    rows = gifts.currentData?.items ?? [];
  async function add(g: Gift) {
    const previous =
      cart.currentData?.items.find((i) => i.gift.id === g.id)?.quantity ?? 0;
    try {
      await setCart({
        classId,
        studentId,
        giftId: g.id,
        quantity: Math.min(previous + 1, 99),
        expectedPoints: g.points,
      }).unwrap();
    } catch {}
  }
  const count =
    cart.currentData?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;
  return (
    <Stack spacing={2.5}>
      {tab !== "history" && (
        <Paper
          sx={{
            p: 2,
            bgcolor: "action.selected",
            boxShadow: "none",
            borderRadius: "16px",
          }}
        >
          <Typography variant="body2">Điểm có thể sử dụng</Typography>
          <Typography
            color="primary"
            sx={{
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            {formatPoints(balance)}{" "}
            <Box component="span" sx={{ fontSize: 14, fontWeight: 400 }}>
              điểm
            </Box>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {cart.currentData?.className}
            {!student && cart.currentData
              ? ` · ${cart.currentData.nickname || cart.currentData.studentName} · ${cart.currentData.studentCode}`
              : ""}
          </Typography>
        </Paper>
      )}
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v: string) => {
            setTab(v);
            setPage(1);
          }}
          sx={giftStyles.pills}
          variant="scrollable"
        >
          <Tab value="all" label="Tất cả" />
          {student && <Tab value="favorites" label="Yêu thích" />}
          <Tab value="history" label="Quà đã đổi" />
        </Tabs>
        {tab !== "history" && (
          <GiftAction label="Mở giỏ quà" onClick={() => setCartOpen(true)}>
            <Badge badgeContent={count} color="primary">
              <ShoppingBagOutlined />
            </Badge>
          </GiftAction>
        )}
      </Stack>
      {tab === "history" ? (
        <GiftHistory classId={classId} studentId={studentId} />
      ) : (
        <>
          <TextField
            label="Tìm quà"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => {
              setAppliedSearch(search.trim());
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setAppliedSearch(search.trim());
                setPage(1);
              }
            }}
            sx={{ maxWidth: 440 }}
          />
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{
              flexWrap: "wrap",
            }}
          >
            <TextField
              select
              label="Phân loại"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              sx={{ width: 170 }}
            >
              <MenuItem value="">Tất cả</MenuItem>
              {categories.data?.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <Chip
              clickable
              label="Đủ điểm"
              variant={affordable ? "filled" : "outlined"}
              color={affordable ? "primary" : "default"}
              onClick={() => {
                setAffordable((v) => !v);
                setPage(1);
              }}
            />
            <Chip
              clickable
              label="Còn quà"
              variant={inStock ? "filled" : "outlined"}
              color={inStock ? "primary" : "default"}
              onClick={() => {
                setInStock((v) => !v);
                setPage(1);
              }}
            />
          </Stack>
          <Feedback
            loading={gifts.isLoading || cart.isLoading}
            error={
              gifts.error ??
              cart.error ??
              setCartState.error ??
              favoriteState.error
            }
            retry={gifts.refetch}
          />
          {gifts.isFetching && !gifts.isLoading && <LinearProgress />}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2,minmax(0,1fr))",
                md: "repeat(3,minmax(0,1fr))",
              },
              gap: 1.5,
            }}
          >
            {rows.map((g) => (
              <GiftCard
                key={g.id}
                gift={g}
                balance={balance}
                onOpen={setOpen}
                student={student}
                busy={setCartState.isLoading || favoriteState.isLoading}
                onFavorite={(g) =>
                  void favorite({ classId, giftId: g.id, add: !g.favorite })
                }
                onAdd={(g) => void add(g)}
              />
            ))}
          </Box>
          {!rows.length && gifts.currentData && (
            <Alert severity="info">
              Chưa có quà phù hợp. Thử thay đổi bộ lọc.
            </Alert>
          )}
          {!!gifts.currentData?.total && gifts.currentData.total > 24 && (
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
              }}
            >
              <Button
                disabled={page === 1}
                onClick={() => setPage((v) => v - 1)}
              >
                Trước
              </Button>
              <Typography variant="caption">Trang {page}</Typography>
              <Button
                disabled={page * 24 >= gifts.currentData.total}
                onClick={() => setPage((v) => v + 1)}
              >
                Sau
              </Button>
            </Stack>
          )}
          <Typography variant="caption" color="text.secondary">
            Thêm vào giỏ chưa trừ điểm. Quà có thể hết trước khi xác nhận.
          </Typography>
        </>
      )}
      {cartOpen && (
        <GiftCart
          classId={classId}
          studentId={studentId}
          open
          onClose={() => setCartOpen(false)}
        />
      )}
      <Dialog
        open={!!open}
        onClose={() => setOpen(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={giftStyles.title}>
          {open?.name}
          <Box sx={{ position: "absolute", right: 12, top: 12 }}>
            <GiftAction label="Đóng" onClick={() => setOpen(null)}>
              <Close />
            </GiftAction>
          </Box>
        </DialogTitle>
        <DialogContent>
          {open && (
            <Stack spacing={2}>
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <GiftImage id={open.fileIds[0]} size={240} />
              </Box>
              <Stack direction="row" spacing={1} sx={{ overflowX: "auto" }}>
                {open.fileIds.slice(1).map((id) => (
                  <GiftImage id={id} key={id} size={96} />
                ))}
              </Stack>
              <Typography sx={{ whiteSpace: "pre-wrap" }}>
                {open.description}
              </Typography>
              <Typography
                color="primary"
                sx={{
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                {formatPoints(open.points)} điểm
              </Typography>
              <Typography variant="body2">Còn {open.available} quà</Typography>
              <Button
                variant="contained"
                disabled={
                  !open.available ||
                  open.points > balance ||
                  setCartState.isLoading
                }
                onClick={() => void add(open)}
              >
                Thêm vào giỏ
              </Button>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
