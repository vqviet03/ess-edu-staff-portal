"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Alert from "@mui/material/Alert";
import AttachFile from "@mui/icons-material/AttachFile";
import Close from "@mui/icons-material/Close";
import { useAssignmentUploadMutation } from "@/api/assignment-api";
import { uploadBuffers } from "@/features/materials/upload-transport";
import { compressImage } from "@/features/materials/image-compression";
import { errorMessage } from "@/api/base-query";
import type { MaterialFile } from "@/features/materials/models";
export async function imageThumb(file: File): Promise<Blob | null> {
  if (!file.type.startsWith("image/")) return null;
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas"),
      ratio = Math.min(1, 320 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    canvas
      .getContext("2d")!
      .drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.75),
    );
  } finally {
    image.close();
  }
}
export function AssignmentUpload({
  assignmentId,
  questionId,
  accept,
  onFile,
  onBusy,
  recordingSessionId,
  fileToUpload,
}: {
  assignmentId: string;
  questionId: string;
  accept?: string;
  recordingSessionId?: string;
  fileToUpload?: File;
  onFile: (file: MaterialFile) => void;
  onBusy?: (busy: boolean) => void;
}) {
  const [upload, state] = useAssignmentUploadMutation(),
    [progress, setProgress] = useState(0),
    [error, setError] = useState<unknown>(),
    pending = useRef<ReturnType<typeof upload> | null>(null),
    input = useRef<HTMLInputElement>(null),
    live = useRef(true),
    [retry, setRetry] = useState<File>();
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      pending.current?.abort();
    };
  }, []);
  const send = useCallback(
    async (original: File) => {
      if (pending.current) return;
      setError(undefined);
      onBusy?.(true);
      setProgress(0);
      try {
        const file = await compressImage(original);
        if (file.size > 100 * 1024 * 1024)
          throw new Error("File tối đa 100 MB.");
        const thumbnail = await imageThumb(file);
        if (!live.current) return;
        const bufferId = crypto.randomUUID();
        uploadBuffers.set(bufferId, {
          file,
          thumbnail,
          progress: (v) => {
            if (live.current) setProgress(v);
          },
        });
        const task = upload({
          assignmentId,
          questionId,
          recordingSessionId,
          bufferId,
          originalName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          thumbnailMime: thumbnail?.type,
          thumbnailBytes: thumbnail?.size ?? 0,
        });
        pending.current = task;
        const result = await task.unwrap();
        if (live.current) {
          setRetry(undefined);
          onFile(result);
        }
      } catch (e) {
        if (live.current) {
          setError(e);
          setRetry(original);
        }
      } finally {
        pending.current = null;
        onBusy?.(false);
      }
    },
    [assignmentId, questionId, recordingSessionId, onBusy, onFile, upload],
  );
  const supplied = useRef<File | undefined>(undefined);
  useEffect(() => {
    if (fileToUpload && supplied.current !== fileToUpload) {
      supplied.current = fileToUpload;
      void send(fileToUpload);
    }
  }, [fileToUpload, send]); // a user-confirmed recording triggers exactly one upload
  return (
    <Stack spacing={1}>
      {!fileToUpload && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<AttachFile />}
          disabled={state.isLoading}
          onClick={() => input.current?.click()}
        >
          Thêm tệp
          <input
            ref={input}
            hidden
            type="file"
            accept={accept}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void send(f);
            }}
          />
        </Button>
      )}
      {state.isLoading && (
        <>
          <LinearProgress variant="determinate" value={progress} />
          <Button
            size="small"
            startIcon={<Close />}
            onClick={() => pending.current?.abort()}
          >
            Hủy tải
          </Button>
        </>
      )}
      {error != null && (
        <Alert
          severity="error"
          action={
            retry && <Button onClick={() => void send(retry)}>Thử lại</Button>
          }
        >
          {errorMessage(error)}
        </Alert>
      )}
    </Stack>
  );
}
