import { useState } from "react";
import Seal from "./Seal.jsx";

const GOAL = 8;

// Demo real: el visitante estampa sellos con su propio clic.
// Al completar la meta, el sello grande cae con fuerza, el boleto se sacude
// y salpica tinta — el momento "wow" de la pagina.
export default function StampDemo() {
  const [count, setCount] = useState(0);
  const [slam, setSlam] = useState(false);
  const done = count >= GOAL;

  function stamp() {
    if (done) return;
    const next = count + 1;
    setCount(next);
    if (next >= GOAL) setSlam(true);
  }
  function reset() {
    setCount(0);
    setSlam(false);
  }

  return (
    <div className={`demo-ticket ${slam ? "slam-shake" : ""}`}>
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
      <div className="ticket-perf bottom" aria-hidden />

      {slam && (
        <div className="slam-layer" aria-hidden>
          <div className="slam-seal">
            <Seal size={116} />
          </div>
          <div className="splat">
            {Array.from({ length: 12 }).map((_, i) => (
              <i
                key={i}
                style={{
                  "--a": `${i * 30 + (i % 2) * 12}deg`,
                  "--d": `${52 + (i % 3) * 26}px`,
                  "--s": `${5 + (i % 4) * 3}px`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
