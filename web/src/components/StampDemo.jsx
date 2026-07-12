import { useState } from "react";

const GOAL = 8;

// Demo real: el visitante estampa sellos con su propio clic, no un video.
export default function StampDemo() {
  const [count, setCount] = useState(0);
  const [burst, setBurst] = useState(0);
  const done = count >= GOAL;

  function stamp() {
    if (done) return;
    setCount((c) => c + 1);
  }
  function reset() {
    setCount(0);
    setBurst((b) => b + 1);
  }

  return (
    <div className="demo-ticket">
      <div className="ticket-perf top" aria-hidden />
      <div className="ticket-body demo-body">
        <div className="ticket-row">
          <span className="ticket-brand">Probalo vos</span>
          <span className="ticket-no">DEMO</span>
        </div>

        <div className="ticket-stamps">
          {Array.from({ length: GOAL }).map((_, i) => (
            <span
              key={`${i}-${i < count}`}
              className={`ticket-stamp demo-stamp ${i < count ? "on" : ""}`}
            />
          ))}
        </div>

        <div className="ticket-foot">
          <span>{done ? "¡Premio desbloqueado!" : "Hacé clic para sumar un sello"}</span>
          <span className="ticket-count">{count}/{GOAL}</span>
        </div>

        {!done ? (
          <button className="btn primary full mt" onClick={stamp}>
            Marcar sello
          </button>
        ) : (
          <button className="btn line full mt" onClick={reset}>
            Probar de nuevo
          </button>
        )}
      </div>

      {done && (
        <div className="confetti" key={burst} aria-hidden>
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} style={{ "--i": i }} />
          ))}
        </div>
      )}
    </div>
  );
}
