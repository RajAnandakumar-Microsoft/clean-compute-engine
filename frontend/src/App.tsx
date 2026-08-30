import { useEffect, useState } from "react";
import { useStore } from "./data/store";
import { connectWs } from "./data/ws";
import { Scene } from "./three/Scene";
import { TopBar } from "./ui/TopBar";
import { TimeControls } from "./ui/TimeControls";
import { Inspector } from "./ui/Inspector";
import { HierarchyTree } from "./ui/HierarchyTree";
import { Legend, OverlayPicker, LensToggle } from "./ui/Legend";
import { Breadcrumb } from "./ui/HierarchyTree";
import { Toasts } from "./ui/Toasts";
import { ViewControls } from "./ui/ViewControls";
import { LifetimeImpact } from "./ui/LifetimeImpact";
import { DesignPanel } from "./ui/design/DesignPanel";
import { FinancePanel } from "./ui/finance/FinancePanel";
import { ComparePanel } from "./ui/compare/ComparePanel";
import { ForecastPanel } from "./ui/forecast/ForecastPanel";

type LeftTab = "explore" | "design";
type RightTab = "inspector" | "finance" | "compare" | "forecast";

export function App() {
  const model = useStore((s) => s.model);
  const init = useStore((s) => s.init);
  const [left, setLeft] = useState<LeftTab>("explore");
  const [right, setRight] = useState<RightTab>("inspector");

  useEffect(() => {
    init().catch((e) => console.error(e));
    const disconnect = connectWs();
    return disconnect;
  }, [init]);

  if (!model) {
    return <div className="loading">Booting The Clean Compute Engine…<br />
      <span>connecting to simulation backend on :8000</span></div>;
  }

  return (
    <div className="app">
      <TopBar />
      <div className="body">
        <aside className="left">
          <div className="tabs">
            <button className={left === "explore" ? "on" : ""} onClick={() => setLeft("explore")}>Explore</button>
            <button className={left === "design" ? "on" : ""} onClick={() => setLeft("design")}>Design</button>
          </div>
          <div className="panel-scroll">
            {left === "explore" ? <HierarchyTree /> : <DesignPanel />}
          </div>
          <LensToggle />
          <OverlayPicker />
        </aside>

        <main className="center">
          <Scene />
          <Breadcrumb />
          <ViewControls />
          <LifetimeImpact />
          <Legend />
        </main>

        <aside className="right">
          <div className="tabs">
            <button className={right === "inspector" ? "on" : ""} onClick={() => setRight("inspector")}>Inspector</button>
            <button className={right === "finance" ? "on" : ""} onClick={() => setRight("finance")}>Finance</button>
            <button className={right === "compare" ? "on" : ""} onClick={() => setRight("compare")}>Compare</button>
            <button className={right === "forecast" ? "on" : ""} onClick={() => setRight("forecast")}>Forecast</button>
          </div>
          <div className="panel-scroll">
            {right === "inspector" && <Inspector />}
            {right === "finance" && <FinancePanel />}
            {right === "compare" && <ComparePanel />}
            {right === "forecast" && <ForecastPanel />}
          </div>
        </aside>
      </div>
      <TimeControls />
      <Toasts />
    </div>
  );
}
