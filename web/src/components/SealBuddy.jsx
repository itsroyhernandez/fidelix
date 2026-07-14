import { useEffect, useRef } from "react";

// SealBuddy v2 — motor de animacion propio (rAF + interpolacion), no gestos sueltos:
// · idle/error: los ojos SIGUEN AL MOUSE por toda la pantalla; la cabeza se ladea hacia donde mira
// · watch: lee lo que escribis (pupilas segun avance del texto)
// · shy: cierra los ojos al escribir la contraseña… pero ESPIA con un ojo si pausas,
//        y abre un ojo cuando apretas "ver contraseña" (prop peek)
// · parpadea de forma natural, respira, sonrie mas cuando la contraseña ya es valida (happy)
export default function SealBuddy({ mode = "idle", watch = 0.5, peek = false, happy = false, lastTypeAt = 0 }) {
  const svgRef = useRef(null);
  const faceRef = useRef(null);
  const pupilL = useRef(null);
  const pupilR = useRef(null);
  const lidL = useRef(null);
  const lidR = useRef(null);
  const props = useRef({ mode, watch, peek, lastTypeAt });
  props.current = { mode, watch, peek, lastTypeAt };

  // mouse global (una sola suscripcion)
  const mouse = useRef({ x: -1, y: -1, has: false });
  useEffect(() => {
    const onMove = (e) => { mouse.current = { x: e.clientX, y: e.clientY, has: true }; };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = { px: 0, py: 0, tilt: 0, lidL: 0, lidR: 0, nextBlink: performance.now() + 2600, blinkUntil: 0 };
    let raf = 0;

    function eyeTargetTowardMouse(svg, maxR = 6.5) {
      const r = svg.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.47;
      const dx = mouse.current.x - cx, dy = mouse.current.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const m = Math.min(d / 36, maxR);
      return [dx / d * m, dy / d * Math.min(m, 4.6)];
    }

    function tick(now) {
      const svg = svgRef.current;
      if (svg) {
        const { mode, watch, peek, lastTypeAt } = props.current;
        let tx = 0, ty = 0;

        if (mode === "watch") {
          tx = (Math.min(Math.max(watch, 0), 1) - 0.5) * 11;
          ty = 3.4;
        } else if (mode !== "shy" && mouse.current.has) {
          [tx, ty] = eyeTargetTowardMouse(svg);
        }

        // espiar: forzado (boton "ver") o automatico si pausó de escribir.
        // Ritmo suave: abre el ojo ~0.9s de cada ~3.2s, no un parpadeo nervioso.
        const idlePeek = mode === "shy" && lastTypeAt && Date.now() - lastTypeAt > 1400 && now % 3200 < 950;
        const peeking = mode === "shy" && (peek || idlePeek);
        if (peeking && mouse.current.has) [tx, ty] = eyeTargetTowardMouse(svg, 5.5);

        // parpadeo natural (solo con ojos abiertos)
        let blink = 0;
        if (mode !== "shy") {
          if (now > s.nextBlink) { s.blinkUntil = now + 130; s.nextBlink = now + 2800 + Math.random() * 3200; }
          if (now < s.blinkUntil) blink = 1;
        }

        const lidTL = mode === "shy" ? (peeking ? 0.14 : 1) : blink;
        const lidTR = mode === "shy" ? 1 : blink;

        const k = reduce ? 1 : 0.16;
        s.px += (tx - s.px) * k;
        s.py += (ty - s.py) * k;
        s.lidL += (lidTL - s.lidL) * (reduce ? 1 : (blink ? 0.6 : 0.22));
        s.lidR += (lidTR - s.lidR) * (reduce ? 1 : (blink ? 0.6 : 0.22));
        const tiltT = mode === "error" ? 0 : s.px * 0.55;
        s.tilt += (tiltT - s.tilt) * (reduce ? 1 : 0.09);

        const pt = `translate(${s.px.toFixed(2)} ${s.py.toFixed(2)})`;
        pupilL.current?.setAttribute("transform", pt);
        pupilR.current?.setAttribute("transform", pt);
        lidL.current?.setAttribute("transform", `scale(1 ${Math.max(s.lidL, 0.001).toFixed(3)})`);
        lidR.current?.setAttribute("transform", `scale(1 ${Math.max(s.lidR, 0.001).toFixed(3)})`);
        faceRef.current?.setAttribute("transform", `rotate(${s.tilt.toFixed(2)} 60 60)`);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const mouth =
    mode === "error" ? "M46 82 Q60 73 74 82"
    : mode === "shy" ? (happy ? "M50 79 Q60 87 70 79" : "M53 80 Q60 84 67 80")
    : mode === "watch" ? "M50 79 Q60 86 70 79"
    : "M48 78 Q60 88 72 78";

  return (
    <svg viewBox="0 0 120 120" width="96" height="96" ref={svgRef} className={`buddy buddy-${mode}`} aria-hidden="true">
      {/* anillo del sello (no se ladea: es el troquel) */}
      <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="5" />
      <g ref={faceRef}>
        <circle cx="60" cy="60" r="45" fill="var(--paper)" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 4" />
        <path className="buddy-brow" d="M34 42 Q42 37 50 41" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path className="buddy-brow" d="M70 41 Q78 37 86 42" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />

        {/* ojo izquierdo (el que espía) */}
        <g transform="translate(44 56)">
          <ellipse rx="10" ry="11" fill="#fff" stroke="currentColor" strokeWidth="2" />
          <g ref={pupilL}><circle r="4.2" fill="currentColor" /></g>
          <ellipse ref={lidL} rx="10.5" ry="11.5" fill="var(--paper)" stroke="currentColor" strokeWidth="2" transform="scale(1 0.001)" />
        </g>
        {/* ojo derecho */}
        <g transform="translate(76 56)">
          <ellipse rx="10" ry="11" fill="#fff" stroke="currentColor" strokeWidth="2" />
          <g ref={pupilR}><circle r="4.2" fill="currentColor" /></g>
          <ellipse ref={lidR} rx="10.5" ry="11.5" fill="var(--paper)" stroke="currentColor" strokeWidth="2" transform="scale(1 0.001)" />
        </g>

        <g className="buddy-blush">
          <ellipse cx="38" cy="70" rx="6" ry="3.4" fill="currentColor" opacity=".22" />
          <ellipse cx="82" cy="70" rx="6" ry="3.4" fill="currentColor" opacity=".22" />
        </g>
        <path className="buddy-mouth" d={mouth} fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
