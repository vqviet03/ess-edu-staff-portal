export interface StorageConnection {
  endpoint: string; region: string; bucket: string; accessKeyId: string; secretAccessKey: string;
}
// One-shot transport only: credentials never become RTK Query action arguments,
// persisted browser state, or cached query data. take() removes them immediately.
const pending = new Map<string, StorageConnection>();
export function stageConnection(value: StorageConnection): string {
  const key = crypto.randomUUID(); pending.set(key, { ...value }); return key;
}
export function takeConnection(key?: string): StorageConnection | undefined {
  if (!key) return undefined;
  const value = pending.get(key); pending.delete(key); return value;
}
