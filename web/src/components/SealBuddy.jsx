// SealBuddy: la mascota del login. Es el sello de Fidelix con cara:
// - sigue con los ojos lo que escribís (watch 0..1 = avance del texto)
// - cierra los ojos cuando escribís la contraseña (shy)
// - se entristece si hay error, sonríe cuando todo va bien
// Modos: idle | watch | shy | error
export default function SealBuddy({ mode = "idle", watch = 0.5 }) {
  // pupilas: -6..6 px segun el avance del texto; miran un poco hacia abajo al leer
  const dx = (Math.min(Math.max(watch, 0), 1) - 0.5) * 12;
  const dy = mode === "watch" ? 3.2 : 0;

  const mouth =
    mode === "error"
      ? "M46 82 Q60 73 74 82" // triste
      : mode === "shy"
      ? "M53 80 Q60 84 67 80" // sonrisita nerviosa
      : mode === "watch"
      ? "M50 79 Q60 86 70 79" // atento
      : "M48 78 Q60 88 72 78"; // sonrisa

  return (
    <svg
      viewBox="0 0 120 120"
      width="96"
      height="96"
      className={`buddy buddy-${mode}`}
      aria-hidden="true"
    >
      {/* anillo del sello */}
      <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="5" />
      <circle cx="60" cy="60" r="45" fill="var(--paper)" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 4" />

      {/* cejas */}
      <path className="buddy-brow" d="M34 42 Q42 37 50 41" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path className="buddy-brow" d="M70 41 Q78 37 86 42" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />

      {/* ojos */}
      <g className="buddy-eye">
        <ellipse cx="44" cy="56" rx="10" ry="11" fill="#fff" stroke="currentColor" strokeWidth="2" />
        <circle className="buddy-pupil" cx="44" cy="56" r="4.2" fill="currentColor" style={{ transform: `translate(${dx}px, ${dy}px)` }} />
        <ellipse className="buddy-lid" cx="44" cy="56" rx="10.5" ry="11.5" fill="var(--paper)" stroke="currentColor" strokeWidth="2" />
      </g>
      <g className="buddy-eye">
        <ellipse cx="76" cy="56" rx="10" ry="11" fill="#fff" stroke="currentColor" strokeWidth="2" />
        <circle className="buddy-pupil" cx="76" cy="56" r="4.2" fill="currentColor" style={{ transform: `translate(${dx}px, ${dy}px)` }} />
        <ellipse className="buddy-lid" cx="76" cy="56" rx="10.5" ry="11.5" fill="var(--paper)" stroke="currentColor" strokeWidth="2" />
      </g>

      {/* cachetes al cerrar los ojos */}
      <g className="buddy-blush">
        <ellipse cx="38" cy="70" rx="6" ry="3.4" fill="currentColor" opacity=".22" />
        <ellipse cx="82" cy="70" rx="6" ry="3.4" fill="currentColor" opacity=".22" />
      </g>

      {/* boca */}
      <path className="buddy-mouth" d={mouth} fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}
