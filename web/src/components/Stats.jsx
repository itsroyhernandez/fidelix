import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Stats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api("/tenants/me/stats").then((d) => setStats(d.stats));
  }, []);

  if (!stats) return <div className="muted">Cargando estadísticas…</div>;

  const cards = [
    ["Clientes", stats.customers, "👥"],
    ["Programas", stats.programs, "🎯"],
    ["En progreso", stats.active, "⏳"],
    ["Listas p/ canje", stats.completed, "✅"],
    ["Canjeadas", stats.redeemed, "🎁"],
    ["Sellos dados", stats.stampsGiven, "⭐"],
  ];

  return (
    <div className="stack">
      <h2>Resumen</h2>
      <div className="stat-grid">
        {cards.map(([label, value, emoji]) => (
          <div className="stat-card" key={label}>
            <div className="stat-emoji">{emoji}</div>
            <div className="stat-value">{value}</div>
            <div className="stat-label muted">{label}</div>
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="row between">
          <b>Tasa de canje</b>
          <b>{stats.redemptionRate}%</b>
        </div>
        <div className="progress mt">
          <div className="progress-bar" style={{ width: `${stats.redemptionRate}%` }} />
        </div>
        <p className="muted tiny mt">
          Porcentaje de clientes que ya canjearon su recompensa.
        </p>
      </div>
    </div>
  );
}
