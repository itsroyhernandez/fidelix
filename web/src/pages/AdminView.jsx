import { useEffect, useState } from "react";
import { api } from "../api.js";
import { QRCodeCanvas } from "qrcode.react";
import ScanPanel from "./ScanPanel.jsx";
import Stats from "../components/Stats.jsx";
import Branding from "../components/Branding.jsx";
import Report from "../components/Report.jsx";
import Icon from "../components/Icon.jsx";

const TABS = [
  ["stats", "Resumen", "chart"],
  ["programs", "Programas", "target"],
  ["brand", "Marca", "palette"],
  ["scan", "Escanear", "scan"],
  ["report", "Reportes", "mail"],
];

export default function AdminView({ tenant, onTenant }) {
  const [tab, setTab] = useState("stats");
  return (
    <div className="stack">
      <div className="tabs scroll-tabs">
        {TABS.map(([key, label, icon]) => (
          <button key={key} className={tab === key ? "tab active" : "tab"} onClick={() => setTab(key)}>
            <Icon name={icon} size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "stats" && <Stats />}
      {tab === "programs" && <Programs />}
      {tab === "brand" && <Branding tenant={tenant} onTenant={onTenant} />}
      {tab === "scan" && <ScanPanel />}
      {tab === "report" && <Report />}
    </div>
  );
}

const EMPTY = {
  name: "",
  description: "",
  type: "STAMP",
  goal: 10,
  rewardText: "",
  emoji: "⭐",
  active: true,
};

function Programs() {
  const [programs, setPrograms] = useState([]);
  const [editing, setEditing] = useState(null);
  const [customers, setCustomers] = useState(null);
  const [copied, setCopied] = useState("");

  async function load() {
    const d = await api("/programs");
    setPrograms(d.programs);
  }
  useEffect(() => {
    load();
  }, []);

  async function save(form) {
    const body = { ...form, goal: Number(form.goal) };
    if (form.id) await api(`/programs/${form.id}`, { method: "PUT", body });
    else await api("/programs", { method: "POST", body });
    setEditing(null);
    load();
  }

  async function viewCustomers(p) {
    const d = await api(`/programs/${p.id}/customers`);
    setCustomers({ program: p, ...d });
  }
  async function reloadCustomers() {
    if (!customers) return;
    const d = await api(`/programs/${customers.program.id}/customers`);
    setCustomers((c) => ({ ...c, ...d }));
  }

  function copyCode(code) {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <div className="stack">
      <div className="row between">
        <h2>Programas de lealtad</h2>
        <button className="btn primary sm" onClick={() => setEditing({ ...EMPTY })}>
          + Nuevo
        </button>
      </div>

      {programs.map((p) => (
        <div key={p.id} className="prog-row">
          <div>
            <div className="lc-title">
              {p.emoji} {p.name} {!p.active && <span className="muted tiny">(inactivo)</span>}
            </div>
            <div className="muted tiny">
              {p.type === "STAMP" ? "Sellos" : "Puntos"} · meta {p.goal} · 🎁 {p.rewardText}
            </div>
            <button className="code-chip" onClick={() => copyCode(p.code)} title="Copiar código">
              Código: <b>{p.code}</b> {copied === p.code ? "✓ copiado" : "⧉"}
            </button>
          </div>
          <div className="row">
            <button className="btn ghost sm" onClick={() => viewCustomers(p)}>
              Clientes
            </button>
            <button className="btn ghost sm" onClick={() => setEditing({ ...p })}>
              Editar
            </button>
          </div>
        </div>
      ))}
      {programs.length === 0 && <p className="muted">Aún no hay programas. Creá el primero.</p>}

      {editing && <ProgramForm initial={editing} onCancel={() => setEditing(null)} onSave={save} />}

      {customers && (
        <div className="modal" onClick={() => setCustomers(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <h3>Clientes · {customers.program.name}</h3>
              <button className="btn ghost sm" onClick={() => setCustomers(null)}>
                ✕
              </button>
            </div>
            <p className="muted tiny">{customers.total} inscritos</p>

            <AddCustomer program={customers.program} onAdded={reloadCustomers} />

            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Progreso</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {customers.customers.map((c) => (
                  <tr key={c.cardId}>
                    <td>
                      {c.name} {c.verified ? "✅" : "⚠️"}
                      <br />
                      <span className="muted tiny">{c.email}</span>
                    </td>
                    <td>
                      {c.balance} / {c.goal}
                    </td>
                    <td>{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Alta manual de un cliente (walk-in en el mostrador).
function AddCustomer({ program, onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", balance: 0 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const d = await api(`/programs/${program.id}/customers`, {
        method: "POST",
        body: { name: form.name, email: form.email.trim(), balance: Number(form.balance) || 0 },
      });
      setResult(d);
      setForm({ name: "", email: "", balance: 0 });
      onAdded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const c = result.customer;
    return (
      <div className="add-done">
        <div className="row between">
          <b>✓ {c.name} agregado</b>
          <button className="link" onClick={() => setResult(null)}>Agregar otro</button>
        </div>
        <div className="qr-box">
          <QRCodeCanvas value={c.token} size={130} includeMargin bgColor="#ffffff" />
          <p className="tiny muted">Este es el QR del cliente para sumar sellos en caja.</p>
        </div>
        {result.credentials && (
          <div className="creds">
            <p className="tiny">Cuenta creada. Pasale estos datos para que entre desde su teléfono:</p>
            <div className="cred-row"><span>Correo</span><code>{result.credentials.email}</code></div>
            <div className="cred-row"><span>Contraseña temporal</span><code>{result.credentials.tempPassword}</code></div>
          </div>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <button className="btn primary sm add-toggle" onClick={() => setOpen(true)}>
        + Agregar cliente
      </button>
    );
  }

  return (
    <form className="add-form" onSubmit={submit}>
      <div className="row">
        <input className="input" placeholder="Nombre del cliente" value={form.name} onChange={set("name")} required />
        <input className="input" type="email" placeholder="correo@cliente.com" value={form.email} onChange={set("email")} required />
      </div>
      <div className="row">
        <input className="input" type="number" min="0" max={program.goal} placeholder="Sellos iniciales (0)" value={form.balance} onChange={set("balance")} />
        <button className="btn primary" disabled={busy}>{busy ? "…" : "Agregar"}</button>
        <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
      {error && <div className="error">{error}</div>}
    </form>
  );
}

const EMOJIS = ["⭐", "☕", "🍰", "🍔", "🍕", "🍦", "🍩", "🌮", "🎁", "💈", "💅", "🎀"];

function ProgramForm({ initial, onCancel, onSave }) {
  const [f, setF] = useState({ ...initial });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="modal" onClick={onCancel}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        <h3>{f.id ? "Editar programa" : "Nuevo programa"}</h3>
        <label className="label">Nombre</label>
        <input className="input" value={f.name} onChange={set("name")} />
        <label className="label">Descripción</label>
        <input className="input" value={f.description} onChange={set("description")} />

        <div className="row">
          <div className="col">
            <label className="label">Tipo</label>
            <select className="input" value={f.type} onChange={set("type")}>
              <option value="STAMP">Sellos</option>
              <option value="POINTS">Puntos</option>
            </select>
          </div>
          <div className="col">
            <label className="label">Meta</label>
            <input className="input" type="number" min="1" value={f.goal} onChange={set("goal")} />
          </div>
        </div>

        <label className="label">Recompensa</label>
        <input className="input" value={f.rewardText} onChange={set("rewardText")} placeholder="Ej: 1 café gratis" />

        <label className="label">Emoji / ícono</label>
        <div className="emoji-picker">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className={`emoji-btn ${f.emoji === e ? "on" : ""}`}
              onClick={() => setF({ ...f, emoji: e })}
            >
              {e}
            </button>
          ))}
        </div>

        <label className="label">
          <input
            type="checkbox"
            checked={f.active}
            onChange={(e) => setF({ ...f, active: e.target.checked })}
          />{" "}
          Activo
        </label>

        <div className="row between mt">
          <button className="btn ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn primary" onClick={() => onSave(f)}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
