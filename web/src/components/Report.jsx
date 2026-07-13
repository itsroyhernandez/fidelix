import { useEffect, useState } from "react";
import { api } from "../api.js";

// Vista del reporte mensual de la marca (el mismo que se envía por correo).
export default function Report() {
  const [report, setReport] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/tenants/me/report").then((d) => setReport(d.report)).catch(() => {});
  }, []);

  async function send() {
    setBusy(true);
    setMsg("");
    try {
      const d = await api("/tenants/me/report/send", { method: "POST" });
      setMsg(d.delivered
        ? `Reporte enviado a ${d.to}.`
        : `Modo demo: el reporte se generó para ${d.to}. Conectá un proveedor de correo para el envío real.`);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!report) return <div className="muted">Cargando reporte…</div>;

  const s = report.stats;
  const cards = [
    ["Clientes", s.customers],
    ["Sellos entregados", s.stampsGiven],
    ["Canjes", s.redeemed],
    ["Retención", `${s.redemptionRate}%`],
  ];

  return (
    <div className="stack">
      <div className="row between">
        <h2>Reporte mensual</h2>
        <button className="btn primary sm" onClick={send} disabled={busy}>
          {busy ? "…" : "✉ Enviarme el reporte"}
        </button>
      </div>
      <p className="muted tiny">
        Automático el primer día de cada mes. Acá lo ves cuando quieras y lo podés reenviar.
      </p>

      {/* Reporte con branding, montado sobre un talón de papel como el resto del sistema */}
      <div className="report-doc" style={{ "--card": report.brand.primary, "--accent": report.brand.accent }}>
        <div className="ticket-perf top" aria-hidden />
        <div className="report-doc-body">
          <div className="report-doc-head">
            <div>
              <div className="rd-brand">{report.brand.emoji} {report.brand.name}</div>
              <div className="muted tiny">Periodo: {report.period}</div>
            </div>
            <div className="rd-logo">
              {report.brand.logo ? <img src={report.brand.logo} alt="" /> : <span>{report.brand.emoji}</span>}
            </div>
          </div>

          <div className="rd-grid">
            {cards.map(([label, value]) => (
              <div key={label} className="rd-cell">
                <b>{value}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="rd-foot muted tiny">
            {s.programs} programa(s) · {s.active} en progreso · {s.completed} listas para canje
          </div>
        </div>
        <div className="ticket-perf bottom" aria-hidden />
      </div>

      {msg && <div className="report-msg">{msg}</div>}
    </div>
  );
}
