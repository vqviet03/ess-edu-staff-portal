"use client";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Feedback } from "@/shared/ui";
import { useAccessQuery, useLazyAccessQuery } from "@/api/library-api";
import type { MaterialFile } from "./models";
const PdfViewer = dynamic(() => import("./pdf-viewer"), {
  ssr: false,
  loading: () => <Feedback loading />,
});
export function MaterialViewer({
  file,
  close,
}: {
  file: MaterialFile;
  close: () => void;
}) {
  const access = useAccessQuery({ id: file.id, purpose: "preview" }),
    [download, state] = useLazyAccessQuery(),
    [zoom, setZoom] = useState(100),
    [error, setError] = useState<unknown>(),
    audio = useRef<HTMLAudioElement>(null),
    [speed, setSpeed] = useState(1);
  return (
    <Dialog open onClose={close} fullWidth maxWidth="lg">
      <DialogTitle>{file.displayName}</DialogTitle>
      <DialogContent>
        <Feedback
          loading={access.isLoading}
          error={access.error || error}
          retry={() => {
            setError(undefined);
            void access.refetch();
          }}
        />
        {access.currentData &&
          (file.mimeType === "application/pdf" ? (
            <PdfViewer
              url={access.currentData.url}
              retry={() => void access.refetch()}
            />
          ) : file.mimeType.startsWith("image/") ? (
            <>
              <Stack direction="row">
                <Button
                  disabled={zoom <= 25}
                  onClick={() => setZoom((z) => z - 25)}
                >
                  − Thu nhỏ
                </Button>
                <Typography sx={{ alignSelf: "center" }}>{zoom}%</Typography>
                <Button
                  disabled={zoom >= 300}
                  onClick={() => setZoom((z) => z + 25)}
                >
                  + Phóng to
                </Button>
              </Stack>
              <Box sx={{ overflow: "auto", maxHeight: "65vh" }}>
                <Box
                  component="img"
                  src={access.currentData.url}
                  alt={file.displayName}
                  onError={() => setError(new Error("Không tải được ảnh."))}
                  sx={{ width: `${zoom}%`, maxWidth: "none", display: "block" }}
                />
              </Box>
            </>
          ) : file.mimeType.startsWith("audio/") ? (
            <Stack spacing={2}>
              <audio
                ref={audio}
                controls
                src={access.currentData.url}
                style={{ width: "100%" }}
                onLoadedMetadata={() => {
                  if (audio.current) audio.current.playbackRate = speed;
                }}
                onError={() => setError(new Error("Không phát được audio."))}
              />
              <TextField
                select
                label="Tốc độ phát"
                value={speed}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setSpeed(n);
                  if (audio.current) audio.current.playbackRate = n;
                }}
              >
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}x
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          ) : file.mimeType.startsWith("video/") ? (
            <video
              controls
              src={access.currentData.url}
              style={{ maxWidth: "100%" }}
            />
          ) : (
            <Feedback empty="Định dạng chưa hỗ trợ xem trực tiếp. Anh/chị có thể tải xuống." />
          ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Đóng</Button>
        <Button
          disabled={state.isFetching}
          onClick={async () => {
            try {
              const r = await download(
                { id: file.id, purpose: "download" },
                false,
              ).unwrap();
              const a = document.createElement("a");
              a.href = r.url;
              a.download = file.displayName;
              a.target = "_blank";
              a.rel = "noopener noreferrer";
              a.click();
            } catch (e) {
              setError(e);
            }
          }}
        >
          Tải xuống
        </Button>
      </DialogActions>
    </Dialog>
  );
}
