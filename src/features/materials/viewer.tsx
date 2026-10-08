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
import { useContentQuery, useLazyContentQuery } from "@/api/library-api";
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
  const access = useContentQuery({ id: file.id, purpose: "preview" }),
    [download, state] = useLazyContentQuery(),
    [zoom, setZoom] = useState(100),
    [fullScreen, setFullScreen] = useState(false),
    [error, setError] = useState<unknown>(),
    audio = useRef<HTMLAudioElement>(null),
    [speed, setSpeed] = useState(1);
  return (
    <Dialog
      open
      onClose={close}
      fullWidth
      maxWidth="lg"
      fullScreen={fullScreen}
    >
      <DialogTitle>
        <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1 }}>
          <Typography component="span">{file.displayName}</Typography>
          <Button onClick={() => setFullScreen((v) => !v)}>
            {fullScreen ? "Thu về cửa sổ" : "Toàn màn hình"}
          </Button>
        </Stack>
      </DialogTitle>
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
              url={access.currentData}
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
              <Box sx={{ overflow: "auto", maxHeight: "75vh" }}>
                <Box
                  component="img"
                  src={access.currentData}
                  alt={file.displayName}
                  onError={() => setError(new Error("Không tải được ảnh."))}
                  sx={{
                    width: zoom === 100 ? "auto" : `${zoom}%`,
                    maxWidth: zoom === 100 ? "100%" : "none",
                    maxHeight: zoom === 100 ? "70vh" : "none",
                    objectFit: "contain",
                    display: "block",
                    mx: "auto",
                  }}
                />
              </Box>
            </>
          ) : file.mimeType.startsWith("audio/") ? (
            <Stack spacing={2}>
              <audio
                ref={audio}
                controls
                src={access.currentData}
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
              src={access.currentData}
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                display: "block",
                margin: "0 auto",
                objectFit: "contain",
              }}
              onError={() =>
                setError(
                  new Error(
                    "Không phát được video. Có thể tải file để xem bằng ứng dụng phù hợp.",
                  ),
                )
              }
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
              a.href = r;
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
