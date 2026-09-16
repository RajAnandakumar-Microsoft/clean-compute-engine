import type { ReactNode } from "react";
import type { CapacityPhase, ForecastMetadata, ForecastScenario } from "../types/api";
import type { CouplingRequest, SupplyPortfolio } from "../types/energy";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  unit?: string;
  testId?: string;
}

function NumberField({
  label, value, onChange, min = 0, max, step = "any", unit, testId,
}: NumberFieldProps) {
  return (
    <label className="energy-field">
      <span>{label}{unit && <small>{unit}</small>}</span>
      <input
        type="number"
        required
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        step={step}
        data-testid={testId}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
    </label>
  );
}

function PercentField(props: Omit<NumberFieldProps, "unit">) {
  return (
    <NumberField
      {...props}
      value={Math.round(props.value * 10_000) / 100}
      max={props.max ?? 100}
      unit="%"
      onChange={(value) => props.onChange(value / 100)}
    />
  );
}

interface Choice<T> { value: T; label: string; }

function SelectField<T extends string>({
  label, value, options, onChange, testId,
}: {
  label: string;
  value: T;
  options: readonly Choice<T>[];
  onChange: (value: T) => void;
  testId?: string;
}) {
  return (
    <label className="energy-field">
      <span>{label}</span>
      <select
        value={value}
        data-testid={testId}
        onChange={(event) => {
          const choice = options.find((option) => option.value === event.currentTarget.value);
          if (!choice) throw new Error(`Unknown ${label} selection.`);
          onChange(choice.value);
        }}
      >
        {options.map((option) => (
          <option value={option.value} key={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function Section({
  title, number, children, open = false,
}: { title: string; number: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="energy-control-section" open={open}>
      <summary><span>{number}</span>{title}<i aria-hidden="true">+</i></summary>
      <div className="energy-control-content">{children}</div>
    </details>
  );
}

export function draftIssues(request: CouplingRequest): string[] {
  const issues: string[] = [];
  const finiteNumbers = (value: unknown): boolean => {
    if (typeof value === "number") return Number.isFinite(value);
    if (value && typeof value === "object") return Object.values(value).every(finiteNumbers);
    return true;
  };
  if (!finiteNumbers(request)) issues.push("Complete all numeric assumptions.");
  const workload = request.demand.workload_mix;
  const total = Object.values(workload).reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 1) > 0.001) issues.push("Workload shares must total 100%.");
  if (request.flexibility.fraction > workload.training + workload.batch_inference + 1e-9) {
    issues.push("Flexible work cannot exceed the training and batch share.");
  }
  const battery = request.supply;
  if ((battery.battery_power_mw === 0) !== (battery.battery_energy_mwh === 0)) {
    issues.push("Set both battery power and energy to zero, or give both positive values.");
  }
  if (request.demand.phases.some((phase) => phase.mature_utilization < phase.initial_utilization)) {
    issues.push("Mature utilization cannot be below starting utilization.");
  }
  if (!request.demand.start_date || request.demand.phases.some((phase) => !phase.start_date)) {
    issues.push("Choose a start date for the forecast and every capacity phase.");
  }
  return issues;
}

export function EnergyControls({
  request, metadata, onChange, disabled,
}: {
  request: CouplingRequest;
  metadata: ForecastMetadata;
  onChange: (request: CouplingRequest) => void;
  disabled: boolean;
}) {
  const demand = request.demand;
  const supply = request.supply;
  const updateDemand = (patch: Partial<ForecastScenario>) => onChange({
    ...request, demand: { ...demand, ...patch },
  });
  const updateSupply = <K extends keyof SupplyPortfolio>(key: K, value: SupplyPortfolio[K]) => {
    onChange({ ...request, supply: { ...supply, [key]: value } });
  };
  const updatePhase = (index: number, patch: Partial<CapacityPhase>) => updateDemand({
    phases: demand.phases.map((phase, position) => position === index ? { ...phase, ...patch } : phase),
  });
  const hardware = (["H100", "GB200", "A100", "MI300X"] as const).map((id) => ({
    value: id, label: metadata.hardware_profiles.find((item) => item.id === id)?.name ?? id,
  }));
  const locations = (["az-desert", "tx-plains", "va-loudoun", "pnw-hydro"] as const).map((id) => ({
    value: id, label: metadata.locations.find((item) => item.id === id)?.name ?? id,
  }));

  return (
    <fieldset className="energy-controls" disabled={disabled}>
      <legend className="energy-sr-only">Energy-system assumptions</legend>
      <Section number="01" title="Computing demand" open>
        <label className="energy-field">
          <span>Scenario name</span>
          <input required maxLength={120} value={demand.name}
            onChange={(event) => updateDemand({ name: event.currentTarget.value })} />
        </label>
        <SelectField label="Location archetype" value={demand.location} options={locations}
          onChange={(location) => updateDemand({ location })} />
        <div className="energy-fields-two">
          <label className="energy-field">
            <span>Forecast starts</span>
            <input type="month" required value={demand.start_date.slice(0, 7)}
              onChange={(event) => updateDemand({
                start_date: event.currentTarget.value ? `${event.currentTarget.value}-01` : "",
              })} />
          </label>
          <NumberField label="Horizon" unit="years" value={demand.horizon_years}
            min={1} max={10} step={1} testId="horizon-years"
            onChange={(horizon_years) => onChange({
              ...request,
              demand: { ...demand, horizon_years },
              trace_month: Number.isFinite(horizon_years)
                ? Math.min(request.trace_month, Math.max(1, horizon_years) * 12)
                : request.trace_month,
            })} />
        </div>
        {demand.phases.map((phase, index) => (
          <details className="energy-phase" key={index} open={index === 0}>
            <summary>{phase.name}<b>{phase.it_capacity_mw} MW IT</b></summary>
            <div className="energy-fields-two">
              <NumberField label="IT capacity" unit="MW" value={phase.it_capacity_mw}
                min={0.1} max={5000} testId={`phase-capacity-${index}`}
                onChange={(it_capacity_mw) => updatePhase(index, { it_capacity_mw })} />
              <label className="energy-field">
                <span>In service</span>
                <input type="date" required value={phase.start_date}
                  onChange={(event) => updatePhase(index, { start_date: event.currentTarget.value })} />
              </label>
            </div>
            <SelectField label="Hardware" value={phase.hardware_profile} options={hardware}
              onChange={(hardware_profile) => updatePhase(index, { hardware_profile })} />
            <div className="energy-fields-two">
              <PercentField label="Starting utilization" value={phase.initial_utilization} max={95}
                onChange={(initial_utilization) => updatePhase(index, { initial_utilization })} />
              <PercentField label="Mature utilization" value={phase.mature_utilization} min={1} max={98}
                onChange={(mature_utilization) => updatePhase(index, { mature_utilization })} />
              <NumberField label="Ramp" unit="months" min={1} max={84} step={1} value={phase.ramp_months}
                onChange={(ramp_months) => updatePhase(index, { ramp_months })} />
              <NumberField label="Refresh every" unit="years" min={1} max={12} step={1}
                value={phase.refresh_interval_years}
                onChange={(refresh_interval_years) => updatePhase(index, { refresh_interval_years })} />
            </div>
            <PercentField label="Efficiency gain per refresh" value={phase.refresh_efficiency_gain} max={50}
              onChange={(refresh_efficiency_gain) => updatePhase(index, { refresh_efficiency_gain })} />
            {demand.phases.length > 1 && (
              <button type="button" className="energy-text-button"
                onClick={() => updateDemand({ phases: demand.phases.filter((_, position) => position !== index) })}>
                Remove phase
              </button>
            )}
          </details>
        ))}
        <button type="button" className="energy-secondary" disabled={demand.phases.length >= 12 || !demand.start_date}
          onClick={() => {
            const year = Number(demand.start_date.slice(0, 4))
              + Math.min(demand.phases.length * 2, demand.horizon_years - 1);
            updateDemand({ phases: [...demand.phases, {
              name: `Phase ${demand.phases.length + 1}`, start_date: `${year}-01-01`,
              it_capacity_mw: 20, initial_utilization: 0.2, mature_utilization: 0.7,
              ramp_months: 18, hardware_profile: "H100", refresh_interval_years: 4,
              refresh_efficiency_gain: 0.1,
            }] });
          }}>+ Add capacity phase</button>
        <details className="energy-advanced">
          <summary>Workload mix</summary>
          {([
            ["training", "Training"], ["real_time_inference", "Real-time inference"],
            ["batch_inference", "Batch inference"], ["development", "Development"],
          ] as const).map(([key, label]) => (
            <PercentField key={key} label={label} value={demand.workload_mix[key]}
              onChange={(value) => updateDemand({ workload_mix: { ...demand.workload_mix, [key]: value } })} />
          ))}
          <p className="energy-help">Shares must total 100%. Inference is not automatically deferrable.</p>
        </details>
        <div className="energy-fields-two">
          <NumberField label="Design PUE" value={demand.facility.design_pue} min={1.02} max={2.5} step={0.01}
            onChange={(design_pue) => updateDemand({ facility: { ...demand.facility, design_pue } })} />
          <SelectField label="Internal cooling" value={demand.facility.cooling}
            options={[{ value: "air", label: "Air" }, { value: "liquid", label: "Liquid" }]}
            onChange={(cooling) => updateDemand({ facility: { ...demand.facility, cooling } })} />
        </div>
      </Section>

      <Section number="02" title="Supply & storage" open>
        <p className="energy-help">Physical on-site or direct-connected supply. No off-site PPA or certificate accounting.</p>
        <div className="energy-fields-two">
          <NumberField label="Solar" unit="MW" value={supply.solar_mw} max={10000} testId="solar-mw"
            onChange={(value) => updateSupply("solar_mw", value)} />
          <NumberField label="Wind" unit="MW" value={supply.wind_mw} max={10000} testId="wind-mw"
            onChange={(value) => updateSupply("wind_mw", value)} />
          <NumberField label="Hydroelectric" unit="MW" value={supply.hydro_mw} max={10000} testId="hydro-mw"
            onChange={(value) => updateSupply("hydro_mw", value)} />
          <PercentField label="Hydro availability" value={supply.hydro_capacity_factor}
            onChange={(value) => updateSupply("hydro_capacity_factor", value)} />
        </div>
        <SelectField label="Hydro operation" value={supply.hydro_mode} testId="hydro-mode"
          options={[
            { value: "run-of-river", label: "Run-of-river availability" },
            { value: "reservoir-budget", label: "Finite daily reservoir budget" },
          ]} onChange={(value) => updateSupply("hydro_mode", value)} />
        <div className="energy-fields-two">
          <NumberField label="Battery power" unit="MW" value={supply.battery_power_mw}
            max={10000} testId="battery-power-mw" onChange={(value) => updateSupply("battery_power_mw", value)} />
          <NumberField label="Battery energy" unit="MWh" value={supply.battery_energy_mwh}
            max={100000} testId="battery-energy-mwh" onChange={(value) => updateSupply("battery_energy_mwh", value)} />
        </div>
        <p className="energy-help">Starts empty. Charges from surplus generation; charge and losses carry across days.</p>
        <details className="energy-advanced">
          <summary>Firm supply, commissioning & source factors</summary>
          <div className="energy-fields-two">
            <NumberField label="Nuclear (not renewable)" unit="MW" value={supply.nuclear_mw}
              max={10000} testId="nuclear-mw" onChange={(value) => updateSupply("nuclear_mw", value)} />
            <NumberField label="Gas backup" unit="MW" value={supply.gas_mw}
              max={10000} testId="gas-mw" onChange={(value) => updateSupply("gas_mw", value)} />
            <PercentField label="Nuclear availability" value={supply.nuclear_availability}
              onChange={(value) => updateSupply("nuclear_availability", value)} />
            <PercentField label="Storage round-trip efficiency" min={1} value={supply.battery_round_trip_efficiency}
              onChange={(value) => updateSupply("battery_round_trip_efficiency", value)} />
          </div>
          <label className="energy-field">
            <span>Portfolio commissioning date <small>optional</small></span>
            <input type="date" value={supply.commissioning_date ?? ""}
              onChange={(event) => updateSupply("commissioning_date", event.currentTarget.value || null)} />
          </label>
          <p className="energy-help">Blank means forecast start. Existing plants age from their commissioning date.</p>
          <NumberField label="Hydro operational carbon" unit="gCO2e/kWh"
            value={supply.hydro_operational_g_per_kwh} max={2000}
            onChange={(value) => updateSupply("hydro_operational_g_per_kwh", value)} />
          <NumberField label="Gas operational carbon" unit="gCO2e/kWh"
            value={supply.gas_operational_g_per_kwh} max={2000}
            onChange={(value) => updateSupply("gas_operational_g_per_kwh", value)} />
        </details>
      </Section>

      <Section number="03" title="Grid & flexible work">
        <p className="energy-help">Both portfolios have the same grid limit. The baseline keeps the original work schedule.</p>
        <label className="energy-check">
          <input type="checkbox" checked={request.grid.import_limit_mw === null}
            data-testid="unlimited-grid"
            onChange={(event) => onChange({
              ...request, grid: { ...request.grid, import_limit_mw: event.currentTarget.checked ? null : 40 },
            })} />Unconstrained grid imports
        </label>
        <div className="energy-fields-two">
          {request.grid.import_limit_mw !== null && (
            <NumberField label="Grid import limit" unit="MW" value={request.grid.import_limit_mw}
              max={50000} testId="grid-import-limit"
              onChange={(import_limit_mw) => onChange({ ...request, grid: { ...request.grid, import_limit_mw } })} />
          )}
          <NumberField label="Grid export limit" unit="MW" value={request.grid.export_limit_mw} max={50000}
            onChange={(export_limit_mw) => onChange({ ...request, grid: { ...request.grid, export_limit_mw } })} />
          <NumberField label="Import tariff" unit="USD/kWh" value={request.grid.import_price_per_kwh} max={5}
            onChange={(import_price_per_kwh) => onChange({ ...request, grid: { ...request.grid, import_price_per_kwh } })} />
          <NumberField label="Export tariff" unit="USD/kWh" value={request.grid.export_price_per_kwh} max={5}
            onChange={(export_price_per_kwh) => onChange({ ...request, grid: { ...request.grid, export_price_per_kwh } })} />
        </div>
        <PercentField label="Deferrable computing work" max={80} value={request.flexibility.fraction}
          testId="flexible-fraction"
          onChange={(fraction) => onChange({ ...request, flexibility: { ...request.flexibility, fraction } })} />
        <NumberField label="Maximum delay" unit="hours" min={1} max={12} step={1}
          value={request.flexibility.max_delay_hours}
          onChange={(max_delay_hours) => onChange({
            ...request, flexibility: { ...request.flexibility, max_delay_hours },
          })} />
        <p className="energy-help">At most {((demand.workload_mix.training + demand.workload_mix.batch_inference) * 100).toFixed(0)}%
          {" "}eligible in this mix. Same-day, work-preserving heuristic with future synthetic availability.
          Not a job scheduler or optimal plan.</p>
      </Section>

      <Section number="04" title="Cooling & hydro water">
        <SelectField label="External heat rejection" value={request.cooling_water.heat_rejection}
          testId="heat-rejection"
          options={[
            { value: "dry", label: "Dry rejection" },
            { value: "evaporative", label: "Evaporative rejection" },
            { value: "hybrid", label: "Hybrid rejection" },
          ]} onChange={(heat_rejection) => onChange({
            ...request, cooling_water: { ...request.cooling_water, heat_rejection },
          })} />
        <p className="energy-help">Independent of air/liquid chip cooling. This changes water requirements, not design PUE automatically.</p>
        <NumberField label="Cooling consumption intensity" unit="L/IT kWh"
          value={request.cooling_water.consumption_l_per_it_kwh} max={10}
          onChange={(consumption_l_per_it_kwh) => onChange({
            ...request, cooling_water: { ...request.cooling_water, consumption_l_per_it_kwh },
          })} />
        <NumberField label="Withdrawal / consumption ratio" min={1} max={10}
          value={request.cooling_water.withdrawal_multiplier}
          onChange={(withdrawal_multiplier) => onChange({
            ...request, cooling_water: { ...request.cooling_water, withdrawal_multiplier },
          })} />
        <NumberField label="Water temperature sensitivity" unit="per C" max={0.2}
          value={request.cooling_water.temperature_sensitivity_per_c}
          onChange={(temperature_sensitivity_per_c) => onChange({
            ...request, cooling_water: { ...request.cooling_water, temperature_sensitivity_per_c },
          })} />
        <label className="energy-field">
          <span>Hydro net consumption <small>L/kWh, optional</small></span>
          <input type="number" min={0} max={1000} step="any" placeholder="Unknown, not zero"
            data-testid="hydro-water-intensity"
            value={supply.hydro_water_consumption_l_per_kwh !== null
              && Number.isFinite(supply.hydro_water_consumption_l_per_kwh)
              ? supply.hydro_water_consumption_l_per_kwh : ""}
            onChange={(event) => updateSupply("hydro_water_consumption_l_per_kwh",
              event.currentTarget.value === "" ? null : event.currentTarget.valueAsNumber)} />
        </label>
        <p className="energy-help">Turbine flow is not consumption. Unknown hydro water stays unknown; no total-water claim.</p>
      </Section>

      <Section number="05" title="Weather & run settings">
        <SelectField label="Synthetic weather case" value={request.weather_case} testId="weather-case"
          options={[
            { value: "typical", label: "Typical resource conditions" },
            { value: "hot-dry", label: "Hot and dry: cooling and hydro stress" },
            { value: "low-renewables", label: "Low renewable availability" },
          ]} onChange={(weather_case) => onChange({ ...request, weather_case })} />
        <div className="energy-fields-two">
          <NumberField label="Simulation paths" value={request.sample_count}
            min={32} max={128} step={1} testId="sample-count"
            onChange={(sample_count) => onChange({ ...request, sample_count })} />
          <NumberField label="Trace month" value={request.trace_month}
            min={1} max={demand.horizon_years * 12} step={1}
            onChange={(trace_month) => onChange({ ...request, trace_month })} />
        </div>
        <NumberField label="Random seed" value={request.seed} max={2147483647} step={1}
          onChange={(seed) => onChange({ ...request, seed })} />
        <p className="energy-help">Trace month is one-based from forecast start. P10/P50/P90 describe assumption variation, not calibrated probabilities.</p>
      </Section>
    </fieldset>
  );
}
