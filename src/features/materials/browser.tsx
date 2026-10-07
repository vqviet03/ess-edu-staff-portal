"use client";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import FolderIcon from "@mui/icons-material/Folder";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Alert from "@mui/material/Alert";
import {
  useLazyAccessQuery,
  useLazyFolderPathQuery,
  useFoldersQuery,
  useFilesQuery,
  useRenameFileMutation,
  useRequestDeletionMutation,
  useMoveFilesMutation,
  useSaveFolderMutation,
  useRemoveFolderMutation,
  useAuditFileQuery,
} from "@/api/library-api";
import { useWorkspace } from "@/features/access/hooks";
import { Feedback } from "@/shared/ui";
import { MaterialViewer } from "./viewer";
import { UploadDialog } from "./upload";
import type { Folder, MaterialFile } from "./models";
import { bytes, fileKind, toggleSelection } from "./utils";
const symbols: Record<string, string> = {
  PDF: "▤",
  Audio: "♫",
  Ảnh: "▧",
  Video: "▷",
  File: "⌁",
};
const FileTile = memo(function FileTile({
  file,
  selected,
  toggle,
  preview,
  info,
  tree = false,
}: {
  file: MaterialFile;
  selected: boolean;
  toggle: (file: MaterialFile) => void;
  preview: (file: MaterialFile) => void;
  info: (file: MaterialFile) => void;
  tree?: boolean;
}) {
  return (
    <Paper
      sx={{
        p: 1.5,
        border: 2,
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected ? "action.selected" : "background.paper",
        minWidth: 0,
        display: tree ? "flex" : "block",
        alignItems: "center",
        gap: 1,
        contentVisibility: "auto",
        containIntrinsicSize: "190px",
      }}
    >
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <Checkbox
          checked={selected}
          onChange={() => toggle(file)}
          slotProps={{ input: { "aria-label": `Chọn ${file.displayName}` } }}
        />
        <Typography variant="caption">{fileKind(file.mimeType)}</Typography>
        <Button
          aria-label={`Thông tin ${file.displayName}`}
          onClick={() => info(file)}
          sx={{ minWidth: 44 }}
        >
          ···
        </Button>
      </Stack>
      <Button
        onClick={() => preview(file)}
        aria-label={`Xem ${file.displayName}`}
        sx={{
          display: "flex",
          flexDirection: tree ? "row" : "column",
          gap: 1,
          width: "100%",
          textTransform: "none",
          color: "text.primary",
          minWidth: 0,
        }}
      >
        {!tree && (
          <Box
            sx={{
              height: 116,
              width: "100%",
              display: "grid",
              placeItems: "center",
              bgcolor: "action.hover",
              borderRadius: 1.5,
              overflow: "hidden",
            }}
          >
            {file.thumbnailUrl ? (
              <Box
                component="img"
                src={file.thumbnailUrl}
                alt=""
                loading="lazy"
                sx={{ maxWidth: "100%", maxHeight: 108, objectFit: "contain" }}
              />
            ) : (
              <Typography
                aria-hidden
                sx={{ fontSize: 48, color: "primary.main" }}
              >
                {symbols[fileKind(file.mimeType)]}
              </Typography>
            )}
          </Box>
        )}
        <Tooltip title={file.displayName}>
          <Typography
            variant="body2"
            sx={{
              ...{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                overflowWrap: "anywhere",
                textAlign: tree ? "left" : "center",
              },
              fontWeight: 600,
            }}
          >
            {file.displayName}
          </Typography>
        </Tooltip>
      </Button>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: "block",
          textAlign: tree ? "left" : "center",
          overflowWrap: "anywhere",
        }}
      >
        {bytes(file.sizeBytes)} · {file.authorName}
      </Typography>
    </Paper>
  );
});
function TreeBranch({
  folderId,
  depth,
  selected,
  selectedFolders,
  toggleFolder,
  picker,
  toggle,
  preview,
  info,
  openFolder,
  workspace,
  sort,
}: {
  folderId: string | null;
  depth: number;
  selected: Record<string, MaterialFile>;
  selectedFolders: Record<string, Folder>;
  toggleFolder: (f: Folder) => void;
  picker: boolean;
  toggle: (f: MaterialFile) => void;
  preview: (f: MaterialFile) => void;
  info: (f: MaterialFile) => void;
  openFolder: (f: Folder) => void;
  workspace: string;
  sort: string;
}) {
  const folders = useFoldersQuery({ parentId: folderId, workspace }),
    [cursor, setCursor] = useState<string>(),
    files = useFilesQuery(
      {
        folderId,
        search: "",
        scope: "current",
        type: "",
        sort,
        cursor,
        limit: 30,
        workspace,
      },
      { },
    ),
    [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return (
    <Stack
      spacing={1}
      sx={{
        pl: depth ? { xs: 1, md: 2 } : 0,
        borderLeft: depth ? 1 : 0,
        borderColor: "divider",
      }}
    >
      <Feedback
        loading={folders.isLoading || files.isLoading}
        error={folders.error || files.error}
        retry={() => {
          void folders.refetch();
          void files.refetch();
        }}
      />
      {folders.currentData?.items.map((f) => (
        <Box key={f.id}>
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              bgcolor: selectedFolders[f.id] ? "action.selected" : undefined,
              border: selectedFolders[f.id] ? 1 : 0,
              borderColor: "primary.main",
              borderRadius: 1,
            }}
          >
            {!picker && (
              <Checkbox
                checked={!!selectedFolders[f.id]}
                onChange={() => toggleFolder(f)}
                slotProps={{
                  input: { "aria-label": `Chọn thư mục ${f.name}` },
                }}
              />
            )}
            <Button
              aria-expanded={!!expanded[f.id]}
              aria-label={`Mở nhánh ${f.name}`}
              onClick={() => setExpanded((e) => ({ ...e, [f.id]: !e[f.id] }))}
              sx={{ minWidth: 44 }}
            >
              {expanded[f.id] ? "▾" : "▸"}
            </Button>
            <Button
              onClick={() => openFolder(f)}
              sx={{ textTransform: "none" }}
            >
              <FolderIcon fontSize="small" sx={{ mr: 1 }} /> {f.name}
            </Button>
          </Stack>
          {expanded[f.id] && (
            <TreeBranch
              folderId={f.id}
              depth={depth + 1}
              selected={selected}
              selectedFolders={selectedFolders}
              toggleFolder={toggleFolder}
              picker={picker}
              toggle={toggle}
              preview={preview}
              info={info}
              openFolder={openFolder}
              workspace={workspace}
              sort={sort}
            />
          )}
        </Box>
      ))}
      {files.currentData?.items.map((f) => (
        <FileTile
          key={f.id}
          file={f}
          selected={!!selected[f.id]}
          toggle={toggle}
          preview={preview}
          info={info}
          tree
        />
      ))}
      <Stack direction="row">
        {cursor && (
          <Button onClick={() => setCursor(undefined)}>Trang file đầu</Button>
        )}
        {files.currentData?.nextCursor && (
          <Button
            onClick={() =>
              setCursor(files.currentData?.nextCursor ?? undefined)
            }
          >
            File tiếp theo
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
function FileInformation({
  file,
  close,
  manager,
}: {
  file: MaterialFile;
  close: () => void;
  manager: boolean;
}) {
  const audit = useAuditFileQuery(file.id, { skip: !manager });
  return (
    <Dialog open onClose={close} fullWidth maxWidth="md">
      <DialogTitle>{file.displayName}</DialogTitle>
      <DialogContent>
        <Typography>Tên gốc: {file.originalName}</Typography>
        <Typography>Tác giả: {file.authorName}</Typography>
        <Typography>
          Dung lượng: {bytes(file.sizeBytes)} · {file.mimeType}
        </Typography>
        <Typography>
          Nguồn:{" "}
          {file.uploadSource === "session" ? "Phiên học" : "Kho tài liệu"}
        </Typography>
        <Typography>
          Tạo: {new Date(file.createdAt).toLocaleString("vi-VN")}
        </Typography>
        {manager && (
          <>
            <Typography>Storage: {file.storageId}</Typography>
            <Typography sx={{ overflowWrap: "anywhere" }}>
              Object: {file.storageObjectKey}
            </Typography>
            <Typography variant="h6" sx={{ mt: 2 }}>
              Nhật ký
            </Typography>
            <Feedback
              loading={audit.isLoading}
              error={audit.error}
              retry={() => void audit.refetch()}
            />
            {audit.currentData?.items.map((a) => (
              <Paper key={a.id} sx={{ p: 1.5, my: 1 }}>
                <Typography>
                  {a.action} · {new Date(a.createdAt).toLocaleString("vi-VN")}
                </Typography>
                <Typography variant="caption">
                  Người thao tác: {a.actorId}
                </Typography>
                <Typography
                  component="pre"
                  sx={{
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    fontSize: 12,
                  }}
                >
                  {a.changesJson}
                </Typography>
              </Paper>
            ))}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}
export function MaterialBrowser({
  picker = false,
  onAdd,
}: {
  picker?: boolean;
  onAdd?: (files: MaterialFile[]) => void;
}) {
  const workspace = useWorkspace(),
    manager = workspace.selected === "manager",
    staffId = workspace.staff?.id,
    [path, setPath] = useState<Folder[]>([]),
    folderId = path.at(-1)?.id ?? null,
    [mode, setMode] = useState<"grid" | "tree">("grid"),
    [search, setSearch] = useState(""),
    [debounced, setDebounced] = useState(""),
    [scope, setScope] = useState<"current" | "all">("current"),
    [type, setType] = useState(""),
    [sort, setSort] = useState("name"),
    [cursor, setCursor] = useState<string>(),
    [selected, setSelected] = useState<Record<string, MaterialFile>>({}),
    [selectedFolders, setSelectedFolders] = useState<Record<string, Folder>>(
      {},
    ),
    [preview, setPreview] = useState<MaterialFile | null>(null),
    [metadata, setMetadata] = useState<MaterialFile | null>(null),
    [information, setInformation] = useState<MaterialFile | null>(null),
    [upload, setUpload] = useState(false),
    [error, setError] = useState<unknown>(),
    [message, setMessage] = useState(""),
    [folderEdit, setFolderEdit] = useState<Folder | null | undefined>(),
    [folderName, setFolderName] = useState(""),
    [kind, setKind] = useState<Folder["kind"]>("CUSTOM"),
    [rename, setRename] = useState<MaterialFile | null>(null),
    [newName, setNewName] = useState(""),
    [reason, setReason] = useState(""),
    [requestFile, setRequestFile] = useState<MaterialFile | null>(null);
  const folders = useFoldersQuery({
      parentId: folderId,
      search: debounced,
      scope,
      workspace: workspace.selected ?? undefined,
    }),
    files = useFilesQuery(
      {
        folderId,
        search: debounced,
        scope,
        type,
        sort,
        cursor,
        limit: 40,
        workspace: workspace.selected ?? undefined,
      },
      { },
    ),
    [saveFolder, folderState] = useSaveFolderMutation(),
    [removeFolder] = useRemoveFolderMutation(),
    [download, downloadState] = useLazyAccessQuery(),
    [loadPath] = useLazyFolderPathQuery(),
    navigationId = useRef(0),
    [renameFile, renameState] = useRenameFileMutation(),
    [move, moveState] = useMoveFilesMutation(),
    [requestDelete, deleteState] = useRequestDeletionMutation();
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setCursor(undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const toggle = useCallback(
      (file: MaterialFile) => setSelected((s) => toggleSelection(s, file)),
      [],
    ),
    toggleFolder = useCallback(
      (folder: Folder) =>
        setSelectedFolders((old) => {
          const next = { ...old };
          if (next[folder.id]) delete next[folder.id];
          else next[folder.id] = folder;
          return next;
        }),
      [],
    ),
    openFolder = useCallback(
      (folder: Folder) => {
        const request = ++navigationId.current;
        void loadPath(folder.id, false)
          .unwrap()
          .then((result) => {
            if (request !== navigationId.current) return;
            setPath(result.items);
            setSearch("");
            setCursor(undefined);
            setError(undefined);
          })
          .catch((e) => {
            if (request === navigationId.current) setError(e);
          });
      },
      [loadPath],
    ),
    showInfo = useCallback((file: MaterialFile) => setInformation(file), []),
    showPreview = useCallback((file: MaterialFile) => setPreview(file), []);
  const action = async (fn: () => Promise<unknown>, success: string) => {
    setError(undefined);
    try {
      await fn();
      setMessage(success);
      return true;
    } catch (e) {
      setError(e);
      return false;
    }
  };
  const chosen = Object.values(selected);
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          fullWidth
          label="Tìm tên thư mục hoặc file"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          variant={mode === "tree" ? "contained" : "outlined"}
          onClick={() => setMode("tree")}
        >
          Cây thư mục
        </Button>
        <Button
          variant={mode === "grid" ? "contained" : "outlined"}
          onClick={() => setMode("grid")}
        >
          Thư mục
        </Button>
      </Stack>
      <Breadcrumbs aria-label="Đường dẫn thư mục">
        <Button
          onClick={() => {
            navigationId.current++;
            setPath([]);
            setCursor(undefined);
            setSearch("");
          }}
        >
          Kho chung
        </Button>
        {path.map((f, i) => (
          <Button
            key={f.id}
            onClick={() => {
              navigationId.current++;
              setPath((p) => p.slice(0, i + 1));
              setCursor(undefined);
              setSearch("");
            }}
          >
            {f.name}
          </Button>
        ))}
      </Breadcrumbs>
      <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap" }}>
        <Button
          disabled={!path.length}
          onClick={() => {
            navigationId.current++;
            setPath((p) => p.slice(0, -1));
            setCursor(undefined);
            setSearch("");
          }}
        >
          ← Quay lại
        </Button>
        <TextField
          select
          label="Phạm vi"
          value={scope}
          onChange={(e) => {
            setScope(e.target.value as typeof scope);
            setCursor(undefined);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="current">Thư mục hiện tại</MenuItem>
          <MenuItem value="all">Toàn kho</MenuItem>
        </TextField>
        <TextField
          select
          label="Loại file"
          value={type}
          sx={{ minWidth: 130 }}
          onChange={(e) => {
            setType(e.target.value);
            setCursor(undefined);
          }}
        >
          {[
            ["", "Tất cả"],
            ["pdf", "PDF"],
            ["image", "Ảnh"],
            ["audio", "Audio"],
            ["video", "Video"],
            ["other", "Khác"],
          ].map(([v, l]) => (
            <MenuItem key={v} value={v}>
              {l}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Sắp xếp"
          value={sort}
          sx={{ minWidth: 140 }}
          onChange={(e) => {
            setSort(e.target.value);
            setCursor(undefined);
          }}
        >
          {[
            ["name", "Tên ↑"],
            ["name-desc", "Tên ↓"],
            ["newest", "Mới nhất"],
            ["size", "Dung lượng"],
          ].map(([v, l]) => (
            <MenuItem key={v} value={v}>
              {l}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Paper sx={{ p: 2, bgcolor: "action.selected" }}>
        <Stack
          direction="row"
          useFlexGap
          spacing={1}
          sx={{ flexWrap: "wrap", alignItems: "center" }}
        >
          <Typography sx={{ fontWeight: 600 }}>
            {chosen.length} file đã chọn
            {Object.keys(selectedFolders).length
              ? ` · ${Object.keys(selectedFolders).length} thư mục`
              : ""}
          </Typography>
          <Button
            disabled={!chosen.length || downloadState.isFetching}
            onClick={() =>
              void action(async () => {
                for (const f of chosen) {
                  const access = await download(
                    { id: f.id, purpose: "download" },
                    false,
                  ).unwrap();
                  const link = document.createElement("a");
                  link.href = access.url;
                  link.download = f.displayName;
                  link.target = "_blank";
                  link.rel = "noopener noreferrer";
                  link.click();
                }
              }, "Đã mở lượt tải; trình duyệt có thể yêu cầu cho phép tải nhiều file.")
            }
          >
            Tải các file đã chọn
          </Button>
          <Button
            disabled={!chosen.length && !Object.keys(selectedFolders).length}
            onClick={() => {
              setSelected({});
              setSelectedFolders({});
            }}
          >
            Bỏ chọn tất cả
          </Button>
          {!picker && manager && (
            <Button
              disabled={!chosen.length || moveState.isLoading}
              onClick={() => {
                if (
                  window.confirm(
                    `Di chuyển ${chosen.length} file vào ${path.at(-1)?.name ?? "Kho chung"}?`,
                  )
                )
                  void action(
                    () =>
                      move({
                        ids: chosen.map((f) => f.id),
                        folderId,
                        versions: Object.fromEntries(
                          chosen.map((f) => [f.id, f.version]),
                        ),
                      }).unwrap(),
                    "Đã di chuyển; liên kết bài đăng được giữ nguyên.",
                  ).then((ok) => {
                    if (ok) setSelected({});
                  });
              }}
            >
              Di chuyển vào thư mục hiện tại
            </Button>
          )}
        </Stack>
      </Paper>
      <Feedback error={error} />
      {message && (
        <Alert severity="success" onClose={() => setMessage("")}>
          {message}
        </Alert>
      )}
      <Feedback
        loading={
          folders.isLoading ||
          files.isLoading ||
          (files.isFetching && !files.currentData)
        }
        error={folders.error || files.error}
        retry={() => {
          void folders.refetch();
          void files.refetch();
        }}
      />
      <Paper sx={{ p: { xs: 1.5, md: 2 }, minHeight: 240 }}>
        {mode === "tree" && !debounced && !type && scope === "current" ? (
          <TreeBranch
            key={folderId ?? "root"}
            folderId={folderId}
            depth={0}
            selected={selected}
            selectedFolders={selectedFolders}
            toggleFolder={toggleFolder}
            picker={picker}
            toggle={toggle}
            preview={showPreview}
            info={showInfo}
            openFolder={openFolder}
            workspace={workspace.selected ?? "teacher"}
            sort={sort}
          />
        ) : (
          <Box
            sx={{
              display: mode === "tree" ? "flex" : "grid",
              flexDirection: "column",
              gridTemplateColumns: {
                xs: "repeat(2,minmax(0,1fr))",
                sm: "repeat(3,minmax(0,1fr))",
                lg: "repeat(5,minmax(0,1fr))",
              },
              gap: 1.5,
            }}
          >
            {folders.currentData?.items.map((f) => (
              <Paper
                key={f.id}
                sx={{
                  border: 2,
                  borderColor: selectedFolders[f.id]
                    ? "primary.main"
                    : "divider",
                  bgcolor: selectedFolders[f.id]
                    ? "action.selected"
                    : "background.paper",
                  p: 1.5,
                  minWidth: 0,
                }}
              >
                {!picker && (
                  <Checkbox
                    checked={!!selectedFolders[f.id]}
                    slotProps={{
                      input: { "aria-label": `Chọn thư mục ${f.name}` },
                    }}
                    onChange={() =>
                      setSelectedFolders((old) => {
                        const next = { ...old };
                        if (next[f.id]) delete next[f.id];
                        else next[f.id] = f;
                        return next;
                      })
                    }
                  />
                )}
                {manager && !picker && (
                  <Stack direction="row">
                    <Button
                      aria-label={`Sửa thư mục ${f.name}`}
                      onClick={() => {
                        setFolderEdit(f);
                        setFolderName(f.name);
                        setKind(f.kind);
                      }}
                    >
                      Sửa
                    </Button>
                    <Button
                      aria-label={`Ngừng thư mục ${f.name}`}
                      onClick={() => {
                        const note = window.prompt(
                          "Lý do ngừng thư mục (phải rỗng):",
                        );
                        if (note?.trim())
                          void action(
                            () =>
                              removeFolder({
                                id: f.id,
                                version: f.version,
                                reason: note,
                              }).unwrap(),
                            "Đã ngừng thư mục.",
                          );
                      }}
                    >
                      Ngừng
                    </Button>
                  </Stack>
                )}
                <Button
                  onClick={() => openFolder(f)}
                  sx={{
                    display: "flex",
                    width: "100%",
                    flexDirection: "column",
                    gap: 2,
                    minHeight: 160,
                    textTransform: "none",
                  }}
                >
                  <FolderIcon
                    aria-hidden
                    sx={{ fontSize: 84, color: "primary.main" }}
                  />
                  <Tooltip title={f.name}>
                    <Typography
                      sx={{
                        ...{ overflowWrap: "anywhere", color: "text.primary" },
                        fontWeight: 600,
                      }}
                    >
                      {f.name}
                    </Typography>
                  </Tooltip>
                </Button>
              </Paper>
            ))}
            {files.currentData?.items.map((f) => (
              <FileTile
                key={f.id}
                file={f}
                selected={!!selected[f.id]}
                toggle={toggle}
                preview={showPreview}
                info={showInfo}
                tree={mode === "tree"}
              />
            ))}
          </Box>
        )}
        {!folders.isFetching &&
          !files.isFetching &&
          !folders.currentData?.items.length &&
          !files.currentData?.items.length && (
            <Feedback empty="Chưa có thư mục hoặc tài liệu phù hợp." />
          )}
      </Paper>
      <Stack direction="row">
        {cursor && (
          <Button onClick={() => setCursor(undefined)}>Trang đầu</Button>
        )}
        {files.currentData?.nextCursor && (
          <Button
            onClick={() =>
              setCursor(files.currentData?.nextCursor ?? undefined)
            }
          >
            Trang file tiếp theo
          </Button>
        )}
      </Stack>
      <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap" }}>
        {manager && !picker && (
          <Button
            onClick={() => {
              setFolderEdit(null);
              setFolderName("");
              setKind("CUSTOM");
            }}
          >
            + Tạo thư mục
          </Button>
        )}
        {!picker && (
          <Button variant="contained" onClick={() => setUpload(true)}>
            Upload vào kho
          </Button>
        )}
      </Stack>
      {!!chosen.length && (
        <Paper sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 600 }}>
            Lựa chọn được giữ khi chuyển thư mục
          </Typography>
          <Stack
            direction="row"
            useFlexGap
            spacing={1}
            sx={{ ...{ mt: 1 }, flexWrap: "wrap" }}
          >
            {chosen.map((f) => (
              <Chip
                key={f.id}
                label={f.displayName}
                onDelete={() => toggle(f)}
                sx={{ maxWidth: "100%" }}
              />
            ))}
          </Stack>
        </Paper>
      )}
      {picker && (
        <Button
          variant="contained"
          disabled={!chosen.length}
          onClick={() => onAdd?.(chosen)}
        >
          Thêm {chosen.length} file vào bài
        </Button>
      )}
      {preview && (
        <MaterialViewer file={preview} close={() => setPreview(null)} />
      )}{" "}
      {information && (
        <Dialog open onClose={() => setInformation(null)} fullWidth>
          <DialogTitle>{information.displayName}</DialogTitle>
          <DialogContent>
            <Typography>Tác giả: {information.authorName}</Typography>
            <Typography>
              {bytes(information.sizeBytes)} · {information.mimeType}
            </Typography>
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Button
                onClick={() => {
                  setPreview(information);
                  setInformation(null);
                }}
              >
                Xem / tải xuống
              </Button>
              <Button
                onClick={() => {
                  showInfo(information);
                  setInformation(null);
                  setRename(information);
                  setNewName(information.displayName);
                }}
                disabled={!manager && information.uploadedBy !== staffId}
              >
                Đổi tên
              </Button>
              <Button
                disabled={!manager && information.uploadedBy !== staffId}
                onClick={() => {
                  setRequestFile(information);
                  setInformation(null);
                  setReason("");
                }}
              >
                Yêu cầu xóa
              </Button>
              {manager && (
                <Button
                  onClick={() => {
                    setRename(null);
                    setNewName("");
                    setInformation(null);
                    setPreview(null);
                    setRequestFile(null);
                    setFolderEdit(undefined);
                    setMetadata(information);
                  }}
                >
                  Metadata / nhật ký
                </Button>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInformation(null)}>Đóng</Button>
          </DialogActions>
        </Dialog>
      )}
      {upload && (
        <UploadDialog folderId={folderId} close={() => setUpload(false)} />
      )}
      <Dialog
        open={folderEdit !== undefined}
        onClose={() => setFolderEdit(undefined)}
        fullWidth
      >
        <DialogTitle>{folderEdit ? "Sửa thư mục" : "Tạo thư mục"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Tên thư mục"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <TextField
              select
              label="Loại"
              value={kind}
              onChange={(e) => setKind(e.target.value as Folder["kind"])}
            >
              <MenuItem value="PROGRAM">Chương trình</MenuItem>
              <MenuItem value="LEVEL">Level</MenuItem>
              <MenuItem value="CUSTOM">Thư mục tùy chỉnh</MenuItem>
            </TextField>
            <Feedback error={error} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFolderEdit(undefined)}>Hủy</Button>
          <Button
            disabled={!folderName.trim() || folderState.isLoading}
            onClick={() =>
              void action(
                () =>
                  saveFolder({
                    id: folderEdit?.id,
                    name: folderName,
                    parentId: folderEdit?.parentId ?? folderId,
                    kind,
                    version: folderEdit?.version ?? 1,
                  }).unwrap(),
                "Đã lưu thư mục.",
              ).then((ok) => {
                if (ok) setFolderEdit(undefined);
              })
            }
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!rename} onClose={() => setRename(null)} fullWidth>
        <DialogTitle>Đổi tên file</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Tên hiển thị"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mt: 1 }}
          />
          <Feedback error={error} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRename(null)}>Hủy</Button>
          <Button
            disabled={!newName.trim() || renameState.isLoading}
            onClick={() => {
              if (rename)
                void action(
                  () =>
                    renameFile({
                      id: rename.id,
                      displayName: newName,
                      version: rename.version,
                    }).unwrap(),
                  "Đã đổi tên.",
                ).then((ok) => {
                  if (ok) setRename(null);
                });
            }}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!requestFile}
        onClose={() => setRequestFile(null)}
        fullWidth
      >
        <DialogTitle>Yêu cầu manager duyệt xóa</DialogTitle>
        <DialogContent>
          <Typography>
            File và lịch sử được giữ. Manager sẽ kiểm tra các bài đăng đang sử
            dụng trước khi duyệt.
          </Typography>
          <TextField
            fullWidth
            multiline
            label="Lý do"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ mt: 2 }}
          />
          <Feedback error={error} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestFile(null)}>Hủy</Button>
          <Button
            disabled={!reason.trim() || deleteState.isLoading}
            onClick={() => {
              if (requestFile)
                void action(
                  () =>
                    requestDelete({
                      id: requestFile.id,
                      version: requestFile.version,
                      reason,
                    }).unwrap(),
                  "Đã gửi yêu cầu.",
                ).then((ok) => {
                  if (ok) setRequestFile(null);
                });
            }}
          >
            Gửi yêu cầu
          </Button>
        </DialogActions>
      </Dialog>
      {metadata && (
        <FileInformation
          file={metadata}
          close={() => setMetadata(null)}
          manager={manager}
        />
      )}
    </Stack>
  );
}
