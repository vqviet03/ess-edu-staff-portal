import { test } from "node:test";
import assert from "node:assert/strict";
import {
  answered,
  validLink,
  emptyAnswer,
  schemaWrite,
  type Question,
  type Assignment,
} from "../src/features/assignments/models";
const question: Question = {
  id: "q",
  type: "SINGLE",
  content: "",
  instructions: "",
  maxScore: 3,
  order: 0,
  allowUploadedAudio: true,
  maxDurationSeconds: 60,
  options: [
    { id: "a", content: "", order: 0, media: [] },
    { id: "b", content: "", order: 1, media: [] },
  ],
  media: [],
};
test("progress counts only valid answers; blank and zero text differ", () => {
  const a = emptyAnswer(question);
  assert.equal(answered(question, a), false);
  assert.equal(answered(question, { ...a, optionIds: ["a"] }), true);
  assert.equal(answered(question, { ...a, optionIds: ["invalid"] }), false);
  assert.equal(answered(question, { ...a, optionIds: ["a", "b"] }), false);
  assert.equal(
    answered({ ...question, type: "TEXT" }, { ...a, text: "   " }),
    false,
  );
  assert.equal(
    answered({ ...question, type: "TEXT" }, { ...a, text: "0" }),
    true,
  );
  assert.equal(
    answered(
      { ...question, type: "LINK_FILE" },
      { ...a, link: "javascript:alert(1)" },
    ),
    false,
  );
  assert.equal(
    answered(
      { ...question, type: "LINK_FILE" },
      { ...a, link: "https://example.com" },
    ),
    true,
  );
  assert.equal(
    answered(
      { ...question, type: "LINK_FILE" },
      { ...a, materialIds: ["completed-file"] },
    ),
    true,
  );
});
test("direct-only speaking requires confirmed recording session and exactly one file", () => {
  const q = {
      ...question,
      type: "SPEAKING" as const,
      allowUploadedAudio: false,
    },
    a = emptyAnswer(q);
  assert.equal(answered(q, a), false);
  assert.equal(answered(q, { ...a, materialIds: ["f"] }), false);
  assert.equal(
    answered(q, {
      ...a,
      materialIds: ["f"],
      recordingSessionId: "confirmed-session",
    }),
    true,
  );
  assert.equal(
    answered(q, {
      ...a,
      materialIds: ["f", "g"],
      recordingSessionId: "confirmed-session",
    }),
    false,
  );
});
test("unsafe links never qualify as a valid submission", () => {
  assert.equal(validLink("https://secret:password@example.com"), false);
  assert.equal(validLink("ftp://example.com"), false);
  assert.equal(validLink("https://example.com/page"), true);
});
test("schema write excludes display DTO/private storage details and preserves scoring configuration", () => {
  const assignment = {
    title: "Title",
    instructions: "",
    sessionId: null,
    unitNumber: 1,
    deadline: null,
    allowLate: true,
    version: 2,
    questions: [question],
  } as Assignment;
  const payload = schemaWrite(assignment);
  assert.equal(payload.version, 2);
  assert.equal(payload.questions[0].maxScore, 3);
  assert.equal("id" in payload.questions[0], false);
  assert.equal("file" in payload, false);
});
