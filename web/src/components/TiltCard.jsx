import { useRef } from "react";

// Inclinacion 3D que sigue el cursor (efecto "producto premium").
// Se resetea suave al salir el mouse via la transicion CSS del propio elemento.
export default function TiltCard({ children, className = "", max = 7, style }) {
  const ref = useRef(null);

  function onMove(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(700px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-5px)`;
  }
  function reset() {
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <div ref={ref} className={className} style={style} onMouseMove={onMove} onMouseLeave={reset} onBlur={reset}>
      {children}
    </div>
  );
}
