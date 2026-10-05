"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
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
  useLazyProfileTemplateQuery,
  useProfileImportMutation,
  useProfileExportMutation,
  usePreviewChangesMutation,
} from "@/api/management-api";
import { errorMessage } from "@/api/base-query";
import { Card, NavButton, Title } from "@/shared/ui";
import { useUnsaved } from "@/shared/unsaved";
import type { BulkPreview, ProfileGroup } from "./models";
import { columns, columnFields } from "./excel-workbook";
import {
  defaults,
  entitySchemas,
  fieldNames,
  parseRoles,
  rolesInput,
} from "./validation";
import { entityLabels, ManagerOnly, PreviewPanel } from "./shared";
import { options } from "./editor";
async function downloadBlob(blob: Blob, name: string) {
  const { download } = await import("@/features/excel/workbook");
  download(blob, name);
}
export function ManagementExcelPage() {
  return (
    <ManagerOnly>
      <Excel />
    </ManagerOnly>
  );
}
function Excel() {
  const params = useSearchParams(),
    [group, setGroup] = useState<ProfileGroup>(
      params.get("entity") === "teachers" ? "teachers" : "students",
    ),
    [mode, setMode] = useState<"CREATE" | "UPDATE">("CREATE"),
    [file, setFile] = useState<File | null>(null),
    [search, setSearch] = useState(params.get("search") ?? ""),
    [clearFields, setClearFields] = useState<string[]>([]),
    [data, setData] = useState<BulkPreview | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [template, t] = useLazyProfileTemplateQuery(),
    [preview, p] = useProfileImportMutation(),
    [exportRows, x] = useProfileExportMutation(),
    busy = t.isFetching || p.isLoading || x.isLoading;
  useUnsaved(!!file && !message);
  return (
    <>
      <Title
        title="Excel · Nhập & xuất"
        subtitle="Template riêng theo nhóm; giữ tiếng Việt và xuống dòng. Không xuất mật khẩu / token."
        actions={
          <NavButton href={`/manage/list/?entity=${group}`}>
            ← Danh sách
          </NavButton>
        }
      />
      <Stack spacing={2.5}>
        {message && <Alert severity="success">{message}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <Card>
          <Stack spacing={2}>
            <Typography variant="h5">1. Chọn nhóm và phạm vi xuất</Typography>
            <TextField
              select
              label="Nhóm dữ liệu"
              value={group}
              onChange={(e) => {
                setGroup(e.target.value as ProfileGroup);
                setFile(null);
                setData(null);
                setClearFields([]);
                setMessage("");
              }}
            >
              {["students", "teachers"].map((g) => (
                <MenuItem key={g} value={g}>
                  {entityLabels[g as ProfileGroup]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Bộ lọc tên / ID cho toàn bộ dữ liệu xuất"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Typography variant="body2">
              Phạm vi: toàn bộ kết quả phù hợp tìm kiếm; bản ghi chọn có thể
              xuất ngay tại danh sách.
            </Typography>
            <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: "wrap" }}>
              <Button
                loading={t.isFetching}
                disabled={busy}
                onClick={async () => {
                  try {
                    setError("");
                    await downloadBlob(
                      await template(group).unwrap(),
                      `ESS_${group}_template.xlsx`,
                    );
                  } catch (e) {
                    setError(errorMessage(e));
                  }
                }}
              >
                Tải template trống
              </Button>
              <Button
                loading={x.isLoading}
                disabled={busy}
                onClick={async () => {
                  try {
                    setError("");
                    await downloadBlob(
                      await exportRows({
                        entity: group,
                        selection: {
                          mode: "FILTER",
                          filter: { search },
                          excludedIds: [],
                        },
                      }).unwrap(),
                      `ESS_${group}_export.xlsx`,
                    );
                  } catch (e) {
                    setError(errorMessage(e));
                  }
                }}
              >
                Tải Excel dữ liệu hiện tại theo filter
              </Button>
            </Stack>
            <Alert severity="info">
              Nhóm chưa có bản ghi vẫn tải template với header, Schema,
              Instructions và dòng trống. Ví dụ chỉ ở Instructions.
            </Alert>
          </Stack>
        </Card>
        <Card>
          <Stack spacing={2}>
            <Typography variant="h5">2. Import .xlsx</Typography>
            <TextField
              select
              label="Chế độ"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as "CREATE" | "UPDATE");
                setData(null);
                setMessage("");
              }}
            >
              <MenuItem value="CREATE">Tạo mới</MenuItem>
              <MenuItem value="UPDATE">
                Cập nhật (ô trống giữ dữ liệu cũ)
              </MenuItem>
            </TextField>
            <Button component="label" variant="outlined" disabled={busy}>
              Chọn file .xlsx
              <input
                hidden
                type="file"
                accept=".xlsx"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  setData(null);
                  setError("");
                  setMessage("");
                }}
              />
            </Button>
            <Typography>{file?.name ?? "Chưa chọn file"}</Typography>
            {mode === "UPDATE" && (
              <Box>
                <Typography variant="body2">
                  Xóa rõ giá trị của cột trống (có preview trước khi xác nhận):
                </Typography>
                {[
                  "notes",
                  ...(group === "students"
                    ? ["nickname", "parentContact", "dateOfBirth"]
                    : ["email", "phone"]),
                ].map((k) => (
                  <FormControlLabel
                    key={k}
                    control={
                      <Checkbox
                        checked={clearFields.includes(k)}
                        onChange={(_, v) => {
                          setClearFields((old) =>
                            v ? [...old, k] : old.filter((x) => x !== k),
                          );
                          setData(null);
                        }}
                      />
                    }
                    label={fieldNames[k]}
                  />
                ))}
              </Box>
            )}
            <Button
              variant="contained"
              loading={p.isLoading}
              disabled={!file || busy}
              onClick={async () => {
                if (!file) return;
                try {
                  setError("");
                  setData(
                    await preview({
                      entity: group,
                      file,
                      mode,
                      clearFields,
                    }).unwrap(),
                  );
                } catch (e) {
                  setError(errorMessage(e));
                }
              }}
            >
              Kiểm tra & xem trước
            </Button>
            <Alert severity="info">
              Mặc định ô trống không ghi đè. Ngừng hoạt động và thay vai trò vẫn
              phải xác nhận ảnh hưởng; commit nguyên tử, có idempotency.
            </Alert>
          </Stack>
        </Card>
        {data && (
          <Card>
            <Typography variant="h5" sx={{ mb: 2 }}>
              3. Xem trước import
            </Typography>
            <PreviewPanel
              key={data.previewId}
              preview={data}
              close={() => setData(null)}
              onSaved={(n) => {
                setData(null);
                setFile(null);
                setMessage(`Import thành công: ${n} bản ghi.`);
              }}
            />
          </Card>
        )}
      </Stack>
    </>
  );
}
const blank = (group: ProfileGroup) =>
  Object.fromEntries(columns[group].map((c) => [columnFields[c], ""]));
