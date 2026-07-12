import { useEffect, useState } from "react";
import { api } from "../api.js";

const EMOJIS = ["🎁", "☕", "🍰", "🍔", "🍕", "🛍️", "✂️", "💅", "🏋", "🌮", "🍦", "✨"];

// 10 colores predefinidos (clic para elegir) + campo hex para color propio.
const PALETTE = [
  "#7c5cff", "#ff4d8d", "#f5b544", "#35c68a", "#3aa0ff",
  "#ff6b3d", "#c15cff", "#0ea5a5", "#e11d48", "#111827",
];

function SwatchPicker({ label, value, onChange }) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value || "");
  return (
    <div className="swatch-block">
      <label className="label">{label}</label>
      <div className="swatches">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch ${value === c ? "on" : ""}`}
            style={{ background: c }}
            onClick={() => onChange(c)}
            aria-label={c}
          />
        ))}
      </div>
      <div className="hex-row">
        <span className="hex-dot" style={{ background: isHex ? value : "#000" }} />
        <input
          className="input hex-input"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#7c5cff"
          maxLength={7}
        />
      </div>
    </div>
  );
}

export default function Branding({ tenant, onTenant }) {
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/tenants/me").then((d) => setF(d.tenant));
  }, []);

  if (!f) return <div className="muted">Cargando…</div>;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function onLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      setMsg("El logo debe pesar menos de 200KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setF({ ...f, logo: reader.result });
    reader.readAsDataURL(file);
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const d = await api("/tenants/me", {
        method: "PUT",
        body: {
          name: f.name,
          logo: f.logo,
          primaryColor: f.primaryColor,
          accentColor: f.accentColor,
          emoji: f.emoji,
          description: f.description,
          supportEmail: f.supportEmail,
          supportPhone: f.supportPhone,
        },
      });
      onTenant?.((prev) => ({ ...(prev || {}), ...d.tenant }));
      setMsg("Guardado ✓");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <h2>Mi marca</h2>

      {/* Vista previa en vivo */}
      <div className="brand-preview" style={{ "--card": f.primaryColor, "--accent": f.accentColor }}>
        <div className="bp-logo">
          {f.logo ? <img src={f.logo} alt="logo" /> : <span className="bp-emoji">{f.emoji}</span>}
        </div>
        <div>
          <div className="lc-title">{f.name}</div>
          <div className="lc-reward">{f.description || "Tu descripción aparece aquí"}</div>
        </div>
      </div>

      <div className="panel stack">
        <div>
          <label className="label">Nombre de la marca</label>
          <input className="input" value={f.name} onChange={set("name")} />
        </div>

        <div>
          <label className="label">Logo (opcional, &lt;200KB)</label>
          <input className="input" type="file" accept="image/*" onChange={onLogo} />
          {f.logo && (
            <button className="link" onClick={() => setF({ ...f, logo: "" })}>
              Quitar logo
            </button>
          )}
        </div>

        <SwatchPicker label="Color principal" value={f.primaryColor} onChange={(c) => setF({ ...f, primaryColor: c })} />
        <SwatchPicker label="Color acento" value={f.accentColor} onChange={(c) => setF({ ...f, accentColor: c })} />

        <div>
          <label className="label">Emoji de la marca</label>
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
        </div>

        <div>
          <label className="label">Descripción</label>
          <textarea className="input" rows={2} value={f.description} onChange={set("description")} />
        </div>

        <div className="row">
          <div className="col">
            <label className="label">Correo de soporte</label>
            <input className="input" value={f.supportEmail} onChange={set("supportEmail")} placeholder="soporte@tumarca.com" />
          </div>
          <div className="col">
            <label className="label">Teléfono</label>
            <input className="input" value={f.supportPhone} onChange={set("supportPhone")} placeholder="+506 ..." />
          </div>
        </div>

        {msg && <div className={msg === "Guardado ✓" ? "muted" : "error"}>{msg}</div>}
        <button className="btn primary" onClick={save} disabled={busy}>
          {busy ? "…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
