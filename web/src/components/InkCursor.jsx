import { useEffect, useRef } from "react";

// Cursor de tinta: un punto que sigue el mouse y un anillo (como el aro del
// sello) que lo persigue con retraso y crece sobre elementos interactivos.
// Solo escritorio (pointer: fine); no reemplaza el cursor nativo.
export default function InkCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dot = dotRef.current, ring = ringRef.current;
    if (!dot || !ring) return;

    let x = innerWidth / 2, y = innerHeight / 2;
    let rx = x, ry = y, sc = 1, scT = 1;
    let visible = false, raf = 0;

    const onMove = (e) => {
      x = e.clientX; y = e.clientY;
      if (!visible) { visible = true; dot.style.opacity = "1"; ring.style.opacity = "1"; }
    };
    const onOut = () => { visible = false; dot.style.opacity = "0"; ring.style.opacity = "0"; };
    const onOver = (e) => {
      scT = e.target.closest?.("a,button,input,select,textarea,[role=button],.swatch,.emoji-btn") ? 2.2 : 1;
    };

    const tick = () => {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      sc += (scT - sc) * 0.2;
      dot.style.transform = `translate(${x}px, ${y}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) scale(${sc})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMove);
    document.documentElement.addEventListener("mouseleave", onOut);
    document.addEventListener("mouseover", onOver);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onOut);
      document.removeEventListener("mouseover", onOver);
    };
  }, []);

  return (
    <>
      <span ref={dotRef} className="ink-cursor-dot" aria-hidden />
      <span ref={ringRef} className="ink-cursor-ring" aria-hidden />
    </>
  );
}
