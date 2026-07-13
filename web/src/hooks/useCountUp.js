import { useEffect, useRef, useState } from "react";

// Anima un número de 0 al valor final cuando el elemento entra en pantalla.
// Da la sensación "en vivo" del dashboard sin librerías.
export function useCountUp(target, { duration = 900 } = {}) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Correctitud ante todo: si no se puede animar (reduce-motion, pestaña oculta,
    // o sin IntersectionObserver), mostramos el valor final de una vez. Nunca 0 pegado.
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || document.hidden || typeof IntersectionObserver === "undefined") {
      started.current = true;
      setValue(target);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started.current) {
            started.current = true;
            const t0 = performance.now();
            const tick = (now) => {
              const p = Math.min((now - t0) / duration, 1);
              // easeOutCubic
              const eased = 1 - Math.pow(1 - p, 3);
              setValue(Math.round(target * eased));
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);

  return [ref, value];
}
