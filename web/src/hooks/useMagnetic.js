import { useRef } from "react";

// Boton "magnetico": se inclina hacia el cursor mientras esta encima
// y vuelve a su lugar con un rebote suave al salir.
export function useMagnetic(strength = 0.3) {
  const ref = useRef(null);

  function onMouseMove(e) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
  }
  function onMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform .4s cubic-bezier(.2,.7,.3,1.35)";
    el.style.transform = "";
    setTimeout(() => { if (ref.current) ref.current.style.transition = ""; }, 420);
  }

  return { ref, onMouseMove, onMouseLeave };
}
