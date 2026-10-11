"use client";
import { useEffect, useRef, useState } from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import Mic from "@mui/icons-material/Mic";
import Stop from "@mui/icons-material/Stop";
import Replay from "@mui/icons-material/Replay";
import {
  useStartAssignmentRecordingMutation,
  useFinishAssignmentRecordingMutation,
} from "@/api/assignment-api";
import { AssignmentUpload } from "./upload";
import type { MaterialFile } from "@/features/materials/models";
import type { Recording } from "./models";
import { errorMessage } from "@/api/base-query";
export function SpeakingRecorder({
  assignmentId,
  questionId,
  maxSeconds,
  onConfirmed,
  onBusy,
}: {
  assignmentId: string;
  questionId: string;
  maxSeconds: number;
  onConfirmed: (file: MaterialFile, recordingId: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [startSession] = useStartAssignmentRecordingMutation(),
    [finish, state] = useFinishAssignmentRecordingMutation(),
    [session, setSession] = useState<Recording>(),
    [phase, setPhase] = useState<
      "idle" | "recording" | "review" | "uploading" | "confirmed"
    >("idle"),
    [elapsed, setElapsed] = useState(0),
    [source, setSource] = useState(""),
    [audio, setAudio] = useState<File>(),
    [send, setSend] = useState<File>(),
    [uploaded,setUploaded]=useState<MaterialFile>(),
    [error, setError] = useState<unknown>();
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    tick = useRef<number | null>(null),
    objectUrl = useRef(""),
    mounted = useRef(true),
    starting = useRef(false);
  const release = () => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = null;
    if (tick.current) cancelAnimationFrame(tick.current);
    tick.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      release();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);
  async function begin() {
    if (starting.current || phase === "recording") return;
    starting.current = true;
    setError(undefined);
    onBusy(true);
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Trình duyệt chưa hỗ trợ ghi âm. Dùng Safari/Chrome mới và HTTPS.",
        );
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (!mounted.current) {
        release();
        return;
      }
      const ticket = await startSession({
        id: assignmentId,
        questionId,
      }).unwrap();
      if (!mounted.current) {
        release();
        return;
      }
      setSession(ticket);
      const mime = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      const mr = new MediaRecorder(
        stream.current,
        mime ? { mimeType: mime } : undefined,
      );
      recorder.current = mr;
      const chunks: BlobPart[] = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      mr.onstop = () => {
        release();
        onBusy(false);
        if (!mounted.current) return;
        const type = mr.mimeType.split(";")[0] || "audio/webm",
          blob = new Blob(chunks, { type });
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = URL.createObjectURL(blob);
        setSource(objectUrl.current);
        setAudio(
          new File(
            [blob],
            `bai-noi.${type === "audio/mp4" ? "m4a" : type === "audio/ogg" ? "ogg" : "webm"}`,
            { type },
          ),
        );
        setPhase("review");
      };
      mr.onerror = () => {
        if (mr.state === "recording") mr.stop();
        release();
        if (mounted.current)
          setError(new Error("Không ghi được audio. Hãy thử lại."));
      };
      mr.start();
      setElapsed(0);
      setPhase("recording");
      setSend(undefined);
      const t0 = performance.now();
      const update = () => {
        if (!mounted.current || mr.state !== "recording") return;
        setElapsed(
          Math.min(maxSeconds, Math.floor((performance.now() - t0) / 1000)),
        );
        tick.current = requestAnimationFrame(update);
      };
      tick.current = requestAnimationFrame(update);
      stopTimer.current = setTimeout(
        () => {
          if (mr.state === "recording") mr.stop();
        },
        Math.max(100, maxSeconds * 1000 - 200),
      );
    } catch (e) {
      release();
      onBusy(false);
      const error = e instanceof DOMException && e.name === "NotAllowedError" ? new Error("Chưa được cấp quyền micro. Cho phép micro trong cài đặt trình duyệt rồi thử lại.") : e instanceof DOMException && e.name === "NotFoundError" ? new Error("Không tìm thấy micro. Kết nối thiết bị rồi thử lại.") : e instanceof DOMException && e.name === "NotReadableError" ? new Error("Micro đang bị ứng dụng khác sử dụng hoặc không hoạt động.") : e;
      if (mounted.current) setError(error);
    } finally {
      starting.current = false;
    }
  }
  async function again() {
    if (session) {
      try {
        await finish({
          id: assignmentId,
          recordingId: session.id,
          version: session.version,
          cancel: true,
        }).unwrap();
      } catch (e) {
        setError(e);
        return;
      }
    }
    setPhase("idle");
    setSend(undefined);
    setUploaded(undefined);
    setAudio(undefined);
    setSession(undefined);
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = "";
    setSource("");
  }
  async function confirmFile(file:MaterialFile) {
    if(!session)return;
    setUploaded(file);setError(undefined);onBusy(true);
    try {
      await finish({id:assignmentId,recordingId:session.id,version:session.version}).unwrap();
      if(mounted.current){onConfirmed(file,session.id);setPhase("confirmed");}
    } catch(e){if(mounted.current)setError(e);}
    finally{onBusy(false);}
  }
  return (
    <Stack spacing={1.5}>
      <Alert severity="info">
        Bài nói tối đa {maxSeconds} giây. Dừng ghi âm không tự nộp bài.
      </Alert>
      <Typography role="timer" aria-live="off">
        {elapsed} / {maxSeconds} giây
      </Typography>
      {phase === "idle" && (
        <Button
          startIcon={<Mic />}
          variant="contained"
          onClick={() => void begin()}
        >
          Bắt đầu ghi âm
        </Button>
      )}
      {phase === "recording" && (
        <Button
          color="error"
          startIcon={<Stop />}
          onClick={() => {
            if (recorder.current?.state === "recording")
              recorder.current.stop();
          }}
        >
          Dừng ghi âm
        </Button>
      )}
      {source && (
        <audio
          src={source}
          controls
          preload="metadata"
          style={{ width: "100%" }}
        />
      )}
      {phase === "review" && (
        <Stack direction="row" spacing={1}>
          <Button startIcon={<Replay />} onClick={() => void again()}>
            Ghi lại
          </Button>
          <Button
            variant="contained"
            disabled={!audio}
            onClick={() => {
              setPhase("uploading");
              setSend(audio);
              onBusy(true);
            }}
          >
            Sử dụng bản ghi
          </Button>
        </Stack>
      )}
      {phase === "uploading" && send && session && !uploaded && (
        <AssignmentUpload
          assignmentId={assignmentId}
          questionId={questionId}
          recordingSessionId={session.id}
          fileToUpload={send}
          onBusy={onBusy}
          onFile={(file)=>void confirmFile(file)}
        />
      )}
      {phase === "uploading" && uploaded && error != null && (
        <Button disabled={state.isLoading} onClick={() => void confirmFile(uploaded)}>
          Thử lại xác nhận bản ghi
        </Button>
      )}
      {phase === "confirmed" && (
        <Alert severity="success">Bản ghi đã lưu và được xác nhận.</Alert>
      )}
      {state.isLoading && <Typography>Đang xác nhận bản ghi…</Typography>}
      {error != null && <Alert severity="error">{errorMessage(error)}</Alert>}
    </Stack>
  );
}
