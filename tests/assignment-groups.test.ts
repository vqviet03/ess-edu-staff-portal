import test from "node:test";
import assert from "node:assert/strict";
import {
  assignmentBlocks,
  moveBlock,
  moveQuestion,
  assignGroup,
} from "../src/features/assignments/groups";
import {
  schemaWrite,
  type Assignment,
  type Question,
} from "../src/features/assignments/models";
const question = (id: string, groupId: string | null = null): Question => ({
  id,
  groupId,
  type: "TEXT",
  content: id,
  instructions: "",
  rubric: "internal",
  maxScore: 2,
  order: 0,
  allowUploadedAudio: true,
  maxDurationSeconds: 60,
  options: [],
  media: [],
});
const assignment = (): Assignment => ({
  id: "a",
  classId: "c",
  postId: "p",
  sessionId: null,
  unitNumber: 1,
  title: "Đề",
  instructions: "",
  status: "DRAFT",
  deadline: null,
  allowLate: true,
  publishedAt: null,
  version: 1,
  assignmentVersionId: "v",
  schemaVersion: 1,
  canEdit: true,
  totalMax: 8,
  groups: [
    {
      id: "g",
      title: "Bài đọc",
      content: "Dữ kiện",
      instructions: "",
      order: 1,
      media: [],
    },
    {
      id: "empty",
      title: "Chưa có câu",
      content: "",
      instructions: "",
      order: 4,
      media: [],
    },
  ],
  questions: [
    question("one"),
    question("two", "g"),
    question("three", "g"),
    question("four"),
  ],
});
test("groups are blocks, never synthetic questions or extra score rows", () => {
  const a = assignment();
  assert.deepEqual(
    assignmentBlocks(a).map((b) => b.id),
    ["one", "g", "four", "empty"],
  );
  assert.equal(
    a.questions.reduce((sum, q) => sum + q.maxScore, 0),
    8,
  );
  const written = schemaWrite(a);
  assert.equal(written.questions.length, 4);
  assert.equal(written.groups?.[0].title, "Bài đọc");
  assert.equal(written.questions[1].groupId, "g");
  assert.deepEqual(
    schemaWrite({ ...a, groups: [...a.groups!].reverse() }).groups?.map(
      (g) => g.id,
    ),
    ["g", "empty"],
  );
});
test("moving a group keeps its children contiguous; child order preserves IDs and group membership", () => {
  const a = assignment(),
    moved = moveBlock(a, "g", 0);
  assert.deepEqual(
    moved.questions.map((q) => q.id),
    ["two", "three", "one", "four"],
  );
  assert.equal(moved.groups?.[0].order, 0);
  const sorted = moveQuestion(moved, "two", 1);
  assert.deepEqual(
    sorted.questions.map((q) => q.id),
    ["three", "two", "one", "four"],
  );
  assert.equal(sorted.questions[0].groupId, "g");
  assert.equal(sorted.questions[1].groupId, "g");
  assert.deepEqual(
    a.questions.map((q) => q.id),
    ["one", "two", "three", "four"],
  );
  assert.equal(moveQuestion(a, "two", -1), a);
  assert.equal(moveQuestion(a, "two", 9), a);
});
test("explicit membership changes move a question without splitting another group or losing empty groups", () => {
  const a = assignment();
  const grouped = assignGroup(a, "one", "g");
  assert.deepEqual(
    grouped.questions.map((q) => q.id),
    ["two", "three", "one", "four"],
  );
  assert.equal(grouped.questions[2].groupId, "g");
  assert.equal(grouped.groups?.length, 2);
  const detached = assignGroup(grouped, "three", null);
  assert.deepEqual(
    detached.questions.map((q) => q.id),
    ["two", "one", "four", "three"],
  );
  assert.equal(detached.questions[3].groupId, null);
});
