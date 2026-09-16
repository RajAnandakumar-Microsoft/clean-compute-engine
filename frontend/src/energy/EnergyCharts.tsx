import { useEffect, useMemo, useRef, useState } from "react";
import type { CouplingResult, EnergyHour } from "../types/energy";

const SOURCES = [
  { key: "solar_to_load_mw", label: "Solar", color: "#edc15d" },
  { key: "wind_to_load_mw", label: "Wind", color: "#58caaa" },
  { key: "hydro_to_load_mw", label: "Hydro", color: "#48b9ec" },
  { key: "nuclear_to_load_mw", label: "Nuclear", color: "#b3a0ed" },
  { key: "battery_to_load_mw", label: "Battery", color: "#3a9f84" },
  { key: "gas_to_load_mw", label: "Gas", color: "#cc956f" },
  { key: "grid_to_load_mw", label: "Grid", color: "#647d9f" },
  { key: "unserved_mw", label: "Unserved", color: "#ed715f" },
] as const;

const WIDTH = 920;
const LEFT = 56;
const RIGHT = 18;
const TOP = 24;
const BOTTOM = 222;

function useChartWidth() {
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(WIDTH);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(280, Math.min(WIDTH, entry.contentRect.width)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

function hourLabel(timestamp: string): string {
  return `${timestamp.slice(5, 10)} ${timestamp.slice(11, 13)}:00`;
}

function SupplyChart({
  hours, selected, onSelect,
}: { hours: EnergyHour[]; selected: number; onSelect: (index: number) => void }) {
  const { ref, width } = useChartWidth();
  const plot = useMemo(() => {
    const max = Math.max(1, ...hours.map((hour) => Math.max(hour.required_load_mw, hour.original_load_mw)));
    const ceiling = Math.ceil(max / 5) * 5;
    const x = (index: number) => LEFT + index / Math.max(1, hours.length - 1) * (width - LEFT - RIGHT);
    const y = (value: number) => BOTTOM - value / ceiling * (BOTTOM - TOP);
    const lower = hours.map(() => 0);
    const areas = SOURCES.map((source) => {
      const upper = hours.map((hour, index) => lower[index] + hour[source.key]);
      const top = upper.map((value, index) => `${x(index)},${y(value)}`).join(" ");
      const bottom = lower.map((value, index) => `${x(index)},${y(value)}`).reverse().join(" ");
      upper.forEach((value, index) => { lower[index] = value; });
      return { ...source, points: `${top} ${bottom}` };
    });
    const line = (key: "required_load_mw" | "original_load_mw") => hours
      .map((hour, index) => `${index ? "L" : "M"}${x(index)},${y(hour[key])}`).join(" ");
    return { x, y, ceiling, areas, required: line("required_load_mw"), original: line("original_load_mw") };
  }, [hours, width]);
  return (
    <svg ref={ref} className="coupling-hourly-chart" viewBox={`0 0 ${width} 260`} role="img"
      aria-label="Hourly physical electricity supply stacked to required load"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const position = (event.clientX - rect.left) / rect.width * width;
        onSelect(Math.max(0, Math.min(hours.length - 1,
          Math.round((position - LEFT) / (width - LEFT - RIGHT) * (hours.length - 1)))));
      }}>
      <title>Hourly physical supply and any unserved load</title>
      <desc>Stacked sources are from one simulated path. Use the Inspect hour slider below for values.</desc>
      {[0, 1, 2, 3, 4].map((tick) => {
        const value = plot.ceiling * tick / 4;
        return <g key={tick}>
          <line x1={LEFT} x2={width - RIGHT} y1={plot.y(value)} y2={plot.y(value)} className="energy-gridline" />
          <text x={LEFT - 10} y={plot.y(value) + 4} textAnchor="end">{value.toFixed(0)}</text>
        </g>;
      })}
      <text x={LEFT} y={14}>MW</text>
      {plot.areas.map((area) => <polygon key={area.key} points={area.points} fill={area.color} opacity={0.88} />)}
      <path d={plot.original} stroke="#b8c6d5" strokeDasharray="5 5" strokeWidth={2} fill="none" />
      <path d={plot.required} stroke="#f0f8ff" strokeWidth={2} fill="none" />
      <line x1={plot.x(selected)} x2={plot.x(selected)} y1={TOP} y2={BOTTOM}
        stroke="#f3fbff" strokeDasharray="3 4" opacity={0.7} />
      {(width < 500 ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]).map((fraction) => {
        const index = Math.round(fraction * (hours.length - 1));
        return <text key={fraction} x={plot.x(index)} y={246}
          textAnchor={fraction === 0 ? "start" : fraction === 1 ? "end" : "middle"}>
          {hourLabel(hours[index].timestamp)}
        </text>;
      })}
    </svg>
  );
}

function StorageChart({ hours }: { hours: EnergyHour[] }) {
  const { ref, width } = useChartWidth();
  const maximum = Math.max(1, ...hours.map((row) => row.battery_state_mwh));
  const points = hours.map((row, index) =>
    `${LEFT + index / Math.max(1, hours.length - 1) * (width - LEFT - RIGHT)},${70 - row.battery_state_mwh / maximum * 48}`,
  ).join(" ");
  return (
    <svg ref={ref} className="energy-storage-chart" viewBox={`0 0 ${width} 90`} role="img" aria-label="Battery state of charge across the trace">
      <title>Battery energy, carried between hours rather than reset daily</title>
      <line x1={LEFT} x2={width - RIGHT} y1={70} y2={70} className="energy-gridline" />
      <text x={LEFT - 10} y={26} textAnchor="end">{maximum.toFixed(1)}</text>
      <text x={LEFT - 10} y={73} textAnchor="end">0</text>
      <polyline points={points} stroke="#55d5b2" strokeWidth={2.5} fill="none" />
    </svg>
  );
}

