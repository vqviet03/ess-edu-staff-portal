import { test } from "node:test";
import assert from "node:assert/strict";
import {
  runAssignmentUploadAttempt,
  type AssignmentUploadAttempt,
} from "../src/features/assignments/upload-attempt";
import type {
  MaterialFile,
  UploadTicket,
} from "../src/features/materials/models";

const ticket = {
  uploadId: "upload-1",
  uploadUrl: "https://storage.test/audio",
  version: 1,
} as UploadTicket;
const saved = { id: "upload-1" } as MaterialFile;
function setup() {
  const calls = { initiate: 0, put: 0, complete: 0 };
  const attempt: AssignmentUploadAttempt = {};
  const options = {
    attempt,
    file: new File(["audio"], "recording.m4a", { type: "audio/mp4" }),
    thumbnail: null as Blob | null,
    signal: new AbortController().signal,
    progress: () => {},
    initiate: async () => {
      calls.initiate++;
      return ticket;
    },
    put: async () => {
      calls.put++;
    },
    complete: async () => {
      calls.complete++;
      return saved;
    },
  };
  return { calls, options };
}

test("lost completion response retries the same receipt without another init or PUT", async () => {
  const { calls, options } = setup();
  const complete = options.complete;
  let first = true;
  options.complete = async () => {
    if (first) {
      first = false;
      throw { status: "TIMEOUT_ERROR", error: "Response lost" };
    }
    return complete();
  };
  await assert.rejects(runAssignmentUploadAttempt(options));
  assert.equal(await runAssignmentUploadAttempt(options), saved);
  assert.deepEqual(calls, { initiate: 1, put: 1, complete: 1 });
});

test("failed audio PUT retries using the original recording ticket", async () => {
  const { calls, options } = setup();
  let first = true;
  options.put = async () => {
    calls.put++;
    if (first) {
      first = false;
      throw new Error("Network failed");
    }
  };
  await assert.rejects(runAssignmentUploadAttempt(options), /Network failed/);
  assert.equal(await runAssignmentUploadAttempt(options), saved);
  assert.deepEqual(calls, { initiate: 1, put: 2, complete: 1 });
});

test("thumbnail retry does not upload the original file again", async () => {
  const { calls, options } = setup();
  options.initiate = async () => {
    calls.initiate++;
    return { ...ticket, thumbnailUploadUrl: "https://storage.test/thumb" };
  };
  options.thumbnail = new Blob(["thumb"], { type: "image/webp" });
  let count = 0;
  options.put = async () => {
    calls.put++;
    if (++count === 2) throw new Error("Thumbnail failed");
  };
  await assert.rejects(runAssignmentUploadAttempt(options), /Thumbnail failed/);
  await runAssignmentUploadAttempt(options);
  assert.deepEqual(calls, { initiate: 1, put: 3, complete: 1 });
});

test("aborted upload retains its ticket and resumes only on an explicit new attempt", async () => {
  const { calls, options } = setup();
  const controller = new AbortController();
  options.signal = controller.signal;
  options.initiate = async () => {
    calls.initiate++;
    controller.abort();
    return ticket;
  };
  await assert.rejects(runAssignmentUploadAttempt(options));
  assert.deepEqual(calls, { initiate: 1, put: 0, complete: 0 });
  options.signal = new AbortController().signal;
  await runAssignmentUploadAttempt(options);
  assert.deepEqual(calls, { initiate: 1, put: 1, complete: 1 });
});
