// Blobs and callbacks stay outside Redux; mutation arguments contain only serializable IDs.
export const uploadBuffers = new Map<
  string,
  { file: File; thumbnail: Blob | null; progress: (progress: number) => void }
>();
export function putSigned(
  url: string,
  body: Blob,
  mime: string,
  signal: AbortSignal,
  progress: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort, { once: true });
    const finish = () => signal.removeEventListener("abort", abort);
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", mime);
    xhr.timeout = 120000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) progress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      finish();
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload HTTP ${xhr.status}.`));
    };
    xhr.onerror = () => {
      finish();
      reject(new Error("Không tải được file. Kiểm tra mạng/CORS và thử lại."));
    };
    xhr.ontimeout = () => {
      finish();
      reject(new Error("Upload quá thời gian."));
    };
    xhr.onabort = () => {
      finish();
      reject(new Error("Đã hủy tải file."));
    };
    if (signal.aborted) {
      finish();
      reject(new Error("Đã hủy."));
      return;
    }
    xhr.send(body);
  });
}
