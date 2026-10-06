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
export default function PdfViewer({
  url,
  retry,
}: {
  url: string;
  retry: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    [pdf, setPdf] = useState<PDFDocumentProxy | null>(null),
    [page, setPage] = useState(1),
    [scale, setScale] = useState(1),
    [error, setError] = useState<unknown>(),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    setPdf(null);
    const task = getDocument({ url, isEvalSupported: false });
    task.promise
      .then((p) => {
        if (active) {
          setPdf(p);
          setPage(1);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e);
          setLoading(false);
        }
      });
    return () => {
      active = false;
      void task.destroy();
    };
  }, [url]);
  useEffect(() => {
    if (!pdf) return;
    let active = true;
    let render:
      | ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>
      | undefined;
    setLoading(true);
    setError(undefined);
    pdf
      .getPage(page)
      .then((p) => {
        if (!active || !canvas.current) return;
        const view = p.getViewport({ scale }),
          node = canvas.current;
        node.width = view.width;
        node.height = view.height;
        render = p.render({ canvas: node, viewport: view });
        return render.promise;
      })
      .then(() => {
        if (active) setLoading(false);
      })
      .catch((e) => {
        if (active) {
          setError(e);
          setLoading(false);
        }
      });
    return () => {
      active = false;
      render?.cancel();
    };
  }, [pdf, page, scale]);
  return (
    <Stack spacing={2}>
      <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap" }}>
        <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          ← Trang
        </Button>
        <Typography sx={{ alignSelf: "center" }}>
          {page}/{pdf?.numPages ?? "…"}
        </Typography>
        <Button
          disabled={!pdf || page >= pdf.numPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Trang →
        </Button>
        <Button
          disabled={scale <= 0.5}
          onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
        >
          −
        </Button>
        <Typography sx={{ alignSelf: "center" }}>
          {Math.round(scale * 100)}%
        </Typography>
        <Button
          disabled={scale >= 3}
          onClick={() => setScale((s) => Math.min(3, s + 0.25))}
        >
          +
        </Button>
      </Stack>
      <Feedback loading={loading} error={error} retry={retry} />
      <div style={{ overflow: "auto", maxHeight: "65vh" }}>
        <canvas
          ref={canvas}
          style={{ display: "block", margin: "auto", maxWidth: "none" }}
        />
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
