import { create } from "zustand";
import type {
  DCModel, DesignConfig, FinanceReport, LifetimeReport, LocationOpt, OverlayName, LensName,
  Scenario, ScheduleResult, CompareResult, TelemetryFrame, ForecastMetadata,
  ForecastResult, ForecastRunRequest,
} from "../types/api";
import { api } from "./api";

export type SelKind = "facility" | "hall" | "rack" | "server" | "gpu";
export interface Selection { kind: SelKind; id: string; }
export interface Toast { id: number; text: string; kind: "info" | "warn" | "good"; }
export interface SavedDesign { name: string; config: DesignConfig; finance: FinanceReport; }

interface State {
  model: DCModel | null;
  finance: FinanceReport | null;
  frame: TelemetryFrame | null;
  config: DesignConfig | null;
  scenarios: Scenario[];
  locations: LocationOpt[];
  selection: Selection;
  overlay: OverlayName;
  lens: LensName;
  view: "ecosystem" | "hall";
  timescale: "day" | "lifetime";
  lifetime: LifetimeReport | null;
  lifetimeIdx: number;
  playing: boolean;
  speed: number;
  hour: number;
  scenario: string;
  building: boolean;
  saved: SavedDesign[];
  compareResult: CompareResult | null;
  scheduleResult: ScheduleResult | null;
  forecastMetadata: ForecastMetadata | null;
  forecastRequest: ForecastRunRequest | null;
  forecastCompletedRequest: ForecastRunRequest | null;
  forecastResult: ForecastResult | null;
  forecastBusy: boolean;
  toasts: Toast[];
  _send: ((cmd: Record<string, unknown>) => void) | null;

  init: () => Promise<void>;
  rebuild: (config: DesignConfig) => Promise<void>;
  setFrame: (f: TelemetryFrame) => void;
  setSender: (fn: (cmd: Record<string, unknown>) => void) => void;
  select: (kind: SelKind, id: string) => void;
  setOverlay: (o: OverlayName) => void;
  setLens: (l: LensName) => void;
  setView: (v: "ecosystem" | "hall") => void;
  setTimescale: (t: "day" | "lifetime") => void;
  loadLifetime: () => Promise<void>;
  setLifetimeIdx: (i: number) => void;
  play: () => void;
  pause: () => void;
  setSpeed: (s: number) => void;
  scrub: (hour: number) => void;
  setScenario: (id: string) => void;
  saveCurrent: () => void;
  runCompare: (aName: string, bName: string) => Promise<void>;
  runSchedule: (enabled: boolean) => Promise<void>;
  setForecastRequest: (request: ForecastRunRequest) => void;
  runForecast: (request: ForecastRunRequest) => Promise<void>;
  pushToast: (text: string, kind?: Toast["kind"]) => void;
}

let toastId = 0;

