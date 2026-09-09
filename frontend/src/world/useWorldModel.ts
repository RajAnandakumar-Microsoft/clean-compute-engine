import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../data/api";
import { draftIssues } from "../energy/EnergyControls";
import type { ForecastMetadata } from "../types/api";
import type { CompletedCoupling, CouplingRequest } from "../types/energy";
import { baselineFrame, baselineRequest, type AssetId, type WorldTab } from "./model";

export function useWorldModel() {
  const [draft, setDraft] = useState<CouplingRequest | null>(null);
  const [completed, setCompleted] = useState<CompletedCoupling | null>(null);
  const [metadata, setMetadata] = useState<ForecastMetadata | null>(null);
  const [tab, setTab] = useState<WorldTab>(window.location.pathname.replace(/\/$/, "").endsWith("/energy") ? "energy" : "overview");
  const [selection, setSelection] = useState<AssetId>(
    window.location.pathname.replace(/\/$/, "").endsWith("/energy") ? "solar" : "campus",
  );
  const [baseline, setBaseline] = useState(false);
  const [hourIndex, setHourIndex] = useState(12);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [camera, setCamera] = useState<{ serial: number; target: AssetId }>({ serial: 0, target: "campus" });
  const controller = useRef<AbortController | null>(null);

  const run = useCallback(async (request: CouplingRequest) => {
    if (controller.current) return;
    const active = new AbortController();
    controller.current = active;
    setBusy(true);
    setError("");
    setPlaying(false);
    const snapshot = structuredClone(request);
    try {
      const result = await api.couplingEvaluate(snapshot, active.signal);
      if (!active.signal.aborted) {
        setCompleted({ request: snapshot, result });
        setDraft(snapshot);
        setHourIndex((index) => Math.min(index, result.hourly_trace.length - 1));
      }
    } catch (reason: unknown) {
      if (!active.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      if (!active.signal.aborted) setBusy(false);
      if (controller.current === active) controller.current = null;
    }
  }, []);

  useEffect(() => {
    const active = new AbortController();
    Promise.all([api.couplingExample(active.signal), api.forecastMetadata(active.signal)])
      .then(([example, options]) => {
        if (active.signal.aborted) return;
        setDraft(example); setMetadata(options); setLoading(false);
        void run(example);
      })
      .catch((reason: unknown) => {
        if (!active.signal.aborted) {
          setError(reason instanceof Error ? reason.message : String(reason));
          setLoading(false);
        }
      });
    return () => { active.abort(); controller.current?.abort(); };
  }, [run]);

  const dirty = Boolean(draft && completed && JSON.stringify(draft) !== JSON.stringify(completed.request));
  const issues = useMemo(() => draft ? draftIssues(draft) : [], [draft]);
  const rawHour = completed?.result.hourly_trace[hourIndex] ?? null;
  const hour = dirty ? null : rawHour && baseline ? baselineFrame(rawHour) : rawHour;
  const request = draft && baseline && !dirty ? baselineRequest(draft) : draft;

  useEffect(() => {
    if (!playing || !completed || dirty || busy) return;
    const timer = window.setInterval(() => setHourIndex((index) =>
      (index + 1) % completed.result.hourly_trace.length), 650);
    return () => window.clearInterval(timer);
  }, [playing, completed, dirty, busy]);

  const focus = (target: AssetId) => setCamera((current) => ({ serial: current.serial + 1, target }));
  const chooseTab = (next: WorldTab) => {
    if (next === "design") { setBaseline(false); setPlaying(false); }
    if (next === "overview") setSelection("campus");
    if (next === "energy" && ["campus", "compute", "cooling"].includes(selection)) setSelection("solar");
    if (next === "water" && selection !== "hydro") setSelection("cooling");
    if (next === "compute") { setSelection("compute"); focus("compute"); }
    if (tab === "compute" && next !== "compute" && next !== "design") focus("campus");
    setTab(next);
  };
  const selectAsset = (id: AssetId) => {
    setSelection(id);
    if (tab === "design" || tab === "compare") return;
    if (id === "campus") { setTab("overview"); return; }
    if (id === "compute") { setTab("compute"); focus("compute"); return; }
    if (tab === "compute") focus("campus");
    if (id === "cooling" || (tab === "water" && id === "hydro")) setTab("water");
    else setTab("energy");
  };
  const selectHour = (index: number) => {
    setPlaying(false);
    setHourIndex(Math.max(0, Math.min(index, (completed?.result.hourly_trace.length ?? 1) - 1)));
  };
  const changeMonth = (month: number) => {
    if (!draft || dirty || busy) return;
    const next = { ...draft, trace_month: month };
    void run(next);
  };
  const updateDraft = (next: CouplingRequest) => { setDraft(next); setPlaying(false); };
  const discard = () => { if (completed) setDraft(structuredClone(completed.request)); setError(""); };

  return {
    draft, request, completed, metadata, loading, busy, error, dirty, issues,
    tab, selection, baseline, hourIndex, hour, playing, camera,
    run, chooseTab, selectAsset, selectHour, changeMonth, updateDraft, discard,
    setBaseline, setPlaying, focus,
  };
}
