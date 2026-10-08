export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= MAX_IMAGE_BYTES)
    return file;
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    let ratio = Math.min(1, 8192 / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 10; attempt++) {
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Thiết bị không hỗ trợ nén ảnh.");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(
          resolve,
          "image/webp",
          Math.max(0.5, 0.9 - attempt * 0.05),
        ),
      );
      if (blob && blob.size <= MAX_IMAGE_BYTES)
        return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
          type: "image/webp",
        });
      ratio *= 0.75;
    }
    throw new Error("Không nén được ảnh về tối đa 20 MB.");
  } finally {
    bitmap.close();
  }
}