export const useStore = create<State>((set, get) => ({
  model: null, finance: null, frame: null, config: null,
  scenarios: [], locations: [],
  selection: { kind: "facility", id: "fac-0" },
  overlay: "carbon", lens: "sustainability",
  view: "ecosystem", timescale: "day",
  lifetime: null, lifetimeIdx: 5,
  playing: true, speed: 10, hour: 8, scenario: "normal",
  building: false, saved: [], compareResult: null, scheduleResult: null,
  forecastMetadata: null, forecastRequest: null, forecastCompletedRequest: null,
  forecastResult: null,
  forecastBusy: false, toasts: [],
  _send: null,

  init: async () => {
    const [model, finance, scenarios, locations, forecastMetadata, forecastRequest] = await Promise.all([
      api.model(), api.finance(), api.scenarios(), api.locations(),
      api.forecastMetadata(), api.forecastExample(),
    ]);
    set({
      model, finance, config: model.config, scenarios, locations,
      forecastMetadata, forecastRequest,
    });
  },

  rebuild: async (config) => {
    set({ building: true });
    try {
      const res = await api.build(config);
      set({
        model: res.model, finance: res.finance, config: res.model.config,
        playing: res.control.playing, speed: res.control.speed, hour: res.control.hour,
        scenario: res.control.scenario, selection: { kind: "facility", id: "fac-0" },
        view: "ecosystem", lifetime: null,
      });
      if (get().timescale === "lifetime") get().loadLifetime();
      get().pushToast(`Rebuilt: ${res.model.total_gpus} GPUs, ${res.model.installed_it_mw} MW IT`, "good");
    } catch (e) {
      get().pushToast(`Build failed: ${(e as Error).message}`, "warn");
    } finally {
      set({ building: false });
    }
  },

  setFrame: (f) => set({ frame: f, hour: f.hour }),
  setSender: (fn) => set({ _send: fn }),

  select: (kind, id) => {
    // facility = the whole ecosystem; anything inside = the hall
    const view = kind === "facility" ? "ecosystem" : "hall";
    set({ selection: { kind, id }, view });
    // subscribe to detail for the rack that owns the selection
    const rackId = kind === "rack" ? id
      : kind === "server" ? id.split("-srv-")[0]
      : kind === "gpu" ? id.split("-srv-")[0]
      : null;
    get()._send?.({ action: "subscribe", rack_id: rackId });
  },

  setOverlay: (overlay) => set({ overlay }),
  setLens: (lens) => set({ lens }),
  setView: (view) => set(view === "ecosystem"
    ? { view, selection: { kind: "facility", id: "fac-0" } }
    : { view, selection: { kind: "hall", id: "hall-0" } }),
  setTimescale: (timescale) => {
    set({ timescale });
    if (timescale === "lifetime" && !get().lifetime) get().loadLifetime();
  },
  loadLifetime: async () => {
    try { set({ lifetime: await api.lifetime() }); } catch { /* ignore */ }
  },
  setLifetimeIdx: (lifetimeIdx) => set({ lifetimeIdx }),

  play: () => { set({ playing: true }); get()._send?.({ action: "play" }); },
  pause: () => { set({ playing: false }); get()._send?.({ action: "pause" }); },
  setSpeed: (speed) => { set({ speed }); get()._send?.({ action: "speed", speed }); },
  scrub: (hour) => { set({ hour, playing: false }); get()._send?.({ action: "pause" }); get()._send?.({ action: "scrub", hour }); },
  setScenario: (scenario) => {
    set({ scenario });
    get()._send?.({ action: "scenario", scenario });
    const s = get().scenarios.find((x) => x.id === scenario);
    if (s) get().pushToast(`Scenario: ${s.name}`, "info");
  },

  saveCurrent: () => {
    const { config, finance, saved } = get();
    if (!config || !finance) return;
    const name = config.name && config.name !== "Untitled design" ? config.name : `Design ${saved.length + 1}`;
    set({ saved: [...saved.filter((s) => s.name !== name), { name, config: { ...config, name }, finance }] });
    get().pushToast(`Saved design "${name}"`, "good");
  },

  runCompare: async (aName, bName) => {
    const { saved } = get();
    const a = saved.find((s) => s.name === aName);
    const b = saved.find((s) => s.name === bName);
    if (!a || !b) return;
    const compareResult = await api.compare(a.config, b.config);
    set({ compareResult });
  },

  runSchedule: async (enabled) => {
    const scheduleResult = await api.schedule(enabled);
    set({ scheduleResult });
    // reflect the rebuilt design
    const [model, finance] = await Promise.all([api.model(), api.finance()]);
    set({ model, finance, config: model.config });
    get().pushToast(scheduleResult.note, enabled ? "good" : "info");
  },

  setForecastRequest: (forecastRequest) => set({ forecastRequest }),

  runForecast: async (forecastRequest) => {
    set({
      forecastBusy: true,
      forecastRequest,
      forecastCompletedRequest: null,
      forecastResult: null,
    });
    try {
      const forecastResult = await api.forecast(forecastRequest);
      set({
        forecastResult,
        forecastCompletedRequest: structuredClone(forecastRequest),
      });
      get().pushToast(
        `Forecast complete: ${forecastResult.sample_count} paths, ${forecastResult.scenario.periods.length} months`,
        "good",
      );
    } catch (error) {
      get().pushToast(`Forecast failed: ${(error as Error).message}`, "warn");
    } finally {
      set({ forecastBusy: false });
    }
  },

  pushToast: (text, kind = "info") => {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { id, text, kind }] });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 5200);
  },
}));

// expose for headless/dev tooling
if (typeof window !== "undefined") (window as any).useStore = useStore;
