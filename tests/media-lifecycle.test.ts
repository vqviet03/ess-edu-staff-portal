import test from "node:test";
import assert from "node:assert/strict";
import { releaseMedia } from "../src/shared/media-lifecycle";
test("media cleanup pauses, removes element and nested sources, then resets decoding", () => {
  const calls: string[] = [];
  const node = {
    pause: () => calls.push("pause"),
    removeAttribute: (name: string) => calls.push(`element:${name}`),
    querySelectorAll: () => [
      { removeAttribute: (name: string) => calls.push(`source:${name}`) },
    ],
    load: () => calls.push("load"),
  };
  releaseMedia(node as unknown as HTMLMediaElement);
  assert.deepEqual(calls, ["pause", "element:src", "source:src", "load"]);
});
