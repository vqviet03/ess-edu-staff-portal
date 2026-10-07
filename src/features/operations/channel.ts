import type { Operation } from "./models";

type Channel = {
  send?: (operationId: string) => void;
  waiting: Map<string, Set<(operation: Operation) => void>>;
};
const channels = new Map<string, Channel>();
function channel(token: string) {
  let value = channels.get(token);
  if (!value) {
    value = { waiting: new Map() };
    channels.set(token, value);
  }
  return value;
}
export function connectOperationChannel(token: string, send: (id: string) => void) {
  const value = channel(token);
  value.send = send;
  for (const id of value.waiting.keys()) send(id);
  return () => {
    if (value.send === send) value.send = undefined;
    if (!value.waiting.size && !value.send) channels.delete(token);
  };
}
export function receiveOperation(token: string, operation: Operation) {
  if (operation.status === "IN_PROGRESS") return;
  for (const resolve of channels.get(token)?.waiting.get(operation.operationId) ?? []) resolve(operation);
}
export function waitForOperation(token: string, id: string, signal: AbortSignal, timeout = 120000): Promise<Operation> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error("Đã ngừng theo dõi tác vụ.")); return; }
    const value = channel(token);
    const listeners = value.waiting.get(id) ?? new Set();
    const finish = (operation?: Operation) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      listeners.delete(finish);
      if (!listeners.size) value.waiting.delete(id);
      if (!value.waiting.size && !value.send) channels.delete(token);
      if (operation) resolve(operation);
      else reject(new Error("Chưa nhận được kết quả qua socket. Tác vụ đã gửi vẫn được xử lý; kiểm tra trạng thái trước khi gửi lại."));
    };
    const abort = () => finish();
    const timer = setTimeout(abort, timeout);
    listeners.add(finish);
    value.waiting.set(id, listeners);
    signal.addEventListener("abort", abort, { once: true });
    value.send?.(id);
  });
}
