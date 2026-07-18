import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { api } from "../api.js";
import TiltCard from "../components/TiltCard.jsx";
import Icon from "../components/Icon.jsx";

const TABS = [
  ["cards", "Mis tarjetas", "card"],
  ["guide", "Guía", "stamp"],
  ["support", "Soporte", "mail"],
];

export default function CustomerView() {
  const [tab, setTab] = useState("cards");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bigQr, setBigQr] = useState(null); // tarjeta con el QR en grande

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
        {TABS.map(([key, label, icon]) => (
          <button key={key} className={tab === key ? "tab active" : "tab"} onClick={() => setTab(key)}>
            <Icon name={icon} size={16} /> {label}
          </button>
        ))}
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
                <LoyaltyCard key={c.id} card={c} onShowQr={() => setBigQr(c)} />
              ))}
              <EnrollBox onEnrolled={load} />
            </>
          )}
        </>
      )}

      {tab === "guide" && <Guide />}
      {tab === "support" && <Support cards={cards} />}

      {bigQr && <QrModal card={bigQr} onClose={() => setBigQr(null)} />}
    </div>
  );
}

function LoyaltyCard({ card, onShowQr }) {
  const brand = card.brand || {};
  const primary = brand.primary || "#b23a2e";
  const accent = brand.accent || "#9c7a3c";
  const goal = card.program.goal;
  const pct = Math.round((card.balance / goal) * 100);
  const done = card.status === "COMPLETED";
  const redeemed = card.status === "REDEEMED";
  const missing = Math.max(goal - card.balance, 0);
  const isBirthday = card.program.type === "BIRTHDAY";
  const unit = card.program.type === "STAMP" ? "sello" : "punto";

  return (
    <TiltCard className="loyalty-card" max={5} style={{ "--card": primary, "--accent": accent }}>
      <div>
        <div className="lc-head">
          <div>
            <div className="lc-brand">{brand.emoji} {brand.name}</div>
            <div className="lc-title">{card.program.emoji} {card.program.name}</div>
            <div className="lc-reward">🎁 {card.program.rewardText}</div>
          </div>
          <span className={`badge ${done ? "ok" : redeemed ? "muted-badge" : ""}`}>
            {redeemed ? "Canjeada" : done ? "¡Lista!" : isBirthday ? "Cumpleaños" : card.program.type === "STAMP" ? "Sellos" : "Puntos"}
          </span>
        </div>

        {card.program.type === "STAMP" ? (
          <div className="stamps">
            {Array.from({ length: goal }).map((_, i) => (
              <span
                key={`${i}-${i < card.balance}`}
                className={`stamp ${i < card.balance ? "filled pop" : ""}`}
                style={i < card.balance ? { animationDelay: `${i * 70}ms` } : undefined}
              >
                {i < card.balance ? card.program.emoji || "★" : ""}
              </span>
            ))}
          </div>
        ) : isBirthday ? (
          <div style={{ textAlign: "center", fontSize: 40, margin: "10px 0" }}>🎂</div>
        ) : (
          <div className="progress">
            <div className="progress-bar anim" style={{ width: `${pct}%` }} />
            <span className="progress-label">{card.balance} / {goal}</span>
          </div>
        )}

        {/* Microcopy que empuja a la meta */}
        {!redeemed && (
          <p className="lc-missing">
            {isBirthday
              ? done
                ? "¡Feliz cumpleaños! Mostrá esta tarjeta en caja para canjear tu premio."
                : "Este premio se activa solo el día de tu cumpleaños."
              : done
              ? "¡Meta cumplida! Mostrala en caja para canjear tu premio."
              : missing <= 2
              ? `¡Ya casi! Te ${missing === 1 ? "falta 1" : `faltan ${missing}`} ${unit}${missing === 1 ? "" : "s"}.`
              : `Te faltan ${missing} ${unit}s para tu premio.`}
          </p>
        )}

        {!redeemed && (
          <button className="qr-box qr-btn" onClick={onShowQr} aria-label="Ver el código QR en grande">
            <QRCodeCanvas value={card.token} size={148} includeMargin bgColor="#ffffff" />
            <p className="tiny muted">Tocá para agrandar · mostralo en caja</p>
          </button>
        )}

        {done && (
          <div className="card-stamped" aria-hidden>
            <span>PARA CANJE</span>
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
    </TiltCard>
  );
}

// QR gigante para escanear facil en el mostrador.
function QrModal({ card, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const size = Math.min(Math.floor(window.innerWidth * 0.75), 340);
  return (
    <div className="overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="qr-big" onClick={(e) => e.stopPropagation()}>
        <div className="qr-big-head">
          <b>{card.brand?.emoji} {card.brand?.name}</b>
          <span className="muted tiny">{card.program.name}</span>
        </div>
        <QRCodeCanvas value={card.token} size={size} includeMargin bgColor="#ffffff" />
        <p className="tiny muted">Acercá el teléfono a la caja</p>
        <button className="btn line full" onClick={onClose}>Cerrar</button>
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
              <b>{b.emoji} {b.name}</b>
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
