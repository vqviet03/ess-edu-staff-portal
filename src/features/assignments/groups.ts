import type { Assignment, Question, QuestionGroup } from "./models";
export interface AssignmentBlock {
  id: string;
  group?: QuestionGroup;
  questions: Question[];
}
export function assignmentBlocks(
  a: Pick<Assignment, "questions" | "groups">,
): AssignmentBlock[] {
  const groups = new Map((a.groups ?? []).map((g) => [g.id, g]));
  const seen = new Set<string>();
  const result: AssignmentBlock[] = [];
  for (let i = 0; i <= a.questions.length; i++) {
    for (const g of groups.values())
      if (
        !seen.has(g.id) &&
        !a.questions.some((q) => q.groupId === g.id) &&
        Math.min(g.order, a.questions.length) === i
      ) {
        result.push({ id: g.id, group: g, questions: [] });
        seen.add(g.id);
      }
    const q = a.questions[i];
    if (!q) continue;
    const g = q.groupId ? groups.get(q.groupId) : undefined;
    if (!g) result.push({ id: q.id, questions: [q] });
    else if (!seen.has(g.id)) {
      result.push({
        id: g.id,
        group: g,
        questions: a.questions.filter((x) => x.groupId === g.id),
      });
      seen.add(g.id);
    }
  }
  return result;
}
function fromBlocks(a: Assignment, blocks: AssignmentBlock[]): Assignment {
  let offset = 0;
  const groups: QuestionGroup[] = [];
  for (const b of blocks) {
    if (b.group) groups.push({ ...b.group, order: offset });
    offset += b.questions.length;
  }
  return { ...a, groups, questions: blocks.flatMap((b) => b.questions) };
}
export function moveBlock(
  a: Assignment,
  id: string,
  target: number,
): Assignment {
  const blocks = assignmentBlocks(a),
    from = blocks.findIndex((b) => b.id === id);
  if (
    from < 0 ||
    !Number.isInteger(target) ||
    target < 0 ||
    target >= blocks.length
  )
    return a;
  const [block] = blocks.splice(from, 1);
  blocks.splice(target, 0, block);
  return fromBlocks(a, blocks);
}
export function moveQuestion(
  a: Assignment,
  id: string,
  target: number,
): Assignment {
  const q = a.questions.find((q) => q.id === id);
  if (!q || !Number.isInteger(target)) return a;
  if (!q.groupId) return moveBlock(a, id, target);
  const blocks = assignmentBlocks(a);
  const b = blocks.find((b) => b.id === q.groupId);
  if (!b || target < 0 || target >= b.questions.length) return a;
  const from = b.questions.findIndex((q) => q.id === id);
  const [item] = b.questions.splice(from, 1);
  b.questions.splice(target, 0, item);
  return fromBlocks(a, blocks);
}
export function assignGroup(
  a: Assignment,
  id: string,
  groupId: string | null,
): Assignment {
  const q = a.questions.find((q) => q.id === id);
  if (!q) return a;
  const blocks = assignmentBlocks(a)
    .map((b) => ({ ...b, questions: b.questions.filter((q) => q.id !== id) }))
    .filter((b) => b.group || b.questions.length);
  const item = { ...q, groupId };
  if (groupId) {
    const group = blocks.find((b) => b.id === groupId);
    if (!group) return a;
    group.questions.push(item);
  } else blocks.push({ id: item.id, questions: [item] });
  return fromBlocks(a, blocks);
}