export function EnergyCharts({ result, selectedHour, onSelectHour }: {
  result: CouplingResult;
  selectedHour?: number;
  onSelectHour?: (index: number) => void;
}) {
  const [day, setDay] = useState("0");
  const [cursor, setCursor] = useState(0);
  const visibleDay = day === "week" ? "week" : selectedHour === undefined ? day : String(Math.floor(selectedHour / 24));
  const hours = useMemo(() => visibleDay === "week"
    ? result.hourly_trace
    : result.hourly_trace.slice(Number(visibleDay) * 24, (Number(visibleDay) + 1) * 24),
  [visibleDay, result.hourly_trace]);
  const currentCursor = selectedHour === undefined ? cursor : visibleDay === "week" ? selectedHour : selectedHour % 24;
  const selected = Math.min(currentCursor, Math.max(0, hours.length - 1));
  const select = (index: number) => {
    if (onSelectHour) onSelectHour((visibleDay === "week" ? 0 : Number(visibleDay) * 24) + index);
    else setCursor(index);
  };
  const hour = hours[selected];
  if (!hour) return <p role="alert">The result did not include the requested hourly trace.</p>;
  return (
    <section className="energy-card energy-chart-card">
      <div className="energy-card-heading">
        <div><span className="energy-kicker">Hourly matching</span><h2>Where the electricity comes from</h2></div>
        <label className="energy-field energy-day-select">
          <span>Trace window</span>
          <select value={visibleDay} data-testid="trace-window" onChange={(event) => {
            const next = event.currentTarget.value;
            setDay(next); setCursor(0);
            if (onSelectHour && next !== "week") onSelectHour(Number(next) * 24 + (selectedHour ?? 0) % 24);
          }}>
            {Array.from({ length: Math.ceil(result.hourly_trace.length / 24) }, (_, index) => (
              <option value={String(index)} key={index}>
                {result.hourly_trace[index * 24].timestamp.slice(0, 10)}
              </option>
            ))}
            <option value="week">Full seven-day trace</option>
          </select>
        </label>
      </div>
      <p className="energy-help">{result.provenance.trace_label} Synthetic site clock; no DST.</p>
      <SupplyChart hours={hours} selected={selected} onSelect={select} />
      <div className="energy-source-legend">
        {SOURCES.map((source) => (
          <span key={source.key}><i style={{ background: source.color }} />{source.label}</span>
        ))}
        <span><i className="energy-line-key" />Required load</span>
        <span><i className="energy-line-key dashed" />Original load</span>
      </div>
      <label className="energy-hour-selector">
        <span>Inspect hour <strong>{hourLabel(hour.timestamp)}</strong></span>
        <input type="range" min={0} max={hours.length - 1} step={1} value={selected}
          data-testid="inspect-hour" onChange={(event) => select(event.currentTarget.valueAsNumber)} />
      </label>
      <div className="energy-hour-stats" aria-live="polite">
        <div><span>Required</span><b>{hour.required_load_mw.toFixed(2)} MW</b></div>
        <div><span>Grid import</span><b>{hour.grid_to_load_mw.toFixed(2)} MW</b></div>
        <div><span>Battery delivery</span><b>{hour.battery_to_load_mw.toFixed(2)} MW</b></div>
        <div className={hour.unserved_mw > 0.000001 ? "energy-danger-text" : ""}>
          <span>Unserved</span><b>{hour.unserved_mw.toFixed(2)} MW</b>
        </div>
      </div>
      <div className="energy-storage-heading">
        <h3>Stored energy</h3><span>{hour.battery_state_mwh.toFixed(2)} MWh at selected hour</span>
      </div>
      <StorageChart hours={hours} />
      {hours.every((row) => row.battery_state_mwh < 0.000001) && (
        <p className="energy-help">Storage stays empty in this window. It only charges when physical generation exceeds demand.</p>
      )}
      <details className="energy-advanced energy-hour-table">
        <summary>Selected-hour energy and water ledger</summary>
        <dl>
          {SOURCES.map((source) => <div key={source.key}><dt>{source.label}</dt><dd>{hour[source.key].toFixed(3)} MW</dd></div>)}
          <div><dt>Charging</dt><dd>{hour.battery_charge_mw.toFixed(3)} MW</dd></div>
          <div><dt>Export</dt><dd>{hour.grid_export_mw.toFixed(3)} MW</dd></div>
          <div><dt>Curtailed availability</dt><dd>{hour.curtailed_mw.toFixed(3)} MW</dd></div>
          <div><dt>Baseline grid import</dt><dd>{hour.baseline_grid_import_mw.toFixed(3)} MW</dd></div>
          <div><dt>Baseline unserved</dt><dd>{hour.baseline_unserved_mw.toFixed(3)} MW</dd></div>
          <div><dt>Ambient temperature</dt><dd>{hour.ambient_c.toFixed(1)} C</dd></div>
          <div><dt>Grid intensity</dt><dd>{hour.grid_carbon_g_per_kwh.toFixed(1)} gCO2e/kWh</dd></div>
          <div><dt>Cooling-water consumption requirement</dt><dd>{hour.cooling_water_consumption_l.toLocaleString(undefined, { maximumFractionDigits: 0 })} L</dd></div>
        </dl>
      </details>
    </section>
  );
}
