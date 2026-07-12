import { useRef } from "react";

// Arrastrar-para-scrollear horizontal (mouse). El touch nativo ya funciona solo.
export function useDragScroll() {
  const ref = useRef(null);
  const state = useRef({ down: false, startX: 0, startScroll: 0, moved: false });

  function onPointerDown(e) {
    const el = ref.current;
    if (!el) return;
    state.current = { down: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    el.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    const el = ref.current;
    const s = state.current;
    if (!el || !s.down) return;
    const dx = e.clientX - s.startX;
    if (Math.abs(dx) > 4) s.moved = true;
    el.scrollLeft = s.startScroll - dx;
  }
  function onPointerUp() {
    state.current.down = false;
  }
  // Evita que un arrastre dispare el click del hijo (ej. el boton "Empezar").
  function onClickCapture(e) {
    if (state.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      state.current.moved = false;
    }
  }

  return {
    ref,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave: onPointerUp,
    onClickCapture,
  };
}
