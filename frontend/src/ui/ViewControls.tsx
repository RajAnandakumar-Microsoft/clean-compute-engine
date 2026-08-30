import { useStore } from "../data/store";

export function ViewControls() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  return (
    <div className="view-controls">
      <button className={view === "ecosystem" ? "on" : ""} onClick={() => setView("ecosystem")}>◎ Ecosystem</button>
      <button className={view === "hall" ? "on" : ""} onClick={() => setView("hall")}>▤ Data hall</button>
    </div>
  );
}
