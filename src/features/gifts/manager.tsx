"use client";
import {
  useGiftCategoriesQuery,
  useCatalogGiftVisibilityQuery,
  useSaveGiftVisibilityMutation,
} from "@/api/gifts-api";

import { useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";

import Add from "@mui/icons-material/Add";

import EditOutlined from "@mui/icons-material/EditOutlined";

import DeleteOutline from "@mui/icons-material/DeleteOutlined";

import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";

import Close from "@mui/icons-material/Close";

import {
  useGiftCatalogQuery,
  useGiftCatalogsQuery,
  useGiftManagerMutation,
  useGiftOptionsQuery,
  useGiftsQuery,
  useGiftStatisticsQuery,
  useLinkGiftClassMutation,
} from "@/api/gifts-api";

import { Feedback } from "@/shared/ui";

import { GiftAction, GiftImage } from "./shared";

import {
  CatalogEditor,
  GiftDeleteDialog,
  GiftEditor,
  InventoryDialog,
  InventoryHistory,
  ReuseDialog,
} from "./catalog-dialogs";
import { formatPoints, giftStyles, type Catalog, type Gift } from "./models";

export function GiftCatalogManager() {
  const params = useSearchParams(),
    id = params.get("id"),
    [search, setSearch] = useState(""),
    [applied, setApplied] = useState(""),
    [page, setPage] = useState(1),
    [create, setCreate] = useState(false),
    [reuse, setReuse] = useState(false);
  const query = useGiftCatalogsQuery(
    { search: applied || undefined, page },
    { skip: !!id },
  );
  if (id) return <CatalogDetail id={id} />;
  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography component="h1" sx={giftStyles.title}>
          Danh sách phần thưởng
        </Typography>
        <Typography color="text.secondary">
          Quản lý quà, tồn kho và các lớp sử dụng.
        </Typography>
      </Box>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          flexWrap: "wrap",
        }}
      >
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreate(true)}
        >
          Tạo danh sách
        </Button>
        <Button variant="outlined" onClick={() => setReuse(true)}>
          Dùng lại danh sách
        </Button>
        <Button component={Link} href="/rewards/requests/">
          Yêu cầu giao quà
        </Button>
        <Button component={Link} href="/rewards/redeem/">
          Đổi quà hộ
        </Button>
      </Stack>
      <TextField
        label="Tìm danh sách"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onBlur={() => {
          setApplied(search.trim());
          setPage(1);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setApplied(search.trim());
            setPage(1);
          }
        }}
        sx={{ maxWidth: 440 }}
      />
      <Feedback
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      <TableContainer component={Paper} sx={giftStyles.surface}>
        <Table
          size="small"
          sx={{
            minWidth: 760,
            "& th": { whiteSpace: "nowrap" },
            "& td:first-of-type": { minWidth: 240 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Danh sách</TableCell>
              <TableCell>Quản lý chính</TableCell>
              <TableCell>Lớp liên kết</TableCell>
              <TableCell>Trạng thái</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {query.data?.items.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>
                  <Button
                    component={Link}
                    href={`/rewards/catalogs/?id=${c.id}`}
                    sx={{ textAlign: "left", whiteSpace: "normal" }}
                  >
                    {c.name}
                  </Button>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "block",
                    }}
                  >
                    {c.description}
                  </Typography>
                </TableCell>
                <TableCell>{c.ownerName}</TableCell>
                <TableCell>{c.classIds.length} lớp</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {c.status === "ACTIVE"
                    ? "Đang sử dụng"
                    : c.status === "COPYING"
                      ? "Đang sao chép"
                      : "Đang xóa"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {query.data && !query.data.total && (
          <Typography sx={{ p: 2 }}>Chưa có danh sách phần thưởng.</Typography>
        )}
      </TableContainer>
      <Stack
        direction="row"
        sx={{
          justifyContent: "flex-end",
        }}
      >
        <Button disabled={page === 1} onClick={() => setPage((v) => v - 1)}>
          Trước
        </Button>
        <Button
          disabled={!query.data || page * 20 >= query.data.total}
          onClick={() => setPage((v) => v + 1)}
        >
          Sau
        </Button>
      </Stack>
      {create && <CatalogEditor close={() => setCreate(false)} />}{" "}
      {reuse && <ReuseDialog close={() => setReuse(false)} />}
    </Stack>
  );
}

function CatalogDetail({ id }: { id: string }) {
  const query = useGiftCatalogQuery(id),
    params = useSearchParams(),
    router = useRouter(),
    tab = params.get("tab") ?? "gifts",
    [editor, setEditor] = useState<Gift | "new" | null>(null),
    [editCatalog, setEditCatalog] = useState(false),
    [inventory, setInventory] = useState<Gift | null>(null),
    [deletion, setDeletion] = useState<Gift | "catalog" | null>(null),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState(""),
    [category, setCategory] = useState(""),
    [status, setStatus] = useState("");
  const stats = useGiftStatisticsQuery(id);
  const categories = useGiftCategoriesQuery({ catalogId: id });
  const list = useGiftsQuery({
      catalogId: id,
      page,
      search: filter || undefined,
      category: category || undefined,
      status: status || undefined,
    }),
    catalog = query.currentData;
  return (
    <Stack spacing={2.5}>
      <Feedback
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {catalog && (
        <>
          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box>
              <Typography component="h1" sx={giftStyles.title}>
                {catalog.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {catalog.ownerName} · {catalog.managerIds.length + 1} thành viên
                quản lý
              </Typography>
            </Box>
            {catalog.canManage && (
              <Stack direction="row">
                <GiftAction
                  label="Sửa danh sách"
                  onClick={() => setEditCatalog(true)}
                >
                  <EditOutlined />
                </GiftAction>
                <GiftAction
                  label="Xóa danh sách"
                  onClick={() => setDeletion("catalog")}
                >
                  <DeleteOutline />
                </GiftAction>
              </Stack>
            )}
          </Stack>
          <Tabs
            value={tab}
            variant="scrollable"
            sx={giftStyles.pills}
            onChange={(_, v: string) =>
              router.push(`/rewards/catalogs/?id=${id}&tab=${v}`, {
                scroll: false,
              })
            }
          >
            <Tab value="gifts" label="Quà & tồn kho" />
            <Tab value="classes" label="Lớp & hiển thị" />
            <Tab value="managers" label="Nhóm quản lý" />
            <Tab value="history" label="Lịch sử" />
          </Tabs>
          {tab === "gifts" && (
            <>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2,minmax(0,1fr))",
                    md: "repeat(4,minmax(0,1fr))",
                  },
                  gap: 1.5,
                }}
              >
                {[
                  ["Món quà", stats.data?.gifts ?? 0],
                  ["Có thể đổi", stats.data?.available ?? 0],
                  ["Đang chờ giao", stats.data?.reserved ?? 0],
                  ["Lớp liên kết", stats.data?.classes ?? 0],
                ].map(([label, n]) => (
                  <Paper key={label} sx={giftStyles.surface}>
                    <Typography variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 28,
                        fontWeight: 700,
                      }}
                    >
                      {n}
                    </Typography>
                  </Paper>
                ))}
              </Box>
              {catalog.canManage && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setEditor("new")}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Thêm món quà
                </Button>
              )}
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: "wrap" }}
              >
                <TextField
                  label="Tìm món quà"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onBlur={() => {
                    setFilter(search.trim());
                    setPage(1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setFilter(search.trim());
                      setPage(1);
                    }
                  }}
                  sx={{ width: 280, maxWidth: "100%" }}
                />
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
                <TextField
                  select
                  label="Trạng thái"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  sx={{ width: 170 }}
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  <MenuItem value="ACTIVE">Đang bật</MenuItem>
                  <MenuItem value="HIDDEN">Ẩn</MenuItem>
                  <MenuItem value="DELETING">Đang xóa</MenuItem>
                </TextField>
              </Stack>
              <Feedback
                loading={list.isLoading}
                error={list.error}
                retry={list.refetch}
              />
              <TableContainer component={Paper} sx={giftStyles.surface}>
                <Table
                  size="small"
                  sx={{
                    minWidth: 760,
                    "& th": { whiteSpace: "nowrap" },
                    "& td:first-of-type": { minWidth: 240 },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Món quà</TableCell>
                      <TableCell align="right">Điểm đổi</TableCell>
                      <TableCell align="right">Có thể đổi</TableCell>
                      <TableCell align="right">Chờ giao</TableCell>
                      <TableCell>Trạng thái</TableCell>
                      <TableCell align="right">Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {list.data?.items.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1.5}
                            sx={{
                              alignItems: "center",
                            }}
                          >
                            <GiftImage id={g.fileIds[0]} size={40} />
                            <Box>
                              <Typography
                                sx={{
                                  fontWeight: 700,
                                }}
                              >
                                {g.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {g.category}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          {formatPoints(g.points)}
                        </TableCell>
                        <TableCell align="right">{g.available}</TableCell>
                        <TableCell align="right">{g.reserved}</TableCell>
                        <TableCell>
                          {g.status === "ACTIVE"
                            ? "Đang bật"
                            : g.status === "HIDDEN"
                              ? "Ẩn"
                              : "Đang xóa"}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                          {catalog.canManage && g.status !== "DELETING" && (
                            <>
                              <GiftAction
                                label="Chỉnh sửa"
                                onClick={() => setEditor(g)}
                              >
                                <EditOutlined />
                              </GiftAction>
                              <GiftAction
                                label="Điều chỉnh tồn"
                                onClick={() => setInventory(g)}
                              >
                                <Inventory2Outlined />
                              </GiftAction>
                              <GiftAction
                                label="Xóa món quà"
                                onClick={() => setDeletion(g)}
                              >
                                <DeleteOutline />
                              </GiftAction>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
          {list.data && list.data.total > 24 && (
            <Stack
              direction="row"
              sx={{ justifyContent: "flex-end", alignItems: "center" }}
            >
              <Button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Trước
              </Button>
              <Typography variant="caption">Trang {page}</Typography>
              <Button
                disabled={page * 24 >= list.data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </Button>
            </Stack>
          )}
          {tab === "classes" && (
            <VisibilityPanel
              catalog={catalog}
              gifts={list.data?.items ?? []}
              page={page}
            />
          )}
          {tab === "managers" && <ManagersPanel catalog={catalog} />}
          {tab === "history" && (
            <Stack spacing={2}>
              <Typography color="text.secondary">
                Lịch sử điều chỉnh theo từng món. Giao dịch đổi vẫn được giữ khi
                xóa quà.
              </Typography>
              {list.data?.items.map((g) => (
                <InventoryHistory key={g.id} gift={g} />
              ))}
              <Button
                component={Link}
                href="/rewards/requests/"
                sx={{ alignSelf: "flex-start" }}
              >
                Yêu cầu giao quà
              </Button>
            </Stack>
          )}
          {editor && (
            <GiftEditor
              catalog={catalog}
              gift={editor === "new" ? undefined : editor}
              close={() => setEditor(null)}
            />
          )}
          {editCatalog && (
            <CatalogEditor
              catalog={catalog}
              close={() => setEditCatalog(false)}
            />
          )}
          {inventory && (
            <InventoryDialog
              gift={inventory}
              close={() => setInventory(null)}
            />
          )}
          {deletion && (
            <GiftDeleteDialog
              catalog={catalog}
              gift={deletion === "catalog" ? undefined : deletion}
              close={() => setDeletion(null)}
            />
          )}
        </>
      )}
    </Stack>
  );
}

function VisibilityPanel({
  catalog,
  gifts,
  page,
}: {
  catalog: Catalog;
  gifts: Gift[];
  page: number;
}) {
  const matrix = useCatalogGiftVisibilityQuery({ id: catalog.id, page }),
    [saveVisibility, visibilityState] = useSaveGiftVisibilityMutation();
  const options = useGiftOptionsQuery(),
    [id, setId] = useState(""),
    [link, state] = useLinkGiftClassMutation();
  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Liên kết danh sách và bật từng quà cho lớp là hai thiết lập riêng. Tồn
        kho được dùng chung giữa các lớp.
      </Alert>
      <Stack
        direction="row"
        sx={{
          gap: 1,
        }}
      >
        <TextField
          select
          label="Chọn lớp"
          value={id}
          onChange={(e) => setId(e.target.value)}
          sx={{ width: 280 }}
        >
          {options.data?.classes
            .filter((c) => !catalog.classIds.includes(c.id))
            .map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
        </TextField>
        <Button
          disabled={!id || !catalog.canManage || state.isLoading}
          onClick={() =>
            void link({ catalogId: catalog.id, classId: id, add: true })
              .unwrap()
              .then(() => setId(""))
              .catch(() => {})
          }
        >
          Liên kết lớp
        </Button>
      </Stack>
      <Feedback error={state.error} />
      {catalog.classIds.map((id) => (
        <Stack
          key={id}
          direction="row"
          sx={{
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography>
            {options.data?.classes.find((c) => c.id === id)?.name ??
              "Lớp đã liên kết"}
          </Typography>
          <GiftAction
            label="Ngắt liên kết"
            disabled={!catalog.canManage || state.isLoading}
            onClick={() =>
              void link({ catalogId: catalog.id, classId: id, add: false })
            }
          >
            <Close />
          </GiftAction>
        </Stack>
      ))}
      <Feedback error={matrix.error ?? visibilityState.error} />
      <TableContainer component={Paper} sx={giftStyles.surface}>
        <Table
          size="small"
          sx={{
            minWidth: 760,
            "& th": { whiteSpace: "nowrap" },
            "& td:first-of-type": { minWidth: 240 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Món quà</TableCell>
              {catalog.classIds.map((id) => (
                <TableCell key={id} sx={{ whiteSpace: "nowrap" }}>
                  {options.data?.classes.find((c) => c.id === id)?.name ??
                    "Lớp đã liên kết"}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {gifts.map((g) => (
              <TableRow key={g.id}>
                <TableCell>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: "center" }}
                  >
                    <GiftImage id={g.fileIds[0]} size={40} />
                    <Typography sx={{ fontWeight: 700 }}>{g.name}</Typography>
                  </Stack>
                </TableCell>
                {catalog.classIds.map((classId) => (
                  <TableCell key={classId}>
                    <Checkbox
                      checked={
                        matrix.data?.some(
                          (v) => v.giftId === g.id && v.classId === classId,
                        ) ?? false
                      }
                      disabled={
                        !catalog.canManage ||
                        visibilityState.isLoading ||
                        matrix.isLoading
                      }
                      slotProps={{
                        input: {
                          "aria-label": `${g.name} tại ${options.data?.classes.find((c) => c.id === classId)?.name ?? "lớp đã liên kết"}`,
                        },
                      }}
                      onChange={(_, visible) =>
                        void saveVisibility({
                          id: g.id,
                          catalogId: catalog.id,
                          rows: [{ classId, visible }],
                        })
                      }
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

function ManagersPanel({ catalog }: { catalog: Catalog }) {
  const options = useGiftOptionsQuery(),
    [id, setId] = useState(""),
    [change, state] = useGiftManagerMutation();
  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Chỉ quản lý chính và quản lý trung tâm được thêm/gỡ giảng viên quản lý
        danh sách.
      </Alert>
      <Stack
        direction="row"
        sx={{
          gap: 1,
        }}
      >
        <TextField
          select
          label="Giảng viên"
          value={id}
          onChange={(e) => setId(e.target.value)}
          sx={{ width: 280 }}
        >
          {options.data?.teachers
            .filter(
              (t) =>
                t.id !== catalog.ownerId && !catalog.managerIds.includes(t.id),
            )
            .map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
        </TextField>
        <Button
          disabled={!id || !catalog.canManageMembers || state.isLoading}
          onClick={() =>
            void change({ catalogId: catalog.id, teacherId: id, add: true })
              .unwrap()
              .then(() => setId(""))
              .catch(() => {})
          }
        >
          Thêm
        </Button>
      </Stack>
      <Feedback error={state.error} />
      <Paper sx={giftStyles.surface}>
        <Typography
          sx={{
            fontWeight: 700,
          }}
        >
          {catalog.ownerName} · Quản lý chính
        </Typography>
        {catalog.managerIds.map((id) => (
          <Stack
            key={id}
            direction="row"
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography>
              {options.data?.teachers.find((t) => t.id === id)?.name ??
                "Giảng viên"}
            </Typography>
            <GiftAction
              label="Gỡ quyền quản lý"
              disabled={!catalog.canManageMembers || state.isLoading}
              onClick={() =>
                void change({
                  catalogId: catalog.id,
                  teacherId: id,
                  add: false,
                })
              }
            >
              <Close />
            </GiftAction>
          </Stack>
        ))}
      </Paper>
    </Stack>
  );
}
