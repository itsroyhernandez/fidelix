// Set de íconos propios de Fidelix: trazo fino, heredan currentColor,
// coherentes con el logo de sello. Reemplazan los emojis del chrome (paneles,
// stats) para que todo lea como un sistema y no como "sopa de emojis".
const P = {
  users: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 19a6 6 0 0 1 12 0M17 11a3 3 0 1 0-2-5.2M15.5 13.6A6 6 0 0 1 21 19",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  progress: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
  check: "M20 6 9 17l-5-5",
  gift: "M20 12v8H4v-8M2 8h20v4H2zM12 8v12M12 8S9.5 3 7 4.5 8 8 12 8ZM12 8s2.5-5 5-3.5S16 8 12 8Z",
  stamp: "M12 3.5 14.2 8l5 .7-3.6 3.5.9 5-4.5-2.4L7.5 17l.9-5L4.8 8.7l5-.7L12 3.5Z",
  building: "M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M14 9h4a2 2 0 0 1 2 2v10M7 7h.01M7 11h.01M7 15h.01M11 7h.01M11 11h.01M11 15h.01",
  card: "M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM2 10h20M6 15h4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
  mail: "M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM2.5 7 12 13l9.5-6",
  chart: "M4 20V4M4 20h16M8 20v-6M12 20V9M16 20v-9",
  scan: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16",
  palette: "M12 3a9 9 0 0 0 0 18c1.7 0 2-1.5 1-2.5s-.5-2.5 1-2.5h1.5A4.5 4.5 0 0 0 21 11.5 8.5 8.5 0 0 0 12 3ZM7.5 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM12 8.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM16 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  plus: "M12 5v14M5 12h14",
};

export default function Icon({ name, size = 22, stroke = 1.6, className = "" }) {
  const d = P[name] || P.target;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon ${className}`}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
