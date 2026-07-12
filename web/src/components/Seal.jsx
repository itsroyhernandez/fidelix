// Marca de Fidelix: un sello de tinta real, no un cuadrado con gradiente.
// El anillo es levemente irregular (a mano), como un sello de caucho autentico.
export default function Seal({ size = 40, className = "" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`seal-mark ${className}`}
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="4.5" />
      <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2 4" />
      <path
        id="sealArcTop"
        d="M 15 50 A 35 35 0 0 1 85 50"
        fill="none"
      />
      <text fontSize="13.5" fontWeight="700" letterSpacing="3" fill="currentColor">
        <textPath href="#sealArcTop" startOffset="50%" textAnchor="middle">
          FIDELIX
        </textPath>
      </text>
      <path d="M40 56 L47 63 L61 47" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
