// Deteccion de intencion por palabras clave (rapida, deterministica, en voseo CR).
// Es la primera linea: si algo matchea, va directo a su flujo. Lo que no matchea
// cae a la capa de IA (si esta encendida) o al menu.

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // quita tildes
}

// Un codigo de programa se ve como token corto alfanumerico en mayusculas (ej: CAFE10).
function looksLikeCode(text) {
  return /^[A-Z0-9]{4,12}$/.test(String(text || "").trim());
}

const RULES = [
  { intent: "menu", words: ["menu", "hola", "buenas", "ayuda", "help", "inicio", "empezar", "start"] },
  { intent: "enroll", words: ["inscrib", "unir", "registr", "codigo", "afiliar", "sumarme"] },
  { intent: "balance", words: ["sellos", "cuantos", "cuanto llevo", "saldo", "puntos", "mi tarjeta", "mis tarjetas", "cuanto me falta"] },
  { intent: "card", words: ["qr", "mostrar tarjeta", "ver tarjeta", "mi qr", "codigo qr"] },
  { intent: "redeem", words: ["canje", "canjear", "premio", "reclamar", "recompensa"] },
  { intent: "merchant", words: ["soy comercio", "soy dueno", "mi negocio", "soy caja", "panel", "vincular negocio", "soy admin"] },
  { intent: "merchantAdd", words: ["sumar sello", "agregar sello", "dar sello", "poner sello"] },
  { intent: "merchantReport", words: ["reporte", "reportes", "resumen del dia", "estadisticas", "ventas de hoy"] },
  { intent: "sales", words: ["quiero fidelix", "precio", "precios", "planes", "cuanto cuesta", "contratar", "info", "informacion", "quiero uno", "para mi negocio"] },
  { intent: "support", words: ["humano", "agente", "hablar con alguien", "soporte", "ayuda humana", "persona"] },
];

// Devuelve el intent detectado o null.
function detectIntent(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  if (looksLikeCode(raw)) return "enroll"; // mandaron un codigo pelado -> inscribir

  const t = norm(raw);
  for (const rule of RULES) {
    if (rule.words.some((w) => t.includes(norm(w)))) return rule.intent;
  }
  return null;
}

module.exports = { detectIntent, looksLikeCode, norm };
