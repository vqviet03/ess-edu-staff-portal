import type { MaterialFile, UploadTicket } from "../materials/models";
import { putSigned } from "../materials/upload-transport";

// One user-confirmed file owns one upload ticket, including explicit retries.
export type AssignmentUploadAttempt = {
  ticket?: UploadTicket;
  fileUploaded?: boolean;
  thumbnailUploaded?: boolean;
};

export async function runAssignmentUploadAttempt({
  attempt,
  file,
  thumbnail,
  signal,
  progress,
  initiate,
  complete,
  put = putSigned,
}: {
  attempt: AssignmentUploadAttempt;
  file: File;
  thumbnail: Blob | null;
  signal: AbortSignal;
  progress: (value: number) => void;
  initiate: () => Promise<UploadTicket>;
  complete: (ticket: UploadTicket) => Promise<MaterialFile>;
  put?: typeof putSigned;
}): Promise<MaterialFile> {
  if (!attempt.ticket) attempt.ticket = await initiate();
  const ticket = attempt.ticket;
  signal.throwIfAborted();
  if (!attempt.fileUploaded) {
    await put(ticket.uploadUrl, file, file.type, signal, progress);
    attempt.fileUploaded = true;
  }
  if (ticket.thumbnailUploadUrl && thumbnail && !attempt.thumbnailUploaded) {
    await put(
      ticket.thumbnailUploadUrl,
      thumbnail,
      thumbnail.type,
      signal,
      () => {},
    );
    attempt.thumbnailUploaded = true;
  }
  signal.throwIfAborted();
  // Completion is idempotent on BE: retry it if its response was lost.
  return await complete(ticket);
}
