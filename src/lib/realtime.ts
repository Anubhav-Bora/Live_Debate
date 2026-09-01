type RealtimeServer = {
  emit(event: string, payload: unknown): void;
  to(room: string): { emit(event: string, payload: unknown): void };
};

function realtimeServer() {
  return (globalThis as typeof globalThis & { debateRealtime?: RealtimeServer }).debateRealtime;
}

export function emitDashboardUpdated(payload: Record<string, unknown>) {
  realtimeServer()?.emit("dashboard_updated", payload);
}

export function emitDebateEvent(debateId: string, event: string, payload: unknown) {
  realtimeServer()?.to(`debate_${debateId}`).emit(event, payload);
}
