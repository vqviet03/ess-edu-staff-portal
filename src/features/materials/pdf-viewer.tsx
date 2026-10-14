"use client";
import { useEffect, useRef, useState } from "react";
import { Feedback } from "@/shared/ui";
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist";
GlobalWorkerOptions.workerSrc = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/pdf/pdf.worker.min.mjs`;
function PdfPage({ pdf, page }: { pdf: PDFDocumentProxy; page: number }) {
  const holder = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    [visible, setVisible] = useState(false),
    [width, setWidth] = useState(0),
    [height, setHeight] = useState(600),
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
    if (!visible || width <= 0) return;
    let active = true,
      task:
        | ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>
        | undefined;
    void pdf
      .getPage(page)
      .then((p) => {
        if (!active || !canvas.current) return;
        const original = p.getViewport({ scale: 1 }),
          view = p.getViewport({ scale: width / original.width }),
          ratio = Math.min(window.devicePixelRatio || 1, 2);
        setHeight(view.height);
        canvas.current.width = Math.floor(view.width * ratio);
        canvas.current.height = Math.floor(view.height * ratio);
        canvas.current.style.width = `${view.width}px`;
        canvas.current.style.height = `${view.height}px`;
        task = p.render({
          canvas: canvas.current,
          viewport: view,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        return task.promise;
      })
      .catch((e) => {
        if (active && e?.name !== "RenderingCancelledException") setError(e);
      });
    return () => {
      active = false;
      task?.cancel();
    };
  }, [pdf, page, visible, width]);
  return (
    <div
      ref={holder}
      data-pdf-page={page}
      style={{ minHeight: height, width: "100%", marginBottom: 8 }}
    >
      <Feedback error={error} />
      <canvas
        ref={canvas}
        aria-label={`Trang ${page}`}
        style={{ display: "block", margin: "auto", maxWidth: "100%" }}
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
  const [loaded, setLoaded] = useState<{
      url: string;
      pdf: PDFDocumentProxy;
    } | null>(null),
    [failure, setFailure] = useState<{ url: string; error: unknown } | null>(
      null,
    );
  const pdf = loaded?.url === url ? loaded.pdf : null,
    error = failure?.url === url ? failure.error : undefined;
  useEffect(() => {
    let active = true;
    const task = getDocument({ url, isEvalSupported: false });
    task.promise
      .then((pdf) => {
        if (active) setLoaded({ url, pdf });
      })
      .catch((error) => {
        if (active) setFailure({ url, error });
      });
    return () => {
      active = false;
      void task.destroy();
    };
  }, [url]);
  return (
    <div
      role="document"
      aria-label="Tài liệu PDF"
      style={{ width: "100%", touchAction: "pan-x pan-y pinch-zoom" }}
    >
      <Feedback loading={!pdf && !error} error={error} retry={retry} />
      {pdf &&
        Array.from({ length: pdf.numPages }, (_, i) => (
          <PdfPage key={i} pdf={pdf} page={i + 1} />
        ))}
    </div>
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
