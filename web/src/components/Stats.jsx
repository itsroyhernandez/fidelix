import { useEffect, useState } from "react";
import { api } from "../api.js";
import Icon from "./Icon.jsx";
import { useCountUp } from "../hooks/useCountUp.js";

function StatCard({ icon, label, value, tone }) {
  const [ref, shown] = useCountUp(value);
  return (
    <div ref={ref} className={`stat-card tone-${tone}`}>
      <span className="stat-ico"><Icon name={icon} size={20} /></span>
      <div className="stat-value">{shown}</div>
      <div className="stat-label muted">{label}</div>
    </div>
  );
}

export default function Stats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api("/tenants/me/stats").then((d) => setStats(d.stats));
  }, []);

  if (!stats) return <div className="muted">Cargando estadísticas…</div>;

  const cards = [
    ["users", "Clientes", stats.customers, "brick"],
    ["target", "Programas", stats.programs, "bronze"],
    ["progress", "En progreso", stats.active, "bronze"],
    ["check", "Listas p/ canje", stats.completed, "pine"],
    ["gift", "Canjeadas", stats.redeemed, "brick"],
    ["stamp", "Sellos dados", stats.stampsGiven, "bronze"],
  ];

  return (
    <div className="stack">
      <h2>Resumen</h2>
      <div className="stat-grid">
        {cards.map(([icon, label, value, tone]) => (
          <StatCard key={label} icon={icon} label={label} value={value} tone={tone} />
        ))}
      </div>
      <div className="panel">
        <div className="row between">
          <b>Tasa de canje</b>
          <b>{stats.redemptionRate}%</b>
        </div>
        <div className="progress mt">
          <div className="progress-bar anim" style={{ width: `${stats.redemptionRate}%` }} />
        </div>
        <p className="muted tiny mt">Porcentaje de clientes que ya canjearon su recompensa.</p>
      </div>
    </div>
  );
}
