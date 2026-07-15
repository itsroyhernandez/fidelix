import { useEffect, useState } from "react";
import { api } from "../api.js";
import Icon from "../components/Icon.jsx";

const TABS = [
  ["overview", "Resumen", "chart"],
  ["brands", "Marcas", "building"],
  ["billing", "Facturación", "card"],
];

const TIER_LABEL = { START: "Start · $49", PULSE: "Pulse · $119", HYPER: "Hyper · $349" };

// Panel Movix: operacion completa de la plataforma.
export default function SuperDashboard({ onImpersonate }) {
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [detail, setDetail] = useState(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const [o, t] = await Promise.all([api("/super/overview"), api("/super/tenants")]);
    setOverview(o.overview);
    setTenants(t.tenants);
  }
  useEffect(() => { load(); }, []);

  async function patchTenant(id, body, okMsg) {
    setMsg("");
    try {
      await api(`/super/tenants/${id}`, { method: "PATCH", body });
      setMsg(okMsg);
      load();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function impersonate(t) {
    const d = await api(`/super/tenants/${t.id}/impersonate`, { method: "POST" });
    onImpersonate?.(d.token, t.name);
  }

  async function openUsers(t) {
    const d = await api(`/super/tenants/${t.id}/users`);
    setDetail({ tenant: t, ...d });
  }

  return (
    <div className="stack">
      <div className="row between">
        <h2>Panel Movix</h2>
        <span className="muted tiny">Operador de la plataforma</span>
      </div>

      <div className="tabs scroll-tabs">
        {TABS.map(([key, label, icon]) => (
          <button key={key} className={tab === key ? "tab active" : "tab"} onClick={() => setTab(key)}>
            <Icon name={icon} size={16} /> {label}
          </button>
        ))}
      </div>

      {msg && <div className="report-msg">{msg}</div>}

      {tab === "overview" && overview && <Overview o={overview} />}
      {tab === "brands" && (
        <Brands tenants={tenants} onUsers={openUsers} onImpersonate={impersonate} onPatch={patchTenant} />
      )}
      {tab === "billing" && <Billing tenants={tenants} onPatch={patchTenant} />}

      {detail && <UsersModal detail={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function Overview({ o }) {
  const cards = [
    ["building", "Marcas", o.tenants, "brick"],
    ["user", "Usuarios", o.users, "bronze"],
    ["card", "Tarjetas", o.cards, "pine"],
  ];
  return (
    <div className="stack">
      <div className="stat-grid">
        {cards.map(([icon, label, value, tone]) => (
          <div key={label} className={`stat-card tone-${tone}`}>
            <span className="stat-ico"><Icon name={icon} size={20} /></span>
            <div className="stat-value">{value}</div>
            <div className="stat-label muted">{label}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Facturación mensual</h3>
        <div className="mrr-row">
          <div>
            <div className="mrr-big">${o.mrr}</div>
            <div className="muted tiny">MRR activo (planes cobrando)</div>
          </div>
          <div>
            <div className="mrr-big muted-num">${o.potentialMrr}</div>
            <div className="muted tiny">Potencial (pruebas en curso)</div>
          </div>
        </div>
        <p className="muted tiny">
          {o.actives} activa(s) · {o.trials} en prueba · {o.expired} vencida(s). Los cobros
          automáticos (tarjeta/PayPal) están pendientes de conectar: activá los planes desde
          Facturación al recibir el pago por SINPE o transferencia.
        </p>
      </div>
    </div>
  );
}

function Brands({ tenants, onUsers, onImpersonate, onPatch }) {
  const [q, setQ] = useState("");
  const list = tenants.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="stack">
      <input className="input" placeholder="Buscar marca…" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.map((t) => (
        <div key={t.id} className="prog-row">
          <div>
            <div className="lc-title">{t.name}</div>
            <div className="muted tiny">
              <span className={`plan-pill ${t.plan.toLowerCase()}`}>{planLabel(t)}</span>{" "}
              · {TIER_LABEL[t.planTier]} · {t.users} usuarios · {t.programs} programa(s)
            </div>
            <div className="row op-actions">
              <button className="btn ghost sm" onClick={() => onUsers(t)}>Usuarios</button>
              <button className="btn primary sm" onClick={() => onImpersonate(t)}>Entrar como dueño</button>
              {t.plan !== "ACTIVE" && (
                <button className="btn ghost sm ok-line" onClick={() => onPatch(t.id, { plan: "ACTIVE" }, `${t.name}: plan activado.`)}>
                  Activar
                </button>
              )}
              {t.plan === "TRIAL" && (
                <button className="btn ghost sm" onClick={() => onPatch(t.id, { extendTrialDays: 3 }, `${t.name}: prueba extendida 3 días.`)}>
                  +3 días
                </button>
              )}
              {t.plan === "ACTIVE" && (
                <button className="btn ghost sm danger-line" onClick={() => onPatch(t.id, { plan: "EXPIRED" }, `${t.name}: plan suspendido.`)}>
                  Suspender
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      {list.length === 0 && <p className="muted">Sin marcas que coincidan.</p>}
    </div>
  );
}

function Billing({ tenants, onPatch }) {
  const totalMrr = tenants.reduce((s, t) => s + t.mrr, 0);
  return (
    <div className="stack">
      <div className="panel">
        <div className="row between">
          <b>MRR total activo</b>
          <b className="mrr-inline">${totalMrr}/mes</b>
        </div>
        <p className="muted tiny" style={{ marginBottom: 0 }}>
          Cobro automático pendiente de Stripe/PayPal. Mientras: recibís SINPE/transferencia y activás aquí.
        </p>
      </div>
      <div className="tblwrap-dark">
        <table className="table">
          <thead>
            <tr><th>Marca</th><th>Tarifa</th><th>Estado</th><th>MRR</th><th>Acción</th></tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>
                  <select
                    className="input sel-sm"
                    value={t.planTier}
                    onChange={(e) => onPatch(t.id, { planTier: e.target.value }, `${t.name}: tarifa → ${e.target.value}.`)}
                  >
                    <option value="START">Start $49</option>
                    <option value="PULSE">Pulse $119</option>
                    <option value="HYPER">Hyper $349</option>
                  </select>
                </td>
                <td><span className={`plan-pill ${t.plan.toLowerCase()}`}>{planLabel(t)}</span></td>
                <td className="mono">{t.mrr ? `$${t.mrr}` : "—"}</td>
                <td>
                  {t.plan === "ACTIVE" ? (
                    <button className="btn ghost sm danger-line" onClick={() => onPatch(t.id, { plan: "EXPIRED" }, `${t.name}: suspendida.`)}>Suspender</button>
                  ) : (
                    <button className="btn ghost sm ok-line" onClick={() => onPatch(t.id, { plan: "ACTIVE" }, `${t.name}: pago registrado, plan activo.`)}>Registrar pago</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersModal({ detail, onClose }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h3>{detail.tenant.name}</h3>
          <button className="btn ghost sm" onClick={onClose}>✕</button>
        </div>
        <h4>Equipo de la marca</h4>
        <UserTable users={detail.team} />
        <h4 className="mt">Clientes finales</h4>
        <UserTable users={detail.customers} />
      </div>
    </div>
  );
}

function UserTable({ users }) {
  if (!users || users.length === 0) return <p className="muted tiny">Ninguno.</p>;
  return (
    <table className="table">
      <thead>
        <tr><th>Nombre</th><th>Rol</th><th>Verif.</th></tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <td>{u.name}<br /><span className="muted tiny">{u.email}</span></td>
            <td>{u.role}</td>
            <td>{u.emailVerified ? "✓" : "—"}</td>
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
