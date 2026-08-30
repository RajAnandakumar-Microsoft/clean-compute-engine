import { useStore } from "./store";

// Connects to the backend telemetry stream, pushes frames into the store, and
// registers a sender so the store can issue control commands over the socket.
export function connectWs(): () => void {
  let ws: WebSocket | null = null;
  let closed = false;
  let retry: ReturnType<typeof setTimeout> | null = null;

  const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/stream`;

  const open = () => {
    ws = new WebSocket(url);
    ws.onopen = () => {
      useStore.getState().setSender((cmd) => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(cmd));
      });
      // re-assert current control state on (re)connect
      const s = useStore.getState();
      ws?.send(JSON.stringify({ action: s.playing ? "play" : "pause" }));
      ws?.send(JSON.stringify({ action: "speed", speed: s.speed }));
      ws?.send(JSON.stringify({ action: "scenario", scenario: s.scenario }));
    };
    ws.onmessage = (ev) => {
      try {
        useStore.getState().setFrame(JSON.parse(ev.data));
      } catch { /* ignore malformed frame */ }
    };
    ws.onclose = () => {
      if (closed) return;
      retry = setTimeout(open, 1000);
    };
    ws.onerror = () => ws?.close();
  };

  open();
  return () => {
    closed = true;
    if (retry) clearTimeout(retry);
    ws?.close();
  };
}
