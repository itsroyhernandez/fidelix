import { useMemo, useState } from "react";

const TIERS = [
  { max: 500, id: "start" },
  { max: 3000, id: "pulse" },
  { max: 25000, id: "hyper" },
];

// Slider interactivo: recomienda el plan segun cuantos clientes activos tenga el negocio.
export default function PlanFinder({ plans, onPick }) {
  const [value, setValue] = useState(400);

  const recommended = useMemo(() => {
    const tier = TIERS.find((t) => value <= t.max) || TIERS[TIERS.length - 1];
    return plans.find((p) => p.id === tier.id);
  }, [value, plans]);

  if (!plans.length) return null;

  return (
    <div className="plan-finder">
      <label className="pf-label">
        ¿Cuántos clientes activos tenés hoy?{" "}
        <span className="pf-value">{value.toLocaleString("es-CR")}</span>
      </label>
      <input
        type="range"
        min="10"
        max="25000"
        step="10"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="pf-slider"
        style={{ "--pct": `${(value / 25000) * 100}%` }}
      />
      {recommended && (
        <div className="pf-result">
          <span>
            Te recomendamos <b>{recommended.name}</b> — ${recommended.monthlyUsd}/mes
          </span>
          <button className="btn primary sm" onClick={() => onPick?.(recommended)}>
            Elegir {recommended.name}
          </button>
        </div>
      )}
    </div>
  );
}

export { TIERS };
