import { useEffect, useRef, useState } from "react";
import { api, auth } from "../api.js";
import { useReveal } from "../hooks/useReveal.js";
import Seal from "../components/Seal.jsx";
import Privacy from "./Privacy.jsx";
import { GoogleLogo, AppleLogo, MicrosoftLogo } from "../components/BrandLogos.jsx";
import SealBuddy from "../components/SealBuddy.jsx";
import InkField from "../components/InkField.jsx";
import InkCursor from "../components/InkCursor.jsx";
import { useMagnetic } from "../hooks/useMagnetic.js";
import StampDemo from "../components/StampDemo.jsx";
import PlanFinder from "../components/PlanFinder.jsx";
import TiltCard from "../components/TiltCard.jsx";
import { useScrollProgress } from "../hooks/useScrollProgress.js";
import { useSectionProgress } from "../hooks/useSectionProgress.js";
import { useDragScroll } from "../hooks/useDragScroll.js";

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, shown] = useReveal();
  return (
    <div ref={ref} className={`reveal ${shown ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// Bloquea el scroll del body y cierra con ESC mientras un overlay esta abierto.
function useOverlayLock(onClose) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
}

export default function Public({ onAuthed }) {
  const [panel, setPanel] = useState(null); // null | "login" | "customer" | "brand"
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <div className="landing-v2">
      {/* Todo lo que compone la pagina vive en .stage; los overlays quedan AFUERA
          para que ninguna regla de apilamiento del contenido los pueda enterrar. */}
      <InkCursor />
      <div className="stage">
        <InkField />
        <div className="grain" aria-hidden />

        <nav className="nav">
          <div className="logo">
            <Seal size={34} />
            <span className="logo-text">Fidelix</span>
          </div>
          <div className="nav-actions">
            <a className="nav-link hide-sm" href="#planes">Planes</a>
            <a className="nav-link hide-sm" href="#como">Cómo funciona</a>
            <button className="btn ghost sm" onClick={() => setPanel("login")}>Entrar</button>
            <button className="btn primary sm" onClick={() => setPanel("brand")}>Probar gratis</button>
          </div>
        </nav>

        <Hero setPanel={setPanel} />
        <RewardMarquee />
        <StatBand setPanel={setPanel} />
        <Steps />
        <TryIt />
        <Benefits />
        <Pricing onStart={() => setPanel("brand")} />
        <ReportsTeaser />
        <Faq />
        <FinalCTA setPanel={setPanel} />

        <footer className="footer-v2">
          <div className="logo">
            <Seal size={26} />
            <span className="logo-text">Fidelix <em>by Movix</em></span>
          </div>
          <div className="footer-links">
            <button className="link" onClick={() => setShowPrivacy(true)}>Política de privacidad</button>
            <span className="muted tiny">@fidelixbymovix · © 2026</span>
          </div>
        </footer>
      </div>

      {/* Fuera de .stage para que .stage > * no le pise el position:fixed */}
      <WhatsAppFab />

      {panel && <AuthModal mode={panel} setMode={setPanel} onClose={() => setPanel(null)} onAuthed={onAuthed} />}
      {showPrivacy && <Privacy onClose={() => setShowPrivacy(false)} />}
    </div>
  );
}

// Numero real de WhatsApp de Movix (formato wa.me, sin "+").
const WHATSAPP = "50670863466";

function WhatsAppFab() {
  return (
    <a
      className="wa-fab"
      href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola, quiero saber más de Fidelix")}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Escribinos por WhatsApp"
    >
      <svg viewBox="0 0 32 32" width="26" height="26" fill="#fff" aria-hidden="true">
        <path d="M16 3C9.4 3 4 8.3 4 14.9c0 2.1.6 4.1 1.6 5.9L4 29l8.4-1.6c1.7.9 3.6 1.4 5.6 1.4 6.6 0 12-5.3 12-11.9S22.6 3 16 3zm0 21.8c-1.8 0-3.5-.5-5-1.3l-.4-.2-5 1 1-4.8-.3-.4c-1-1.6-1.5-3.4-1.5-5.2 0-5.5 4.6-10 10.2-10s10.2 4.5 10.2 10-4.6 9.9-10.2 9.9zm5.6-7.4c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1s0-.5.1-.6c.1-.1.3-.4.5-.5.2-.2.2-.3.3-.5.1-.2.1-.4 0-.6-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.2 3.1 1.3 3.3c.2.2 2.3 3.6 5.7 5 .8.3 1.4.5 1.9.7.8.2 1.5.2 2.1.1.6-.1 1.8-.7 2.1-1.5.3-.7.3-1.3.2-1.5-.1-.1-.3-.2-.6-.4z"/>
      </svg>
    </a>
  );
}

// El dato que la industria tica ya usa para vender lealtad — directo y sin adorno.
function StatBand({ setPanel }) {
  return (
    <section className="section stat-band">
      <Reveal>
        <div className="sb-num">7<span>/</span>10</div>
      </Reveal>
      <Reveal delay={80}>
        <p className="sb-line">clientes que te visitan hoy <em>no vuelven</em>.</p>
      </Reveal>
      <Reveal delay={160}>
        <p className="muted sb-sub">¿Cuánta plata dejás en la mesa cada mes? Fidelix los trae de vuelta.</p>
      </Reveal>
      <Reveal delay={220}>
        <MagneticButton className="btn primary lg" onClick={() => setPanel("brand")}>
          Empezá a sellarlos
        </MagneticButton>
      </Reveal>
    </section>
  );
}

const FAQS = [
  ["¿Mis clientes tienen que descargar una app?", "No. Fidelix corre en el navegador: el boleto vive en el teléfono y se puede guardar en Apple o Google Wallet."],
  ["¿Los datos de mis clientes son míos?", "Sí. Cada comercio tiene su base aislada; solo vos la ves. Cada mes recibís un reporte con tu marca y tus números."],
  ["¿Qué pasa cuando terminan los 3 días de prueba?", "El panel te avisa. Si no activás un plan, el programa se pausa — no se borra nada. Activás y seguís donde quedaste."],
  ["¿Puedo cambiar el diseño de mi tarjeta?", "Cuando quieras: logo, colores, ícono y recompensa desde tu panel, sin costo extra."],
  ["¿Cómo se paga?", "Mensual o anual con 20% de descuento. Tarjeta, PayPal o transferencia/SINPE en Costa Rica."],
  ["¿Sirve si tengo varias sucursales?", "Sí: Pulse cubre hasta 3 sucursales y Hyper es ilimitado, con el mismo programa en todas."],
];

function Faq() {
  return (
    <section className="section faq-land">
      <Reveal><h2 className="section-title">Preguntas frecuentes</h2></Reveal>
      <div className="faq-list">
        {FAQS.map(([q, a], i) => (
          <Reveal key={q} delay={i * 50}>
            <details>
              <summary>{q}<span className="faq-x" aria-hidden>+</span></summary>
              <p className="muted">{a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// Boton que se inclina hacia el cursor (efecto magnetico de sitios de motion).
function MagneticButton({ className, onClick, children }) {
  const m = useMagnetic(0.28);
  return (
    <button ref={m.ref} className={className} onClick={onClick} onMouseMove={m.onMouseMove} onMouseLeave={m.onMouseLeave}>
      {children}
    </button>
  );
}

function Hero({ setPanel }) {
  const heroRef = useRef(null);
  // El boleto responde al scroll en tiempo real (no una animacion de timer) -
  // mientras mas bajas, mas se "aleja" y gira, como en las paginas de producto de Apple.
  const progress = useScrollProgress(heroRef, { distance: 700 });
  const ticketStyle = {
    transform: `rotate(${-3 - progress * 9}deg) translateY(${progress * -50}px) scale(${1 - progress * 0.1})`,
    opacity: 1 - progress * 0.55,
  };

  return (
    <header className="hero-v2" ref={heroRef}>
      <div className="hero-copy">
        <Reveal>
          <span className="eyebrow"><span className="live-dot" /> Sello digital · Costa Rica</span>
        </Reveal>
        {/* Titulo palabra por palabra (cortina). El espaciado entre palabras
            lo da CSS (.hw + .hw), porque los spans del map no traen espacios. */}
        <h1 className="hero-title">
          {["Hacé", "que", "tus", "clientes", "vuelvan."].map((w, i) => (
            <span className="hw" key={i}>
              <span style={{ "--d": `${0.12 + i * 0.09}s` }}>
                {w === "vuelvan." ? <><em className="ink-em">vuelvan</em>.</> : w}
              </span>
            </span>
          ))}
        </h1>
        <Reveal delay={140}>
          <p className="hero-lead">
            El sello digital de tu marca: cada compra suma, cada meta se canjea.
            QR, Wallet y estadísticas — sin apps que instalar.
          </p>
        </Reveal>
        <Reveal delay={210}>
          <div className="hero-cta">
            <MagneticButton className="btn primary lg shine" onClick={() => setPanel("brand")}>
              Probar gratis 3 días
            </MagneticButton>
            <MagneticButton className="btn line lg" onClick={() => setPanel("customer")}>
              Soy cliente
            </MagneticButton>
          </div>
        </Reveal>
      </div>

      <Reveal delay={280} className="hero-ticket-wrap">
        <div style={ticketStyle}>
          <TiltCard max={8}>
            <TicketCard />
          </TiltCard>
        </div>
      </Reveal>
    </header>
  );
}

// Cinta de recompensas en movimiento (como papel saliendo de una impresora de tickets).
const REWARDS = [
  "1 café gratis", "La 10ª pizza va por la casa", "Corte #8 sin costo", "2x1 los martes",
  "Postre gratis en tu cumple", "Envío gratis al 5º pedido", "Manicure #6 gratis", "Bebida grande al 7º combo",
];
function RewardMarquee() {
  const row = [...REWARDS, ...REWARDS];
  return (
    <div className="marquee" aria-hidden>
      <div className="marquee-track">
        {row.map((r, i) => (
          <span className="marquee-item" key={i}>
            <span className="marquee-dot" /> {r}
          </span>
        ))}
      </div>
    </div>
  );
}

function TryIt() {
  return (
    <section className="section">
      <Reveal><h2 className="section-title">Sentilo antes de decidir.</h2></Reveal>
      <Reveal delay={70}><p className="muted center-t" style={{ marginTop: -20, marginBottom: 30 }}>Este es el mismo boleto que verían tus clientes. Hacé clic y mirá.</p></Reveal>
      <Reveal delay={120} className="tryit-wrap">
        <StampDemo />
      </Reveal>
    </section>
  );
}

function TicketCard() {
  return (
    <div className="ticket">
      <div className="ticket-perf top" aria-hidden />
      <div className="ticket-body">
        <div className="ticket-row">
          <span className="ticket-brand">Cafetería La Esquina</span>
          <span className="ticket-no">N.º 0128</span>
        </div>
        <div className="ticket-stamps">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className={`ticket-stamp ${i < 7 ? "on" : ""}`} style={{ "--i": i }} />
          ))}
        </div>
        <div className="ticket-foot">
          <span>Premio: 1 café gratis</span>
          <span className="ticket-count">7/10</span>
        </div>
      </div>
      <div className="ticket-perf bottom" aria-hidden />
      <div className="ticket-seal">
        <Seal size={72} />
      </div>
    </div>
  );
}

const STEPS = [
  ["01", "Creá tu marca", "Logo, colores y recompensas en minutos.", 2],
  ["02", "Compartí el código", "Tus clientes entran con un código corto o un QR.", 4],
  ["03", "Sumá en caja", "Escaneás su tarjeta y el sello cae al instante.", 7],
  ["04", "Fidelizá", "Premio canjeado… y vuelven por el siguiente.", 10],
];

// Scrollytelling estilo pagina de producto: el boleto queda fijo y se va
// llenando de sellos a medida que el visitante scrollea por los 4 pasos.
function Steps() {
  const trackRef = useRef(null);
  const progress = useSectionProgress(trackRef);
  const active = Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length));
  const filled = STEPS[active][3];

  return (
    <section id="como" className="section steps-scroll">
      <Reveal><h2 className="section-title">El recorrido de un sello.</h2></Reveal>

      <div className="steps-grid" ref={trackRef}>
        <div className="steps-sticky">
          <div className="ticket steps-ticket-visual">
            <div className="ticket-perf top" aria-hidden />
            <div className="ticket-body">
              <div className="ticket-row">
                <span className="ticket-brand">Tu marca</span>
                <span className="ticket-no">Paso {STEPS[active][0]}</span>
              </div>
              <div className="ticket-stamps">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span key={`${i}-${i < filled}`} className={`ticket-stamp demo-stamp ${i < filled ? "on" : ""}`} />
                ))}
              </div>
              <div className="ticket-foot">
                <span>{STEPS[active][1]}</span>
                <span className="ticket-count">{filled}/10</span>
              </div>
            </div>
            <div className="ticket-perf bottom" aria-hidden />
          </div>
        </div>

        <div className="steps-track">
          {STEPS.map(([n, t, d], i) => (
            <div className={`step-block ${i === active ? "active" : ""}`} key={n}>
              <span className="step-n">{n}</span>
              <h3>{t}</h3>
              <p className="muted">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const BENEFITS = [
  ["Tu marca, no la nuestra", "Logo, colores y recompensas. El cliente ve TU marca en cada sello."],
  ["En cualquier dispositivo", "Funciona en el navegador. Nada que instalar, nada que actualizar."],
  ["Datos blindados", "Cada marca aislada; contraseñas cifradas y accesos por rol."],
  ["Estadísticas en vivo", "Clientes, canjes y retención al instante, sin planillas."],
  ["Reportes cada mes", "Un resumen con tu marca y tus números, directo a tu correo."],
  ["Apple & Google Wallet", "El pase vive en la billetera del teléfono de tu cliente."],
];

function Benefits() {
  const drag = useDragScroll();

  function scrollByCards(dir) {
    drag.ref.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  }

  return (
    <section className="section">
      <div className="row between benefits-head">
        <Reveal><h2 className="section-title left" style={{ margin: 0 }}>Todo lo que una marca seria necesita.</h2></Reveal>
        <Reveal delay={60} className="carousel-arrows">
          <button className="arrow-btn" onClick={() => scrollByCards(-1)} aria-label="Anterior">‹</button>
          <button className="arrow-btn" onClick={() => scrollByCards(1)} aria-label="Siguiente">›</button>
        </Reveal>
      </div>
      <Reveal delay={90}>
        <div
          className="benefits"
          ref={drag.ref}
          onPointerDown={drag.onPointerDown}
          onPointerMove={drag.onPointerMove}
          onPointerUp={drag.onPointerUp}
          onPointerLeave={drag.onPointerLeave}
          onClickCapture={drag.onClickCapture}
        >
          {BENEFITS.map(([t, d]) => (
            <TiltCard className="benefit-card" key={t}>
              <span className="benefit-mark" aria-hidden>✦</span>
              <h3>{t}</h3>
              <p className="muted">{d}</p>
            </TiltCard>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function Pricing({ onStart }) {
  const [plans, setPlans] = useState([]);
  const [annual, setAnnual] = useState(false);
  const [fee, setFee] = useState(250);
  const [recommendedId, setRecommendedId] = useState(null);

  useEffect(() => {
    api("/payments/plans")
      .then((d) => {
        setPlans(d.plans);
        setFee(d.implementationFeeUsd);
      })
      .catch(() => {});
  }, []);

  return (
    <section id="planes" className="section">
      <Reveal><h2 className="section-title">Planes que crecen con tu negocio.</h2></Reveal>
      <Reveal delay={70}>
        <div className="billing-toggle">
          <button className={!annual ? "on" : ""} onClick={() => setAnnual(false)}>Mensual</button>
          <button className={annual ? "on" : ""} onClick={() => setAnnual(true)}>Anual <span className="save">-20%</span></button>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <PlanFinder plans={plans} onPick={(p) => setRecommendedId(p.id)} />
      </Reveal>

      <div className="plans">
        {plans.map((p, i) => (
          <Reveal key={p.id} delay={i * 90}>
            <div className={`plan-card ${p.popular ? "popular" : ""} ${p.id === recommendedId ? "recommended" : ""}`}>
              {p.id === recommendedId ? (
                <span className="plan-badge match">Para vos</span>
              ) : (
                p.popular && <span className="plan-badge">Más elegido</span>
              )}
              <div className="plan-perf" aria-hidden />
              <div className="plan-name">{p.name}</div>
              <div className="plan-tag muted">{p.tagline} · {p.audience}</div>
              <div className="plan-price">
                <span className="pp-amount">${annual ? Math.round(p.annualUsd / 12) : p.monthlyUsd}</span>
                <span className="pp-per muted">/ mes</span>
              </div>
              <div className="pp-crc muted tiny">
                ≈ ₡{p.monthlyCrc.toLocaleString("es-CR")} CRC/mes {annual && "· facturado anual"}
              </div>
              <ul className="plan-feats">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button className={`btn ${p.popular ? "primary" : "line"} full`} onClick={onStart}>
                Empezar
              </button>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal>
        <p className="muted tiny center-t">
          + Fee de implementación desde ${fee} (pases digitales, subdominio club.tumarca.com y video de lanzamiento).
          ¿Más de 25.000 usuarios? Plan <b>Enterprise</b> a la medida.
        </p>
      </Reveal>
    </section>
  );
}

function ReportsTeaser() {
  return (
    <section className="section">
      <Reveal>
        <div className="reports-teaser">
          <div>
            <span className="eyebrow">Automático</span>
            <h2 className="section-title left">Un reporte con tu marca, cada mes.</h2>
            <p className="muted">
              El primer día de cada mes te llega por correo un resumen profesional: clientes
              nuevos, sellos entregados, canjes y retención — con tu logo y tus colores.
            </p>
          </div>
          <div className="report-mock">
            <div className="ticket-perf top sm" aria-hidden />
            <div className="rm-head">Cafetería La Esquina</div>
            <div className="rm-grid">
              <div><b>128</b><span>clientes</span></div>
              <div><b>1.240</b><span>sellos</span></div>
              <div><b>37</b><span>canjes</span></div>
              <div><b>29%</b><span>retención</span></div>
            </div>
            <div className="ticket-perf bottom sm" aria-hidden />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function FinalCTA({ setPanel }) {
  return (
    <section className="section final-cta">
      <Reveal>
        <h2 className="cta-title">Tu programa de lealtad, listo hoy.</h2>
        <MagneticButton className="btn primary lg shine" onClick={() => setPanel("brand")}>
          Probar Fidelix gratis
        </MagneticButton>
      </Reveal>
    </section>
  );
}

// ---------- Auth ----------
const PLACEHOLDERS = {
  brandName: "Ej: Cafetería La Esquina",
  ownerName: "Ej: María Rodríguez",
  name: "Ej: Juan Pérez",
  email: "hola@laesquina.co.cr",
  phone: "+506 8888 8888",
};

function AuthModal({ mode, setMode, onClose, onAuthed }) {
  useOverlayLock(onClose);
  // Cerrar solo si el CLIC EMPEZO en el fondo: arrastrar una seleccion de texto
  // desde un input y soltar afuera NO debe cerrar el modal (perderias lo escrito).
  const downOnBackdrop = useRef(false);
  const [form, setForm] = useState({ brandName: "", ownerName: "", name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthMsg, setOauthMsg] = useState("");
  const [focus, setFocus] = useState(null); // campo enfocado -> reacciona la mascota
  const [showPw, setShowPw] = useState(false); // "ver contraseña": la mascota abre un ojo
  const [lastTypeAt, setLastTypeAt] = useState(0); // si pausas al escribir, espía solita
  const [capsOn, setCapsOn] = useState(false);
  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    if (k === "password") setLastTypeAt(Date.now());
    if (error) setError("");
  };
  const eyes = (k) => ({ onFocus: () => setFocus(k), onBlur: () => setFocus(null) });

  const pwOk = validatePassword(form.password);

  // La mascota: cierra los ojos en la contraseña, sigue el texto en el resto,
  // y al mouse cuando no hay campo activo (eso lo maneja ella sola).
  // Si la contraseña esta VISIBLE ("ver") y nadie escribe, se queda tapandose
  // los ojos pero espiando — no abre los ojos de golpe.
  const buddyMode = error ? "error" : focus === "password" ? "shy" : focus ? "watch" : showPw ? "shy" : "idle";
  const buddyWatch = focus && focus !== "password" ? Math.min((form[focus]?.length || 0) / 24, 1) : 0.5;
  const checkCaps = (e) => setCapsOn(e.getModifierState?.("CapsLock") ?? false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (mode !== "login" && !pwOk.valid) {
      setError("Revisá los requisitos de la contraseña.");
      return;
    }
    setBusy(true);
    try {
      let data;
      if (mode === "login") {
        data = await api("/auth/login", { method: "POST", body: { email: form.email, password: form.password } });
      } else if (mode === "customer") {
        data = await api("/auth/register", { method: "POST", body: { name: form.name, email: form.email, password: form.password } });
      } else {
        data = await api("/tenants/signup", {
          method: "POST",
          body: { brandName: form.brandName, ownerName: form.ownerName, email: form.email, password: form.password, phone: form.phone },
        });
      }
      auth.token = data.token;
      onAuthed(data.user, data.tenant, data.devCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function social(provider) {
    setOauthMsg("");
    try {
      await api(`/auth/oauth/${provider}/start`);
    } catch (err) {
      setOauthMsg(err.message);
    }
  }

  const title = mode === "login" ? "Entrar" : mode === "customer" ? "Crear cuenta" : "Probar Fidelix gratis";

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (e.target === e.currentTarget && downOnBackdrop.current) onClose(); }}
    >
      <div className="overlay-body auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h3>{title}</h3>
          <button className="btn ghost sm" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="buddy-wrap">
          <SealBuddy
            mode={buddyMode}
            watch={buddyWatch}
            peek={showPw}
            happy={focus === "password" && pwOk.valid}
            lastTypeAt={lastTypeAt}
          />
        </div>

        <div className="social-row">
          <button className="social-btn" onClick={() => social("google")}><GoogleLogo /> Google</button>
          <button className="social-btn" onClick={() => social("apple")}><AppleLogo /> Apple</button>
          <button className="social-btn" onClick={() => social("microsoft")}><MicrosoftLogo /> Microsoft</button>
        </div>
        {oauthMsg && <div className="muted tiny oauth-msg">{oauthMsg}</div>}
        <div className="or"><span>o con tu correo</span></div>

        <form onSubmit={submit} className="form">
          {mode === "brand" && (
            <>
              <input className="input" placeholder={PLACEHOLDERS.brandName} value={form.brandName} onChange={set("brandName")} {...eyes("brandName")} required />
              <input className="input" placeholder={PLACEHOLDERS.ownerName} value={form.ownerName} onChange={set("ownerName")} {...eyes("ownerName")} required />
              <input className="input" placeholder={PLACEHOLDERS.phone} value={form.phone} onChange={set("phone")} {...eyes("phone")} />
            </>
          )}
          {mode === "customer" && (
            <input className="input" placeholder={PLACEHOLDERS.name} value={form.name} onChange={set("name")} {...eyes("name")} required />
          )}
          <input className="input" type="email" placeholder={PLACEHOLDERS.email} value={form.email} onChange={set("email")} {...eyes("email")} required />
          <div className="pw-field">
            <input
              className="input"
              type={showPw ? "text" : "password"}
              placeholder="Contraseña"
              value={form.password}
              onChange={set("password")}
              onKeyUp={checkCaps}
              onKeyDown={checkCaps}
              {...eyes("password")}
              required
            />
            <button
              type="button"
              className="pw-toggle"
              onMouseDown={(e) => e.preventDefault()} /* no robar el foco: la mascota no debe abrir los ojos de golpe */
              onClick={() => setShowPw(!showPw)}
              aria-label={showPw ? "Ocultar contraseña" : "Ver contraseña"}
            >
              {showPw ? "ocultar" : "ver"}
            </button>
          </div>
          {capsOn && focus === "password" && <div className="caps-hint">⇪ Bloq Mayús está activado</div>}

          {mode !== "login" && form.password.length > 0 && (
            <ul className="pw-rules">
              <Rule ok={pwOk.len}>8+ caracteres</Rule>
              <Rule ok={pwOk.letter}>una letra</Rule>
              <Rule ok={pwOk.num}>un número</Rule>
              <Rule ok={pwOk.clean}>sin espacios, comas ni emojis</Rule>
            </ul>
          )}

          {error && <div className="error">{error}</div>}
          <button className="btn primary" disabled={busy}>{busy ? "…" : title}</button>
        </form>

        <div className="switch">
          {mode !== "login" && <button className="link" onClick={() => setMode("login")}>¿Ya tenés cuenta? Entrá</button>}
          {mode !== "brand" && <button className="link" onClick={() => setMode("brand")}>Soy un negocio, quiero probar</button>}
          {mode !== "customer" && <button className="link" onClick={() => setMode("customer")}>Soy cliente</button>}
        </div>
      </div>
    </div>
  );
}

function Rule({ ok, children }) {
  return <li className={ok ? "ok" : ""}>{ok ? "✓" : "○"} {children}</li>;
}

function validatePassword(v) {
  const len = v.length >= 8;
  const letter = /[A-Za-z]/.test(v);
  const num = /\d/.test(v);
  const clean = !/\s/.test(v) && !v.includes(",") && !/\p{Extended_Pictographic}/u.test(v);
  return { len, letter, num, clean, valid: len && letter && num && clean };
}
