import { useEffect, useState } from "react";
import { api } from "../api.js";
import Icon from "../components/Icon.jsx";

// Panel Movix: TODAS las marcas y sus usuarios. Nadie mas ve esto.
export default function SuperDashboard() {
  const [overview, setOverview] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api("/super/overview").then((d) => setOverview(d.overview));
    api("/super/tenants").then((d) => setTenants(d.tenants));
  }, []);

  async function openTenant(t) {
    const d = await api(`/super/tenants/${t.id}/users`);
    setDetail({ tenant: t, ...d });
  }

  return (
    <div className="stack">
      <h2>Panel Movix</h2>
      <p className="muted tiny">
        Vista de desarrolladora. Cada marca y sus usuarios quedan aislados; solo vos ves este panel.
      </p>

      {overview && (
        <div className="stat-grid">
          <div className="stat-card tone-brick">
            <span className="stat-ico"><Icon name="building" size={20} /></span>
            <div className="stat-value">{overview.tenants}</div>
            <div className="stat-label muted">Marcas</div>
          </div>
          <div className="stat-card tone-bronze">
            <span className="stat-ico"><Icon name="user" size={20} /></span>
            <div className="stat-value">{overview.users}</div>
            <div className="stat-label muted">Usuarios</div>
          </div>
          <div className="stat-card tone-pine">
            <span className="stat-ico"><Icon name="card" size={20} /></span>
            <div className="stat-value">{overview.cards}</div>
            <div className="stat-label muted">Tarjetas</div>
          </div>
        </div>
      )}

      <h3>Marcas</h3>
      {tenants.map((t) => (
        <div key={t.id} className="prog-row">
          <div>
            <div className="lc-title">{t.name}</div>
            <div className="muted tiny">
              <span className={`plan-pill ${t.plan.toLowerCase()}`}>{planLabel(t)}</span> · {t.users} usuarios ·{" "}
              {t.programs} programas
            </div>
          </div>
          <button className="btn ghost sm" onClick={() => openTenant(t)}>
            Ver usuarios
          </button>
        </div>
      ))}
      {tenants.length === 0 && <p className="muted">Sin marcas todavía.</p>}

      {detail && (
        <div className="modal" onClick={() => setDetail(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <h3>{detail.tenant.name}</h3>
              <button className="btn ghost sm" onClick={() => setDetail(null)}>
                ✕
              </button>
            </div>

            <h4>Equipo de la marca</h4>
            <UserTable users={detail.team} />

            <h4 className="mt">Clientes finales</h4>
            <UserTable users={detail.customers} />
          </div>
        </div>
      )}
    </div>
  );
}

function UserTable({ users }) {
  if (!users || users.length === 0) return <p className="muted tiny">Ninguno.</p>;
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Rol</th>
          <th>Verif.</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <td>
              {u.name}
              <br />
              <span className="muted tiny">{u.email}</span>
            </td>
            <td>{u.role}</td>
            <td>{u.emailVerified ? "✅" : "⚠️"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function planLabel(t) {
  if (t.plan === "TRIAL") return `Prueba (${t.daysLeft}d)`;
  if (t.plan === "EXPIRED") return "Vencida";
  return "Activa";
}