export function ManagementGridPage() {
  return (
    <ManagerOnly>
      <Grid />
    </ManagerOnly>
  );
}
function Grid() {
  const raw = useSearchParams().get("entity"),
    group: ProfileGroup = raw === "teachers" ? "teachers" : "students";
  return <InputGrid key={group} group={group} />;
}
function InputGrid({ group }: { group: ProfileGroup }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>(() => [
      blank(group),
      blank(group),
      blank(group),
    ]),
    [data, setData] = useState<BulkPreview | null>(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [preview, p] = usePreviewChangesMutation(),
    [template, t] = useLazyProfileTemplateQuery();
  const nonempty = (r: Record<string, unknown>) =>
      Object.values(r).some((v) => v !== "" && v !== null && v !== undefined),
    filled = rows.filter(nonempty);
  useUnsaved(!!filled.length && !message);
  const errors = rows.map((r) => {
    if (!nonempty(r)) return {} as Record<string, string>;
    const normalized = {
        ...defaults(group),
        ...Object.fromEntries(Object.entries(r).filter(([, v]) => v !== "")),
      },
      parsed = entitySchemas[group].safeParse(normalized);
    const e = parsed.success
      ? {}
      : Object.fromEntries(
          parsed.error.issues.map((x) => [x.path.join("."), x.message]),
        );
    if (
      group === "teachers" &&
      r.roles &&
      !rolesInput.safeParse(parseRoles(r.roles)).success
    )
      e.roles = "TEACHER / MANAGER / TEACHER|MANAGER";
    return e;
  });
  const change = (i: number, k: string, value: unknown) => {
    setRows((old) => old.map((r, j) => (i === j ? { ...r, [k]: value } : r)));
    setData(null);
    setMessage("");
  };
  const keys = columns[group].map((c) => columnFields[c]);
  return (
    <>
      <Title
        title="Thêm bằng bảng template"
        subtitle="Nhập hoặc dán từ Excel. ID trống sinh từ tên; ID trùng tự thêm số trong preview. Dòng hoàn toàn trống được bỏ qua."
        actions={
          <>
            <NavButton href="/manage/grid/?entity=students">Học sinh</NavButton>
            <NavButton href="/manage/grid/?entity=teachers">
              Giảng viên / Staff
            </NavButton>
            <Button
              loading={t.isFetching}
              onClick={async () => {
                try {
                  await downloadBlob(
                    await template(group).unwrap(),
                    `ESS_${group}_template.xlsx`,
                  );
                } catch (e) {
                  setError(errorMessage(e));
                }
              }}
            >
              Tải template
            </Button>
          </>
        }
      />
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        <Card>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Bảng nhập · {entityLabels[group]}
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Không tự ghi danh hoặc phân công lớp. Tài khoản tạo cùng hồ sơ có
            trạng thái PENDING.
          </Alert>
          <TableContainer sx={{ maxHeight: 550 }}>
            <Table stickyHeader sx={{ minWidth: 1600 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Dòng</TableCell>
                  {keys.map((k) => (
                    <TableCell key={k}>
                      {fieldNames[k]}
                      {["id", "fullName"].includes(k) ? " *" : ""}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 2}</TableCell>
                    {keys.map((k, j) => (
                      <TableCell
                        key={k}
                        sx={{ minWidth: k === "notes" ? 280 : 180 }}
                      >
                        <TextField
                          label={`${fieldNames[k]} dòng ${i + 2}`}
                          value={row[k] ?? ""}
                          multiline={k === "notes"}
                          select={k === "createAccount" || !!options(group, k)}
                          error={!!errors[i][k]}
                          helperText={errors[i][k]}
                          onChange={(e) => change(i, k, e.target.value)}
                          onPaste={(e) => {
                            const text = e.clipboardData.getData("text");
                            if (!text.includes("\t")) return;
                            e.preventDefault();
                            const incoming = text
                              .replace(/\r/g, "")
                              .replace(/\n$/, "")
                              .split("\n")
                              .map((r) => r.split("\t"));
                            if (incoming.length > 5000) {
                              setError("Tối đa 5000 dòng.");
                              return;
                            }
                            setRows((old) => {
                              const next = old.map((r) => ({ ...r }));
                              for (let a = 0; a < incoming.length; a++) {
                                next[i + a] ??= blank(group);
                                for (
                                  let b = 0;
                                  b < incoming[a].length && j + b < keys.length;
                                  b++
                                )
                                  next[i + a][keys[j + b]] = incoming[a][b];
                              }
                              return next;
                            });
                            setData(null);
                            setMessage("");
                          }}
                        >
                          {(k === "createAccount"
                            ? ["TRUE", "FALSE"]
                            : options(group, k)
                          )?.map((o) => (
                            <MenuItem key={o} value={o}>
                              {o}
                            </MenuItem>
                          ))}
                          {(k === "createAccount" || options(group, k)) && (
                            <MenuItem value="">Để trống / mặc định</MenuItem>
                          )}
                        </TextField>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography sx={{ my: 2 }}>
            {filled.length} dòng có dữ liệu · {rows.length - filled.length} dòng
            trống được bỏ qua
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              disabled={rows.length >= 5000}
              onClick={() => setRows((old) => [...old, blank(group)])}
            >
              + Dòng mới
            </Button>
            <Button
              variant="contained"
              loading={p.isLoading}
              disabled={
                !filled.length || errors.some((e) => Object.keys(e).length > 0)
              }
              onClick={async () => {
                try {
                  setError("");
                  setData(
                    await preview({
                      entity: group,
                      mode: "CREATE",
                      rows: rows.map((r, i) => ({ ...r, _excelRow: i + 2 })),
                    }).unwrap(),
                  );
                } catch (e) {
                  setError(errorMessage(e));
                }
              }}
            >
              Xem trước & lưu
            </Button>
          </Stack>
        </Card>
        {data && (
          <Card>
            <PreviewPanel
              key={data.previewId}
              preview={data}
              close={() => setData(null)}
              onSaved={(n) => {
                setData(null);
                setRows([blank(group), blank(group), blank(group)]);
                setMessage(`Đã thêm ${n} hồ sơ.`);
              }}
            />
          </Card>
        )}
      </Stack>
    </>
  );
}
