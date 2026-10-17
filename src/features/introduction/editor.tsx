"use client";
import { memo, useCallback, useEffect, useState } from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import Edit from "@mui/icons-material/Edit";
import Save from "@mui/icons-material/Save";
import Publish from "@mui/icons-material/Publish";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Settings from "@mui/icons-material/Settings";
import People from "@mui/icons-material/People";
import Close from "@mui/icons-material/Close";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import { ManagerOnly } from "@/features/management/shared";
import { MaterialBrowser } from "@/features/materials/browser";
import { UploadDialog } from "@/features/materials/upload";
import { useLazyContentQuery } from "@/api/library-api";
import {
  useIntroductionDraftQuery,
  useSaveIntroductionMutation,
  usePublishIntroductionMutation,
  useIntroductionInquiriesQuery,
} from "@/api/introduction-api";
import { Feedback } from "@/shared/ui";
import { useUnsaved } from "@/shared/unsaved";
import { errorMessage } from "@/api/base-query";
import { IntroductionView } from "./view";
import { defaultTexts, resolveContent, type IntroductionPage } from "./models";
import type { MaterialFile } from "@/features/materials/models";
// The large preview stays unchanged while typing in the text-edit dialog.
const IntroductionPreview = memo(IntroductionView);
function Inquiries() {
  const [cursor, setCursor] = useState<string>(),
    q = useIntroductionInquiriesQuery({ cursor });
  return (
    <Stack spacing={2}>
      <Feedback loading={q.isLoading} error={q.error} />
      {q.data?.items.length === 0 && (
        <Alert severity="info">Chưa có đăng ký tư vấn.</Alert>
      )}
      {q.data?.items.map((i) => (
        <Box
          key={i.id}
          sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 2 }}
        >
          <Typography sx={{ fontWeight: 700 }}>
            {i.studentName} · {i.grade}
          </Typography>
          <Typography>
            Phụ huynh: {i.parentName} · <a href={`tel:${i.phone}`}>{i.phone}</a>
          </Typography>
          <Typography variant="caption">
            {new Date(i.createdAt).toLocaleString("vi-VN")}
          </Typography>
        </Box>
      ))}
      <Stack direction="row" spacing={1}>
        {cursor && <Button onClick={() => setCursor(undefined)}>Về đầu</Button>}
        {q.data?.nextCursor && (
          <Button onClick={() => setCursor(q.data!.nextCursor!)}>Tiếp</Button>
        )}
      </Stack>
    </Stack>
  );
}
function Editor({ initial }: { initial: IntroductionPage }) {
  const [content, setContent] = useState(() => resolveContent(initial.content)),
    [saved, setSaved] = useState(() =>
      JSON.stringify(resolveContent(initial.content)),
    ),
    [version, setVersion] = useState(initial.version),
    [published, setPublished] = useState(
      initial.published ?? !!initial.publishedAt,
    ),
    [editing, setEditing] = useState(false),
    [textKey, setTextKey] = useState(""),
    [value, setValue] = useState(""),
    [mediaSlot, setMediaSlot] = useState(""),
    [upload, setUpload] = useState(false),
    [settings, setSettings] = useState(false),
    [inquiries, setInquiries] = useState(false),
    [confirm, setConfirm] = useState<"publish" | "withdraw" | null>(null),
    [error, setError] = useState<unknown>(),
    [message, setMessage] = useState(""),
    [previews, setPreviews] = useState<Record<string, string>>({});
  const [save, saving] = useSaveIntroductionMutation(),
    [publish, publishing] = usePublishIntroductionMutation(),
    [loadMedia] = useLazyContentQuery(),
    theme = useTheme();
  const dirty = JSON.stringify(content) !== saved,
    busy = saving.isLoading || publishing.isLoading;
  useUnsaved(dirty);
  const mediaIds = JSON.stringify(
    Object.entries(content.media).map(([slot, m]) => [slot, m.materialId]),
  );
  useEffect(() => {
    let live = true;
    const rows = JSON.parse(mediaIds) as [string, string][];
    setPreviews({});
    for (const [slot, id] of rows)
      void loadMedia({ id, purpose: "preview" }, true)
        .unwrap()
        .then((url) => {
          if (live) setPreviews((old) => ({ ...old, [slot]: url }));
        })
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [mediaIds, loadMedia]);
  async function persist() {
    const result = await save({ version, content }).unwrap();
    setVersion(result.version);
    setSaved(JSON.stringify(content));
    return result.version;
  }
  const editText = useCallback(
    (key: string) => {
      setTextKey(key);
      setValue(content.texts[key] ?? "");
    },
    [content.texts],
  );
  const editMedia = useCallback((slot: string) => {
    setError(undefined);
    setMediaSlot(slot);
  }, []);
  function add(files: MaterialFile[]) {
    if (files.length !== 1) {
      setError(new Error("Chỉ chọn một file cho mỗi vị trí."));
      return;
    }
    const f = files[0];
    if (!f) return;
    if (
      mediaSlot === "brochure"
        ? f.mimeType !== "application/pdf"
        : !["image/png", "image/jpeg", "image/webp", "image/avif"].includes(
            f.mimeType,
          )
    ) {
      setError(new Error("Chọn đúng ảnh hoặc PDF cho vị trí này."));
      return;
    }
    setContent((c) => ({
      ...c,
      media: {
        ...c.media,
        [mediaSlot]: {
          materialId: f.id,
          name: f.displayName,
          mimeType: f.mimeType,
        },
      },
    }));
    setMediaSlot("");
    setUpload(false);
  }
  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 8,
          bgcolor: "background.paper",
          p: 1,
          borderRadius: 2,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Typography sx={{ mr: "auto", fontWeight: 700 }}>
          Trang giới thiệu · {published ? "Đã công bố" : "Chưa công bố"}
          {dirty ? " · Chưa lưu" : ""}
        </Typography>
        {[
          [
            "Chỉnh sửa nội dung",
            <Edit key="edit" />,
            () => setEditing(!editing),
            false,
          ],
          [
            "Nội dung & cấu hình",
            <Settings key="settings" />,
            () => setSettings(true),
            false,
          ],
          [
            "Đăng ký tư vấn",
            <People key="people" />,
            () => setInquiries(true),
            false,
          ],
          [
            "Lưu nháp",
            <Save key="save" />,
            () =>
              void persist()
                .then(() => setMessage("Đã lưu bản nháp."))
                .catch(setError),
            busy || !dirty,
          ],
          [
            "Công bố",
            <Publish key="publish" />,
            () => setConfirm("publish"),
            busy,
          ],
          [
            "Gỡ công bố",
            <VisibilityOff key="withdraw" />,
            () => setConfirm("withdraw"),
            busy || !published,
          ],
        ].map(([label, icon, action, disabled]) => (
          <Tooltip key={String(label)} title={String(label)}>
            <span>
              <IconButton
                aria-label={String(label)}
                onClick={action as () => void}
                disabled={Boolean(disabled)}
                color={
                  label === "Chỉnh sửa nội dung" && editing
                    ? "primary"
                    : "default"
                }
              >
                {icon as React.ReactNode}
              </IconButton>
            </span>
          </Tooltip>
        ))}
      </Stack>
      {error != null && (
        <Alert severity="error" onClose={() => setError(undefined)}>
          {errorMessage(error)}
        </Alert>
      )}
      {message && (
        <Alert severity="success" onClose={() => setMessage("")}>
          {message}
        </Alert>
      )}
      <Box
        sx={{ "& .ees-introduction": { width: "100%" } }}
        className={`intro-editor-${theme.palette.mode}`}
      >
        <IntroductionPreview
          content={content}
          assetsBase={process.env.NEXT_PUBLIC_BASE_PATH ?? ""}
          previewMedia={previews}
          privatePreview
          onEditText={editing ? editText : undefined}
          onEditMedia={editing ? editMedia : undefined}
        />
      </Box>
      <Dialog
        open={!!textKey}
        onClose={() => setTextKey("")}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Sửa nội dung</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={2}
            maxRows={10}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 4000 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTextKey("")}>Hủy</Button>
          <Button
            onClick={() => {
              setContent((c) => ({
                ...c,
                texts: { ...c.texts, [textKey]: value },
              }));
              setTextKey("");
            }}
          >
            Áp dụng
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!mediaSlot && !upload}
        onClose={() => setMediaSlot("")}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            Chọn ảnh / tài liệu
            <IconButton aria-label="Đóng" onClick={() => setMediaSlot("")}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            File được chọn sẽ công khai khi trang được công bố. Chỉ dùng file
            trong kho chung.
          </Alert>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button onClick={() => setUpload(true)}>Tải vào kho</Button>
            {content.media[mediaSlot] && (
              <Tooltip title="Gỡ file khỏi trang">
                <IconButton
                  aria-label="Gỡ file khỏi trang"
                  color="error"
                  onClick={() => {
                    setContent((c) => {
                      const media = { ...c.media };
                      delete media[mediaSlot];
                      return { ...c, media };
                    });
                    setMediaSlot("");
                  }}
                >
                  <DeleteOutlined />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          {error != null && (
            <Alert severity="error">{errorMessage(error)}</Alert>
          )}
          <MaterialBrowser picker onAdd={add} />
        </DialogContent>
      </Dialog>
      {upload && (
        <UploadDialog
          folderId={null}
          multiple={false}
          accept={
            mediaSlot === "brochure"
              ? "application/pdf"
              : "image/png,image/jpeg,image/webp,image/avif"
          }
          close={() => setUpload(false)}
          added={(f) => add([f])}
        />
      )}
      <Dialog
        open={settings}
        onClose={() => setSettings(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Nội dung & cấu hình</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label="Chọn nội dung cần sửa"
              value=""
              onChange={(e) => editText(e.target.value)}
            >
              {Object.keys(defaultTexts).map((k) => (
                <MenuItem key={k} value={k}>
                  {content.texts[k]?.slice(0, 80) || defaultTexts[k]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Lớp đang học (mỗi dòng một lớp)"
              multiline
              minRows={4}
              value={content.grades.join("\n")}
              onChange={(e) =>
                setContent((c) => ({
                  ...c,
                  grades: e.target.value.split("\n"),
                }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettings(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={inquiries}
        onClose={() => setInquiries(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Đăng ký tư vấn</DialogTitle>
        <DialogContent>{inquiries && <Inquiries />}</DialogContent>
        <DialogActions>
          <Button onClick={() => setInquiries(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!confirm}
        onClose={() => !busy && setConfirm(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {confirm === "publish"
            ? "Công bố trang giới thiệu?"
            : "Gỡ trang giới thiệu?"}
        </DialogTitle>
        <DialogContent>
          {confirm === "publish"
            ? "Nội dung, ảnh và tài liệu trên trang sẽ được công khai. Bản nháp sẽ được lưu trước khi công bố."
            : "Trang sẽ ngừng công khai. Nội dung nháp và đăng ký tư vấn được giữ nguyên."}
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setConfirm(null)}>
            Hủy
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              try {
                const v = dirty ? await persist() : version,
                  result = await publish({
                    version: v,
                    publish: confirm === "publish",
                  }).unwrap();
                setVersion(result.version);
                setPublished(result.published ?? !!result.publishedAt);
                setConfirm(null);
                setMessage("Đã cập nhật trạng thái công bố.");
              } catch (e) {
                setError(e);
                setConfirm(null);
              }
            }}
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
function LoadedEditor() {
  const q = useIntroductionDraftQuery();
  return (
    <>
      <Feedback
        loading={q.isLoading}
        error={q.error}
        retry={() => void q.refetch()}
      />
      {q.data && <Editor initial={q.data} />}
    </>
  );
}
export function IntroductionEditor() {
  return (
    <ManagerOnly>
      <LoadedEditor />
    </ManagerOnly>
  );
}
