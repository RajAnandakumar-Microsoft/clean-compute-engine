import { useEffect, useRef, useState } from "react";

// A tiny self-contained sparkline that keeps a rolling history of a streamed value.
export function Sparkline({ value, width = 132, height = 30, color = "#37b6ff", cap = 80 }: {
  value: number; width?: number; height?: number; color?: string; cap?: number;
}) {
  const hist = useRef<number[]>([]);
  const [, force] = useState(0);
  useEffect(() => {
    hist.current.push(value);
    if (hist.current.length > cap) hist.current.shift();
    force((n) => n + 1);
  }, [value, cap]);

  const h = hist.current;
  if (h.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...h), max = Math.max(...h);
  const span = max - min || 1;
  const pts = h.map((v, i) => {
    const x = (i / (cap - 1)) * width;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={width} height={height} className="spark">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} />
    </svg>
  );
}
