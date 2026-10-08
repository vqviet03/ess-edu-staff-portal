"use client";
import { useEffect, useRef, useState } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Feedback } from "@/shared/ui";
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist";
GlobalWorkerOptions.workerSrc = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/pdf/pdf.worker.min.mjs`;
function PdfPage({
  pdf,
  page,
  zoom,
}: {
  pdf: PDFDocumentProxy;
  page: number;
  zoom: number;
}) {
  const holder = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    [visible, setVisible] = useState(false),
    [width, setWidth] = useState(600),
    [error, setError] = useState<unknown>();
  useEffect(() => {
    const node = holder.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries[0].isIntersecting),
      { rootMargin: "200px" },
    );
    observer.observe(node);
    const size = new ResizeObserver((entries) =>
      setWidth(entries[0].contentRect.width),
    );
    size.observe(node);
    return () => {
      observer.disconnect();
      size.disconnect();
    };
  }, []);
  useEffect(() => {
    if (!visible) return;
    let active = true,
      task:
        | ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>
        | undefined;
    void pdf
      .getPage(page)
      .then((p) => {
        if (!active || !canvas.current) return;
        const original = p.getViewport({ scale: 1 }),
          view = p.getViewport({
            scale:
              Math.min(
                width / original.width,
                (window.innerHeight * 0.68) / original.height,
              ) * zoom,
          });
        canvas.current.width = view.width;
        canvas.current.height = view.height;
        task = p.render({ canvas: canvas.current, viewport: view });
        return task.promise;
      })
      .catch((e) => {
        if (active && e?.name !== "RenderingCancelledException") setError(e);
      });
    return () => {
      active = false;
      task?.cancel();
    };
  }, [pdf, page, zoom, visible, width]);
  return (
    <div
      ref={holder}
      style={{
        minHeight: visible ? 100 : 600,
        width: "100%",
        marginBottom: 16,
      }}
    >
      <Feedback error={error} />
      <canvas
        ref={canvas}
        aria-label={`Trang ${page}`}
        style={{ display: "block", margin: "auto" }}
      />
    </div>
  );
}
export default function PdfViewer({
  url,
  retry,
}: {
  url: string;
  retry: () => void;
}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null),
    [page, setPage] = useState(1),
    [zoom, setZoom] = useState(1),
    [mode, setMode] = useState<"pages" | "scroll">("pages"),
    [error, setError] = useState<unknown>();
  useEffect(() => {
    let active = true;
    const task = getDocument({ url, isEvalSupported: false });
    task.promise
      .then((p) => {
        if (active) {
          setPdf(p);
          setPage(1);
        }
      })
      .catch((e) => {
        if (active) setError(e);
      });
    return () => {
      active = false;
      void task.destroy();
    };
  }, [url]);
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        <Button onClick={() => setMode(mode === "pages" ? "scroll" : "pages")}>
          {mode === "pages" ? "Cuộn dọc" : "Lật trang"}
        </Button>
        {mode === "pages" && (
          <>
            <Button disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>
              ←
            </Button>
            <Typography sx={{ alignSelf: "center" }}>
              {page}/{pdf?.numPages ?? "…"}
            </Typography>
            <Button
              disabled={!pdf || page >= pdf.numPages}
              onClick={() => setPage((v) => v + 1)}
            >
              →
            </Button>
          </>
        )}
        <Button
          disabled={zoom <= 0.25}
          onClick={() => setZoom((v) => v - 0.25)}
        >
          −
        </Button>
        <Button onClick={() => setZoom(1)}>Vừa khung</Button>
        <Typography sx={{ alignSelf: "center" }}>
          {Math.round(zoom * 100)}%
        </Typography>
        <Button disabled={zoom >= 3} onClick={() => setZoom((v) => v + 0.25)}>
          +
        </Button>
      </Stack>
      <Feedback loading={!pdf && !error} error={error} retry={retry} />
      <div style={{ overflow: "auto", maxHeight: "75vh" }}>
        {pdf &&
          (mode === "pages" ? (
            <PdfPage key={page} pdf={pdf} page={page} zoom={zoom} />
          ) : (
            Array.from({ length: pdf.numPages }, (_, i) => (
              <PdfPage key={i} pdf={pdf} page={i + 1} zoom={zoom} />
            ))
          ))}
      </div>
    </Stack>
  );
}
export async function pdfThumbnail(file: File): Promise<Blob | null> {
  const task = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    isEvalSupported: false,
  });
  try {
    const pdf = await task.promise,
      page = await pdf.getPage(1),
      initial = page.getViewport({ scale: 1 }),
      view = page.getViewport({ scale: Math.min(1, 256 / initial.width) }),
      canvas = document.createElement("canvas");
    canvas.width = view.width;
    canvas.height = view.height;
    await page.render({ canvas, viewport: view }).promise;
    return await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.75),
    );
  } finally {
    await task.destroy();
  }
}
