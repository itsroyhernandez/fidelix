import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { api } from "../api.js";

export default function CustomerView() {
  const [tab, setTab] = useState("cards");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const d = await api("/loyalty/cards");
    setCards(d.cards);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="stack">
      <div className="tabs">
        <button className={tab === "cards" ? "tab active" : "tab"} onClick={() => setTab("cards")}>
          Mis tarjetas
        </button>
        <button className={tab === "guide" ? "tab active" : "tab"} onClick={() => setTab("guide")}>
          Guía
        </button>
        <button className={tab === "support" ? "tab active" : "tab"} onClick={() => setTab("support")}>
          Soporte
        </button>
      </div>

      {tab === "cards" && (
        <>
          {loading ? (
            <div className="muted">Cargando tus tarjetas…</div>
          ) : (
            <>
              {cards.length === 0 && (
                <p className="muted">
                  Aún no tenés tarjetas. Pedí al negocio su <b>código de programa</b> para inscribirte.
                </p>
              )}
              {cards.map((c) => (
                <LoyaltyCard key={c.id} card={c} />
              ))}
              <EnrollBox onEnrolled={load} />
            </>
          )}
        </>
      )}

      {tab === "guide" && <Guide />}
      {tab === "support" && <Support cards={cards} />}
    </div>
  );
}

function LoyaltyCard({ card }) {
  const brand = card.brand || {};
  const primary = brand.primary || "#6d5efc";
  const accent = brand.accent || "#e0b877";
  const pct = Math.round((card.balance / card.program.goal) * 100);
  const done = card.status === "COMPLETED";
  const redeemed = card.status === "REDEEMED";

  return (
    <div className="loyalty-card" style={{ "--card": primary, "--accent": accent }}>
      <div className="lc-head">
        <div>
          <div className="lc-brand">
            {brand.emoji} {brand.name}
          </div>
          <div className="lc-title">
            {card.program.emoji} {card.program.name}
          </div>
          <div className="lc-reward">🎁 {card.program.rewardText}</div>
        </div>
        <span className={`badge ${done ? "ok" : redeemed ? "muted-badge" : ""}`}>
          {redeemed ? "Canjeada" : done ? "¡Lista!" : card.program.type === "STAMP" ? "Sellos" : "Puntos"}
        </span>
      </div>

      {card.program.type === "STAMP" ? (
        <div className="stamps">
          {Array.from({ length: card.program.goal }).map((_, i) => (
            <span key={i} className={`stamp ${i < card.balance ? "filled" : ""}`}>
              {i < card.balance ? card.program.emoji || "★" : ""}
            </span>
          ))}
        </div>
      ) : (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${pct}%` }} />
          <span className="progress-label">
            {card.balance} / {card.program.goal}
          </span>
        </div>
      )}

      {!redeemed && (
        <div className="qr-box">
          <QRCodeCanvas value={card.token} size={148} includeMargin bgColor="#ffffff" />
          <p className="tiny muted">Mostrá este código en caja para sumar</p>
        </div>
      )}

      <div className="wallet-row">
        <a className="btn ghost sm" href={`/api/wallet/apple/${card.id}`} target="_blank" rel="noreferrer">
           Apple Wallet
        </a>
        <a className="btn ghost sm" href={`/api/wallet/google/${card.id}`} target="_blank" rel="noreferrer">
          Google Wallet
        </a>
      </div>
    </div>
  );
}

function EnrollBox({ onEnrolled }) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  async function enroll(e) {
    e.preventDefault();
    setMsg("");
    try {
      await api("/loyalty/enroll", { method: "POST", body: { code: code.trim().toUpperCase() } });
      setCode("");
      onEnrolled();
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <form onSubmit={enroll} className="enroll">
      <h3>Inscribirme en un programa</h3>
      <div className="row">
        <input
          className="input"
          placeholder="Código del programa (ej: KIKU10)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button className="btn primary">Unirme</button>
      </div>
      {msg && <div className="error">{msg}</div>}
    </form>
  );
}

function Guide() {
  const steps = [
    ["1", "Creá tu cuenta", "Registrate con tu nombre, correo y contraseña."],
    ["2", "Verificá tu correo", "Meté el código de 6 dígitos que te llega. Así confirmamos que sos vos."],
    ["3", "Pedí el código del programa", "En el negocio te dan un código corto (ej: KIKU10)."],
    ["4", "Inscribite", "Escribí el código en 'Inscribirme en un programa' y unite."],
    ["5", "Mostrá tu QR", "Cada compra, mostrá tu código QR en caja para sumar tu sello o punto."],
    ["6", "Canjeá tu premio", "Al llegar a la meta, el negocio canjea tu recompensa. ¡Listo!"],
  ];
  return (
    <div className="panel">
      <h2>Cómo funciona</h2>
      <div className="steps">
        {steps.map(([n, t, d]) => (
          <div className="step" key={n}>
            <span className="step-num">{n}</span>
            <div>
              <b>{t}</b>
              <p className="muted tiny">{d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Support({ cards }) {
  const brands = [];
  const seen = new Set();
  cards.forEach((c) => {
    if (c.brand && !seen.has(c.brand.name)) {
      seen.add(c.brand.name);
      brands.push(c.brand);
    }
  });
  return (
    <div className="panel">
      <h2>Soporte</h2>
      <p className="muted">¿Algo no funciona? Escribinos y te ayudamos.</p>
      <a className="btn primary" href="mailto:soporte@movix.com">
        ✉ Contactar a soporte (Movix)
      </a>

      {brands.length > 0 && (
        <>
          <h3 className="mt">Contacto de tus negocios</h3>
          {brands.map((b) => (
            <div key={b.name} className="support-brand">
              <b>
                {b.emoji} {b.name}
              </b>
              <p className="muted tiny">Consultá directamente al negocio por sus canjes.</p>
            </div>
          ))}
        </>
      )}

      <h3 className="mt">Preguntas frecuentes</h3>
      <details className="faq">
        <summary>No me llega el código de verificación</summary>
        <p className="muted">Revisá spam, o usá "Reenviar código". En modo demo aparece en pantalla.</p>
      </details>
      <details className="faq">
        <summary>Perdí mi progreso</summary>
        <p className="muted">Tu tarjeta vive en tu cuenta; entrá con el mismo correo y ahí está.</p>
      </details>
      <details className="faq">
        <summary>¿Necesito instalar una app?</summary>
        <p className="muted">No. Fidelix funciona en el navegador de cualquier dispositivo.</p>
      </details>
    </div>
  );
}
