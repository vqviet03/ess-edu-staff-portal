export function nameIdentifier(name: string) {
  const words = name.replace(/[đĐ]/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z]+/g) ?? [];
  if (!words.length) throw new Error("Họ tên cần có chữ cái để sinh ID.");
  return (words.length === 1 ? words[0] : words.slice(0, -1).map((w) => w[0]).join("") + "." + words.at(-1)).slice(0, 64);
}
export function availableIdentifier(root: string, used: Set<string>) {
  const normalized = root.trim();
  if (!/^[a-z0-9][a-z0-9_.-]{1,63}$/i.test(normalized)) throw new Error("ID gồm 2–64 chữ, số, dấu . _ -");
  if (!used.has(normalized.toLowerCase())) return normalized;
  for (let i = 1; ; i++) {
    const tail = String(i), candidate = normalized.slice(0, 64 - tail.length) + tail;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}
export function classPrefix(value: string) { return value.match(/^ess\d+(?=-|$)/i)?.[0].toLowerCase() ?? value; }
