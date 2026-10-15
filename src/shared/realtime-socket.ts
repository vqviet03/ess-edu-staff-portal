/** Event-driven, same-origin/session/class sharing. No heartbeat or HTTP fallback.
 * Web Locks guarantees one owner; releasing the lock hands ownership to a waiting tab.
 * Joining requests a fresh broker snapshot; we never replay cached private payloads.
 */
export type RealtimeSocket = Pick<
  WebSocket,
  "readyState" | "onopen" | "onmessage" | "onclose" | "send" | "close"
>;
export function createRealtimeSocket(
  url: string,
  token: string,
  context: string | null,
): RealtimeSocket {
  if (
    !navigator.locks ||
    typeof BroadcastChannel === "undefined" ||
    !globalThis.crypto?.subtle
  )
    return new WebSocket(url);
  return new SharedSocket(url, token, context);
}
class SharedSocket implements RealtimeSocket {
  readyState: number = WebSocket.CONNECTING;
  onopen: WebSocket["onopen"] = null;
  onmessage: WebSocket["onmessage"] = null;
  onclose: WebSocket["onclose"] = null;
  private channel?: BroadcastChannel;
  private native?: WebSocket;
  private auth?: Record<string, unknown>;
  private leader = false;
  private release?: () => void;
  private cancel = new AbortController();
  private id = crypto.randomUUID();
  private commands = new Set<string>();
  private peers = new Set<string>();
  private sent = new Set<string>();
  constructor(
    private url: string,
    private token: string,
    private context: string | null,
  ) {
    void this.start();
  }
  private emit(kind: string, data?: unknown) {
    this.channel?.postMessage({ kind, data, sender: this.id });
  }
  private async start() {
    try {
      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(
          JSON.stringify([this.url, this.token, this.context]),
        ),
      );
      if (this.cancel.signal.aborted) return;
      const name =
        "portal-live-" +
        Array.from(new Uint8Array(hash), (b) =>
          b.toString(16).padStart(2, "0"),
        ).join("");
      this.channel = new BroadcastChannel(name);
      this.channel.onmessage = (event) => {
        const { kind, data, sender } = event.data ?? {};
        if (sender === this.id || this.cancel.signal.aborted) return;
        if (kind === "leader" && this.auth) this.emit("join", this.auth.cursor);
        if (
          kind === "join" &&
          this.leader &&
          this.auth &&
          !this.peers.has(sender)
        ) {
          this.peers.add(sender);
          if (
            data === undefined ||
            Number(data) < Number(this.auth.cursor ?? Infinity)
          )
            this.auth.cursor = data;
          this.connect();
        }
        if (kind === "command" && this.leader && typeof data === "string")
          this.forward(data);
        if (kind === "frame" && typeof data === "string") this.deliver(data);
        if (kind === "closed")
          this.finish(data as { code: number; reason: string });
      };
      this.readyState = WebSocket.OPEN;
      this.onopen?.call(this as unknown as WebSocket, new Event("open"));
      void navigator.locks
        .request(name, { signal: this.cancel.signal }, async () => {
          if (this.cancel.signal.aborted) return;
          this.leader = true;
          this.emit("leader");
          if (this.auth) this.connect();
          await new Promise<void>((resolve) => {
            this.release = resolve;
          });
        })
        .catch(() => {
          /* Abort removes the waiting lock; never retry on a timer. */
          if (!this.cancel.signal.aborted)
            this.finish({ code: 1011, reason: "TRANSPORT_UNAVAILABLE" });
        });
    } catch {
      this.finish({ code: 1011, reason: "TRANSPORT_UNAVAILABLE" });
    }
  }
  private connect() {
    if (!this.auth || this.cancel.signal.aborted) return;
    if (this.native) {
      this.native.onclose = null;
      this.native.onopen = null;
      this.native.onmessage = null;
      this.native.close(1000, "SYNC");
    }
    this.sent.clear();
    const current = new WebSocket(this.url);
    this.native = current;
    current.onopen = () => {
      current.send(JSON.stringify({ ...this.auth, accessToken: this.token }));
    };
    current.onmessage = (event) => {
      const data = String(event.data);
      this.emit("frame", data);
      this.deliver(data);
      try {
        if (JSON.parse(data).type === "READY") {
          for (const command of this.commands) current.send(command);
          this.commands.clear();
        }
      } catch {}
    };
    current.onclose = (event) => {
      if (this.native !== current || this.cancel.signal.aborted) return;
      const close = { code: event.code, reason: event.reason };
      this.emit("closed", close);
      this.finish(close);
    };
  }
  private deliver(data: string) {
    if (this.cancel.signal.aborted) return;
    try {
      const frame = JSON.parse(data);
      if (frame.cursor && this.auth) this.auth.cursor = frame.cursor;
      if (frame.type === "CHANGE" && frame.data?.eventId && this.auth)
        this.auth.cursor = frame.data.eventId;
    } catch {}
    this.onmessage?.call(
      this as unknown as WebSocket,
      new MessageEvent("message", { data }),
    );
  }
  private forward(data: string) {
    if (data.includes('"WATCH"') && this.sent.has(data)) return;
    if (this.native?.readyState === WebSocket.OPEN) {
      this.native.send(data);
      this.sent.add(data);
    } else this.commands.add(data);
  }
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (typeof data !== "string" || this.cancel.signal.aborted) return;
    let frame: Record<string, unknown>;
    try {
      frame = JSON.parse(data);
    } catch {
      return;
    }
    if (frame.type === "AUTH") {
      // Tokens stay in this tab, never in BroadcastChannel/localStorage messages.
      this.auth = { type: "AUTH", cursor: frame.cursor };
      if (this.leader) this.connect();
      else this.emit("join", frame.cursor);
    } else if (this.leader) this.forward(data);
    else this.emit("command", data);
  }
  close() {
    if (this.cancel.signal.aborted) return;
    this.readyState = WebSocket.CLOSED;
    this.cancel.abort();
    if (this.native) {
      this.native.onclose = null;
      this.native.onopen = null;
      this.native.onmessage = null;
      this.native.close(1000, "BACKGROUND");
    }
    this.channel?.close();
    this.release?.();
    this.leader = false;
  }
  private finish(data: { code: number; reason: string }) {
    if (this.cancel.signal.aborted) return;
    this.close();
    this.onclose?.call(
      this as unknown as WebSocket,
      new CloseEvent("close", data),
    );
  }
}
