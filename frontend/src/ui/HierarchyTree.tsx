import { useStore } from "../data/store";

export function HierarchyTree() {
  const model = useStore((s) => s.model)!;
  const selection = useStore((s) => s.selection);
  const select = useStore((s) => s.select);

  const selRack = selection.kind === "rack" ? selection.id
    : selection.kind === "server" || selection.kind === "gpu" ? selection.id.split("-srv-")[0] : null;
  const selServer = selection.kind === "server" ? selection.id
    : selection.kind === "gpu" ? selection.id.split("-gpu-")[0] : null;

  const row = (kind: any, id: string, label: string, depth: number) => (
    <div key={id}
      className={`tree-row d${depth} ${selection.kind === kind && selection.id === id ? "sel" : ""}`}
      onClick={() => select(kind, id)}>
      {label}
    </div>
  );

  return (
    <div className="tree">
      {row("facility", model.facility.id, `▣ ${model.facility.name}`, 0)}
      {model.halls.map((h) => (
        <div key={h.id}>
          {row("hall", h.id, `▤ ${h.name} · ${h.rack_capacity} racks`, 1)}
          <div className="rack-list">
            {model.racks.map((r) => (
              <div key={r.id}>
                {row("rack", r.id, `▮ ${r.id}`, 2)}
                {selRack === r.id && model.servers.filter((s) => s.rack_id === r.id).map((s) => (
                  <div key={s.id}>
                    {row("server", s.id, `▪ ${s.id.split("-").slice(-2).join("-")}`, 3)}
                    {selServer === s.id && model.gpus.filter((g) => g.server_id === s.id).map((g) => (
                      row("gpu", g.id, `· gpu-${g.id.split("-gpu-")[1]} (${g.model})`, 4)
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Breadcrumb() {
  const model = useStore((s) => s.model)!;
  const selection = useStore((s) => s.selection);
  const select = useStore((s) => s.select);

  const crumbs: { kind: any; id: string; label: string }[] = [
    { kind: "facility", id: model.facility.id, label: model.facility.name },
    { kind: "hall", id: "hall-0", label: "Hall A" },
  ];
  if (selection.kind !== "facility" && selection.kind !== "hall") {
    const rackId = selection.kind === "rack" ? selection.id : selection.id.split("-srv-")[0];
    crumbs.push({ kind: "rack", id: rackId, label: rackId });
    if (selection.kind === "server" || selection.kind === "gpu") {
      const serverId = selection.kind === "server" ? selection.id : selection.id.split("-gpu-")[0];
      crumbs.push({ kind: "server", id: serverId, label: serverId.split("-").slice(-2).join("-") });
    }
    if (selection.kind === "gpu") {
      crumbs.push({ kind: "gpu", id: selection.id, label: `gpu-${selection.id.split("-gpu-")[1]}` });
    }
  }

  return (
    <div className="breadcrumb">
      {crumbs.map((c, i) => (
        <span key={c.id}>
          {i > 0 && <span className="sep">/</span>}
          <button onClick={() => select(c.kind, c.id)}
            className={i === crumbs.length - 1 ? "cur" : ""}>{c.label}</button>
        </span>
      ))}
    </div>
  );
}
