import { useEffect, useRef } from "react";

// Fondo vivo de la landing: motas de "polvo de papel" y tinta que flotan,
// huyen del cursor, y un lavado de tinta calido que sigue al mouse.
// Un solo canvas + un solo rAF; pausa con la pestaña oculta; respeta reduced-motion.
export default function InkField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;

    let W = 0, H = 0, dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = canvas.width = window.innerWidth * dpr;
      H = canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
    }
    resize();

    const COLORS = [
      "rgba(239,231,216,.16)", // papel
      "rgba(239,231,216,.09)",
      "rgba(178,58,46,.20)",  // tinta ladrillo
      "rgba(156,122,60,.16)", // bronce
    ];
    const N = window.innerWidth < 700 ? 36 : 70;
    const ps = Array.from({ length: N }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: (Math.random() * 1.7 + 0.7) * dpr,
      vx: (Math.random() - 0.5) * 0.12 * dpr,
      vy: (Math.random() - 0.5) * 0.12 * dpr,
      c: COLORS[(Math.random() * COLORS.length) | 0],
    }));

    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    const onMove = (e) => { mouse.tx = e.clientX * dpr; mouse.ty = e.clientY * dpr; };
    const onLeave = () => { mouse.tx = -9999; mouse.ty = -9999; };

    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      ps.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fillStyle = p.c; ctx.fill(); });
    }

    let raf = 0, running = false;
    function tick() {
      ctx.clearRect(0, 0, W, H);
      mouse.x += (mouse.tx - mouse.x) * 0.08;
      mouse.y += (mouse.ty - mouse.y) * 0.08;

      // lavado de tinta que sigue el cursor
      if (fine && mouse.tx > -999) {
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 280 * dpr);
        g.addColorStop(0, "rgba(178,58,46,.10)");
        g.addColorStop(0.5, "rgba(156,122,60,.05)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      const R = 150 * dpr;
      const t = performance.now();
      for (const p of ps) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (fine && d2 < R * R) {
          const d = Math.sqrt(d2) || 1;
          const f = ((R - d) / R) * 0.6;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
        p.vx *= 0.955; p.vy *= 0.955;
        p.x += p.vx + Math.sin((p.y + t * 0.02) * 0.001) * 0.06 * dpr;
        p.y += p.vy + 0.05 * dpr;
        if (p.x < 0) p.x += W; if (p.x > W) p.x -= W; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fillStyle = p.c; ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }

    function start() { if (!running && !reduce) { running = true; raf = requestAnimationFrame(tick); } }
    function stop() { running = false; cancelAnimationFrame(raf); }
    const onVis = () => (document.hidden ? stop() : start());

    if (reduce) drawStatic();
    else start();

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={canvasRef} className="ink-field" aria-hidden />;
}
