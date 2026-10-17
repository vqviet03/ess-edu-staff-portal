"use client";
import { useDebouncedValue } from "@/shared/debounced-value";
import { useRouteState } from "@/shared/route-state";
import { publicId } from "@/shared/public-id";
import { exportPrefix } from "@/features/settings/branding";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { IconButton, Menu, Tooltip } from "@mui/material";
import Add from "@mui/icons-material/Add";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import ButtonBase from "@mui/material/ButtonBase";
import ChevronRight from "@mui/icons-material/ChevronRight";
import { ProfileAvatar } from "@/features/profile/avatar";
import { MobileFilters } from "@/shared/mobile-filters";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Pagination from "@mui/material/Pagination";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  useSelectionCountQuery,
  useManagementListQuery,
  usePreviewChangesMutation,
  useProfileExportMutation,
} from "@/api/management-api";
import { errorMessage } from "@/api/base-query";
import { Feedback, NavButton, Progress, Title } from "@/shared/ui";
import { confirmLeave, useUnsaved } from "@/shared/unsaved";
import type {
  Entity,
  Selection,
  BulkPreview,
  ManagedRecord,
  ListFilter,
} from "./models";
import { recordName } from "./models";
import { entityLabels, ManagerOnly, PreviewPanel, showValue } from "./shared";
import { EntityEditor, options } from "./editor";
import { fields, fieldNames } from "./validation";
function BulkEditor({
  entity,
  selection,
  close,
  onSaved,
}: {
  entity: Entity;
  selection: Selection;
  close: () => void;
  onSaved: (count: number) => void;
}) {
  const [patch, setPatch] = useState<Record<string, unknown>>({}),
    [data, setData] = useState<BulkPreview | null>(null),
    [preview, state] = usePreviewChangesMutation();
  useUnsaved(!!Object.keys(patch).length && !data);
  const supported = fields[entity].filter(
    (k) =>
      ![
        "id",
        "code",
        "name",
        "fullName",
        "nickname",
        "dateOfBirth",
        "kind",
        "profileId",
        "loginId",
        "totalUnits",
        "schedule",
      ].includes(k),
  );
  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      onClose={() => {
        if (confirmLeave()) close();
      }}
    >
      <DialogTitle>
        Sửa thuộc tính hàng loạt · {entityLabels[entity]}
      </DialogTitle>
      <DialogContent>
        {data ? (
          <PreviewPanel
            key={data.previewId}
            preview={data}
            onSaved={onSaved}
            close={() => setData(null)}
          />
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              {selection.mode === "FILTER"
                ? "Toàn bộ kết quả theo bộ lọc, kể cả ngoài trang hiện tại"
                : "Các bản ghi đã chọn"}
              . Trường không chọn giữ nguyên.
            </Alert>
            {state.error && <Feedback error={state.error} />}
            {supported.map((key) => (
              <Stack key={key} spacing={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={key in patch}
                      onChange={(_, checked) =>
                        setPatch((old) => {
                          const next = { ...old };
                          if (checked)
                            next[key] =
                              key === "status"
                                ? "ACTIVE"
                                : key === "roles"
                                  ? ["TEACHER"]
                                  : "";
                          else delete next[key];
                          return next;
                        })
                      }
                    />
                  }
                  label={fieldNames[key]}
                />
                {key in patch && (
                  <TextField
                    label={fieldNames[key] + " mới"}
                    value={
                      showValue(patch[key]) === "—"
                        ? ""
                        : Array.isArray(patch[key])
                          ? (patch[key] as string[]).join("|")
                          : patch[key]
                    }
                    select={!!options(entity, key)}
                    multiline={key === "notes"}
                    onChange={(e) =>
                      setPatch((old) => ({
                        ...old,
                        [key]:
                          key === "roles"
                            ? e.target.value.split("|")
                            : e.target.value,
                      }))
                    }
                  >
                    {options(entity, key)?.map((o) => (
                      <MenuItem key={o} value={o}>
                        {showValue(o)}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </Stack>
            ))}
            <Button
              variant="contained"
              loading={state.isLoading}
              disabled={!Object.keys(patch).length}
              onClick={async () => {
                try {
                  setData(
                    await preview({
                      entity,
                      selection,
                      patch,
                      mode: "UPDATE",
                      clearFields: Object.keys(patch).filter(
                        (k) => patch[k] === "",
                      ),
                    }).unwrap(),
                  );
                } catch {}
              }}
            >
              Xem preview trước / sau
            </Button>
            <Button
              onClick={() => {
                if (confirmLeave()) close();
              }}
            >
              Hủy
            </Button>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
export function ManagementListPage() {
  return (
    <ManagerOnly>
      <ManagementList />
    </ManagerOnly>
  );
}
function ManagementList() {
  const raw = useSearchParams().get("entity"),
    entity: Entity =
      raw && Object.hasOwn(entityLabels, raw) ? (raw as Entity) : "students";
  return <EntityList key={entity} entity={entity} />;
}
function EntityFilters({
  entity,
  filter,
  classes,
  change,
  showSearch = false,
}: {
  entity: Entity;
  filter: ListFilter;
  classes?: ManagedRecord[];
  change: (key: string, value: string) => void;
  showSearch?: boolean;
}) {
  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        {showSearch && (
          <TextField
            label="Tên / ID / số liên hệ"
            value={filter.search}
            onChange={(e) => change("search", e.target.value)}
          />
        )}{" "}
        <TextField
          select
          label="Trạng thái"
          value={filter.status}
          onChange={(e) => change("status", e.target.value)}
        >
          <MenuItem value="">Tất cả trạng thái</MenuItem>
          {options(entity, "status")?.map((s) => (
            <MenuItem key={s} value={s}>
              {showValue(s)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {(entity === "students" || entity === "teachers") && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="Lớp"
            value={filter.classId ?? ""}
            onChange={(e) => change("classId", e.target.value)}
          >
            <MenuItem value="">Tất cả lớp</MenuItem>
            {classes?.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {recordName(c)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Tài khoản"
            value={filter.accountStatus ?? ""}
            onChange={(e) => change("accountStatus", e.target.value)}
          >
            <MenuItem value="">Tất cả tài khoản</MenuItem>
            {["PENDING", "ACTIVE", "LOCKED"].map((s) => (
              <MenuItem key={s} value={s}>
                {showValue(s)}
              </MenuItem>
            ))}
          </TextField>
          {entity === "teachers" && (
            <TextField
              select
              label="Vai trò"
              value={filter.role ?? ""}
              onChange={(e) => change("role", e.target.value)}
            >
              <MenuItem value="">Tất cả vai trò</MenuItem>
              <MenuItem value="TEACHER">Giảng viên</MenuItem>
              <MenuItem value="MANAGER">Quản lý</MenuItem>
            </TextField>
          )}
        </Stack>
      )}
    </>
  );
}

function EntityList({ entity }: { entity: Entity }) {
  const mobile = useMediaQuery(useTheme().breakpoints.down("md"));
  const [filter, setFilter] = useRouteState<ListFilter>(
      `management:${entity}:filter`,
      { search: "", status: "" },
    ),
    [page, setPage] = useRouteState(`management:${entity}:page`, 1),
    [selection, setSelection] = useState<Selection>({ mode: "IDS", ids: [] }),
    [editing, setEditing] = useState<ManagedRecord | "new" | null>(null),
    [bulk, setBulk] = useState(false),
    [mobileSelection, setMobileSelection] = useState(false),
    [mobileMenu, setMobileMenu] = useState<HTMLElement | null>(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const request = useDebouncedValue(
    useMemo(
      () => ({ entity, filter, page, pageSize: 10 }),
      [entity, filter, page],
    ),
  );
  const q = useManagementListQuery(request),
    classOptions = useManagementListQuery(
      { entity: "classes", filter: {}, page: 1, pageSize: 100 },
      { skip: entity !== "students" && entity !== "teachers" },
    ),
    [exportRows, exportState] = useProfileExportMutation();
  const selectionCount = useSelectionCountQuery(
    { entity, selection },
    { skip: selection.mode !== "FILTER" },
  );
  const rows = q.currentData?.items ?? [],
    total = q.currentData?.total ?? 0,
    count =
      selection.mode === "IDS"
        ? selection.ids.length
        : (selectionCount.currentData?.count ?? 0),
    checked = (id: string) =>
      selection.mode === "IDS"
        ? selection.ids.includes(id)
        : !selection.excludedIds.includes(id);
  const select = (ids: string[], check: boolean) =>
    setSelection((old) =>
      old.mode === "IDS"
        ? {
            mode: "IDS",
            ids: check
              ? [...new Set([...old.ids, ...ids])]
              : old.ids.filter((id) => !ids.includes(id)),
          }
        : {
            ...old,
            excludedIds: check
              ? old.excludedIds.filter((id) => !ids.includes(id))
              : [...new Set([...old.excludedIds, ...ids])],
          },
    );
  const changeFilter = (key: string, value: string) => {
    setFilter((old) => ({ ...old, [key]: value }));
    setPage(1);
    setSelection({ mode: "IDS", ids: [] });
  };
  const href = (id: string) =>
    `/manage/profile/?entity=${entity}&id=${encodeURIComponent(id)}`;
  return (
    <>
      <Title
        title={entityLabels[entity]}
        subtitle={
          mobile
            ? `${total} kết quả`
            : "Quản lý hồ sơ, trạng thái và lịch sử. Thay đổi có kiểm tra ảnh hưởng."
        }
        actions={
          mobile ? (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title={`Thêm ${entityLabels[entity].toLowerCase()}`}>
                <IconButton
                  aria-label={`Thêm ${entityLabels[entity].toLowerCase()}`}
                  onClick={() => setEditing("new")}
                >
                  <Add fontSize="small" />
                </IconButton>
              </Tooltip>
              {(entity === "students" || entity === "teachers") && (
                <>
                  <Tooltip title="Thao tác hồ sơ">
                    <IconButton
                      aria-label="Thao tác hồ sơ"
                      onClick={(e) => setMobileMenu(e.currentTarget)}
                    >
                      <MoreHoriz fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Menu
                    anchorEl={mobileMenu}
                    open={!!mobileMenu}
                    onClose={() => setMobileMenu(null)}
                  >
                    <MenuItem
                      component={Link}
                      href={`/manage/grid/?entity=${entity}`}
                      onClick={() => setMobileMenu(null)}
                    >
                      Thêm bằng bảng
                    </MenuItem>
                    <MenuItem
                      component={Link}
                      href={`/manage/excel/?entity=${entity}`}
                      onClick={() => setMobileMenu(null)}
                    >
                      Excel · Nhập & xuất
                    </MenuItem>
                  </Menu>
                </>
              )}
            </Stack>
          ) : (
            <>
              <Button variant="contained" onClick={() => setEditing("new")}>
                Thêm{" "}
                {entity === "teachers"
                  ? "giảng viên"
                  : entityLabels[entity].toLowerCase()}
              </Button>
              {(entity === "students" || entity === "teachers") && (
                <>
                  <NavButton href={`/manage/grid/?entity=${entity}`}>
                    Thêm bằng bảng
                  </NavButton>
                  <NavButton href={`/manage/excel/?entity=${entity}`}>
                    Excel · Nhập & xuất
                  </NavButton>
                </>
              )}
            </>
          )
        }
      />
      <Paper
        sx={{
          p: { xs: 0, md: 2.5 },
          bgcolor: { xs: "transparent", md: "background.paper" },
          borderWidth: { xs: 0, md: 1 },
          minWidth: 0,
        }}
      >
        <Stack spacing={2}>
          {mobile ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <TextField
                label="Tên / ID / số liên hệ"
                value={filter.search}
                onChange={(e) => changeFilter("search", e.target.value)}
                sx={{ flex: 1, minWidth: 0 }}
              />
              <MobileFilters
                value={filter}
                empty={{ search: filter.search, status: "" }}
                title={`Lọc ${entityLabels[entity].toLowerCase()}`}
                onApply={(next) => {
                  setFilter(next);
                  setPage(1);
                  setSelection({ mode: "IDS", ids: [] });
                }}
              >
                {(value, update) => (
                  <EntityFilters
                    entity={entity}
                    filter={value}
                    classes={classOptions.currentData?.items}
                    change={(key, text) => update({ ...value, [key]: text })}
                  />
                )}
              </MobileFilters>
            </Stack>
          ) : (
            <EntityFilters
              entity={entity}
              filter={filter}
              classes={classOptions.currentData?.items}
              change={changeFilter}
              showSearch
            />
          )}
          {mobile && (
            <Button
              sx={{ alignSelf: "flex-start" }}
              onClick={() => setMobileSelection((value) => !value)}
            >
              {mobileSelection ? "Thu gọn lựa chọn" : "Chọn nhiều"}
            </Button>
          )}
          {(!mobile || mobileSelection || count > 0) && (
            <>
              <Alert severity="info">
                Đã chọn{" "}
                {selection.mode === "FILTER" &&
                selectionCount.isFetching &&
                !selectionCount.currentData
                  ? "đang xác nhận số lượng"
                  : count}{" "}
                {selection.mode === "FILTER"
                  ? `trong toàn bộ ${total} kết quả theo bộ lọc`
                  : `bản ghi (các ID chọn qua các trang)`}
                .
              </Alert>
              <Stack
                direction="row"
                useFlexGap
                sx={{ gap: 1, flexWrap: "wrap" }}
              >
                <Button
                  disabled={!total}
                  onClick={() =>
                    setSelection({
                      mode: "FILTER",
                      filter: { ...filter },
                      excludedIds: [],
                    })
                  }
                >
                  Chọn tất cả {total} kết quả
                </Button>
                <Button
                  disabled={!count}
                  onClick={() => setSelection({ mode: "IDS", ids: [] })}
                >
                  Bỏ chọn
                </Button>
                <Button disabled={!count} onClick={() => setBulk(true)}>
                  Sửa hàng loạt
                </Button>
                {(entity === "students" || entity === "teachers") && (
                  <Button
                    loading={exportState.isLoading}
                    onClick={async () => {
                      try {
                        setError("");
                        const blob = await exportRows({
                            entity,
                            selection: count
                              ? selection
                              : { mode: "FILTER", filter, excludedIds: [] },
                          }).unwrap(),
                          { download } =
                            await import("@/features/excel/workbook");
                        download(
                          blob,
                          `${exportPrefix()}_${entity}_${count ? "da_chon" : "bo_loc"}.xlsx`,
                        );
                      } catch (e) {
                        setError(errorMessage(e));
                      }
                    }}
                  >
                    Xuất Excel {count ? "bản ghi chọn" : "toàn bộ bộ lọc"}
                  </Button>
                )}
              </Stack>
            </>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          {q.isLoading || (q.isFetching && !q.currentData) || q.error ? (
            <Feedback
              loading={q.isLoading || (q.isFetching && !q.currentData)}
              error={q.error}
              retry={() => void q.refetch()}
            />
          ) : !rows.length ? (
            <Feedback empty="Không có bản ghi phù hợp. Vẫn có thể tải template trống." />
          ) : (
            <>
              <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
                <Table sx={{ minWidth: 750 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <Checkbox
                          slotProps={{
                            input: {
                              "aria-label": "Chọn các bản ghi trên trang",
                            },
                          }}
                          checked={rows.every((r) => checked(r.id))}
                          indeterminate={
                            rows.some((r) => checked(r.id)) &&
                            !rows.every((r) => checked(r.id))
                          }
                          onChange={(_, v) =>
                            select(
                              rows.map((r) => r.id),
                              v,
                            )
                          }
                        />
                      </TableCell>
                      {[
                        "ID",
                        "Hồ sơ",
                        ...(entity === "classes"
                          ? ["Lịch / Tiến độ"]
                          : ["Liên hệ"]),
                        "Trạng thái",
                        "",
                      ].map((h, i) => (
                        <TableCell key={i}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Checkbox
                            slotProps={{
                              input: {
                                "aria-label": `Chọn ${publicId("loginId" in r ? r.loginId : r.id)}`,
                              },
                            }}
                            checked={checked(r.id)}
                            onChange={(_, v) => select([r.id], v)}
                          />
                        </TableCell>
                        <TableCell>
                          {publicId("loginId" in r ? r.loginId : r.id)}
                        </TableCell>
                        <TableCell>
                          <Button component={Link} href={href(r.id)}>
                            {recordName(r)}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {"totalUnits" in r ? (
                            <Stack spacing={1}>
                              <Typography variant="body2">
                                {r.schedule}
                              </Typography>
                              <Progress
                                completed={r.completedUnits}
                                total={r.totalUnits}
                              />
                            </Stack>
                          ) : "email" in r ? (
                            r.email
                          ) : "parentContact" in r ? (
                            r.parentContact
                          ) : "roles" in r ? (
                            r.roles.join(" | ")
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{showValue(r.status)}</TableCell>
                        <TableCell>
                          <Button component={Link} href={href(r.id)}>
                            Hồ sơ
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" } }}>
                {rows.map((r) => (
                  <Box
                    key={r.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      p: 1.25,
                      gap: 1,
                      bgcolor: "background.paper",
                      borderRadius: "12px",
                      minWidth: 0,
                    }}
                  >
                    <Checkbox
                      checked={checked(r.id)}
                      onChange={(_, v) => select([r.id], v)}
                      slotProps={{
                        input: {
                          "aria-label": `Chọn ${publicId("loginId" in r ? r.loginId : r.id)}`,
                        },
                      }}
                    />
                    <ButtonBase
                      component={Link}
                      href={href(r.id)}
                      aria-label={`Xem hồ sơ ${recordName(r)}`}
                      sx={{
                        display: "flex",
                        gap: 1.25,
                        flex: 1,
                        minWidth: 0,
                        justifyContent: "flex-start",
                        textAlign: "left",
                        borderRadius: 1,
                        minHeight: 44,
                      }}
                    >
                      {(entity === "students" || entity === "teachers") && (
                        <ProfileAvatar
                          fallbackInitials
                          name={recordName(r)}
                          size={36}
                          value={
                            "avatar" in r
                              ? (r.avatar as import("@/features/profile/models").AvatarChoice)
                              : undefined
                          }
                        />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: 14,
                            lineHeight: "20px",
                            fontWeight: 600,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {recordName(r)}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 12,
                            lineHeight: "18px",
                            color: "text.secondary",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {publicId("loginId" in r ? r.loginId : r.id)} ·{" "}
                          {showValue(r.status)}
                        </Typography>
                        {"totalUnits" in r && (
                          <Progress
                            completed={r.completedUnits}
                            total={r.totalUnits}
                          />
                        )}
                      </Box>
                      <ChevronRight
                        sx={{
                          fontSize: 20,
                          color: "text.secondary",
                          flexShrink: 0,
                        }}
                      />
                    </ButtonBase>
                  </Box>
                ))}
              </Stack>
              <Typography variant="body2">
                {total} kết quả · Trang {page}/
                {Math.max(1, Math.ceil(total / 10))}
              </Typography>
              <Pagination
                aria-label="Phân trang hồ sơ"
                count={Math.ceil(total / 10)}
                page={page}
                onChange={(_, v) => setPage(v)}
                size="small"
              />
            </>
          )}
        </Stack>
      </Paper>
      {editing && (
        <EntityEditor
          entity={entity}
          record={editing === "new" ? undefined : editing}
          close={(saved) => {
            setEditing(null);
            if (saved) setMessage(`Đã cập nhật ${saved} bản ghi.`);
          }}
        />
      )}
      {bulk && (
        <BulkEditor
          entity={entity}
          selection={selection}
          close={() => setBulk(false)}
          onSaved={(n) => {
            setBulk(false);
            setSelection({ mode: "IDS", ids: [] });
            setMessage(`Đã cập nhật ${n} bản ghi.`);
          }}
        />
      )}
      <Snackbar
        open={!!message}
        onClose={() => setMessage("")}
        autoHideDuration={5000}
        message={message}
      />
    </>
  );
}
