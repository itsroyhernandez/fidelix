import { useEffect, useRef, useState } from "react";

// Progreso 0..1 de cuanto se ha scrolleado un elemento desde que su borde
// superior toca el tope del viewport. Sirve para animaciones "scrubbed"
// (el usuario controla la animacion con el scroll, no un timer).
export function useScrollProgress(ref, { distance = 600 } = {}) {
  const [progress, setProgress] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    function update() {
      const el = ref.current;
      ticking.current = false;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrolled = Math.min(Math.max(-rect.top, 0), distance);
      setProgress(scrolled / distance);
    }
    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref, distance]);

  return progress;
}
