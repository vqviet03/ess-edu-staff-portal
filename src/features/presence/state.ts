export interface Member { userId: string; publicId: string; name: string; nickname: string | null; role: string; lastSeenAt: string | null }
export interface Members { classId: string; items: Member[] }
export interface PresenceSignal { classId: string; userId: string; connectionId: string; online: boolean; seenAt: string }
export interface PresenceState { connections: Record<string, PresenceSignal>; lastSeen: Record<string,string>; connected: boolean }
export const PRESENCE_CONTEXT_EVENT = "portal:presence-context";
export const PRESENCE_SIGNAL_EVENT = "portal:presence-signal";
export const PRESENCE_CONNECTION_EVENT = "portal:presence-connection";
let context: string | null = null;
export function presenceContext() { return context; }
export function setPresenceContext(classId: string | null) {
  context = classId;
  window.dispatchEvent(new Event(PRESENCE_CONTEXT_EVENT));
}
export function receivePresence(signal: PresenceSignal) {
  window.dispatchEvent(new CustomEvent(PRESENCE_SIGNAL_EVENT,{ detail: signal }));
}
export function presenceConnection(connected: boolean) {
  window.dispatchEvent(new CustomEvent(PRESENCE_CONNECTION_EVENT,{detail: connected}));
}
export function applyPresence(state: PresenceState, signal: PresenceSignal) {
  state.connected = true;
  if(signal.online) state.connections[signal.connectionId] = signal;
  else { delete state.connections[signal.connectionId]; state.lastSeen[signal.userId] = signal.seenAt; }
}
export function memberOnline(state: PresenceState | undefined, userId: string) {
  return !!state?.connected && Object.values(state.connections).some(c=>c.userId===userId && c.online);
}
export function offlineLabel(seenAt: string | null | undefined, now = Date.now()) {
  if(!seenAt) return "Chưa có hoạt động gần đây";
  const minutes = Math.max(0,Math.floor((now-new Date(seenAt).getTime())/60000));
  return minutes < 1 ? "Vừa offline" : minutes < 60 ? `Offline ${minutes} phút` : minutes < 1440 ? `Offline ${Math.floor(minutes/60)} giờ` : `Offline ${Math.floor(minutes/1440)} ngày`;
}
