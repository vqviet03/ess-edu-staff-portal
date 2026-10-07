// Display/export defaults only. Auth storage keys and infrastructure names remain stable.
let name = "ESS";
export function setApplicationName(value: string) { name = value; }
export function applicationName() { return name; }
export function exportPrefix() { return name.replace(/[^\p{L}\p{N}_-]/gu, "") || "export"; }
