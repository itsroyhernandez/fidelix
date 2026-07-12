import { useEffect, useState } from "react";
import { api } from "../api.js";
import ScanPanel from "./ScanPanel.jsx";
import Stats from "../components/Stats.jsx";
import Branding from "../components/Branding.jsx";

export default function AdminView({ tenant, onTenant }) {
  const [tab, setTab] = useState("stats");
  return (
    <div className="stack">
      <div className="tabs scroll-tabs">
        <button className={tab === "stats" ? "tab active" : "tab"} onClick={() => setTab("stats")}>
          Resumen
        </button>
        <button className={tab === "programs" ? "tab active" : "tab"} onClick={() => setTab("programs")}>
          Programas
        </button>
        <button className={tab === "brand" ? "tab active" : "tab"} onClick={() => setTab("brand")}>
          Marca
        </button>
        <button className={tab === "scan" ? "tab active" : "tab"} onClick={() => setTab("scan")}>
          Escanear
        </button>
      </div>

      {tab === "stats" && <Stats />}
      {tab === "programs" && <Programs />}
      {tab === "brand" && <Branding tenant={tenant} onTenant={onTenant} />}
      {tab === "scan" && <ScanPanel />}
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

const EMOJIS = ["⭐", "☕", "🍰", "🍔", "🍕", "🎁", "💇", "💅", "🏋️", "🛍️", "🌮", "🍦"];

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
