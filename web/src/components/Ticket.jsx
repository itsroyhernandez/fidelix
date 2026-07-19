// Marca de Fidelix: el boleto perforado con muesca de rasgado -- la forma que
// el cliente ya sostiene en pantalla (StampDemo/CustomerView), no una metafora
// abstracta. Geometria de maquina (lineas rectas, corte limpio) a proposito:
// es lo opuesto al Seal (organico, prensado a mano) por diseño.
// Monocromo via currentColor: funciona en cualquier contexto de color/tamaño.
export default function Ticket({ size = 32, className = "" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`ticket-mark ${className}`}
      aria-hidden="true"
    >
      <rect x="8" y="24" width="84" height="52" rx="6" fill="none" stroke="currentColor" strokeWidth="5" />
      <line x1="32" y1="24" x2="32" y2="76" stroke="currentColor" strokeWidth="2.6" strokeDasharray="5 5.5" opacity="0.85" />
      <circle cx="32" cy="24" r="4.5" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <circle cx="32" cy="76" r="4.5" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <path d="M52 52 L59 59 L74 42" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
