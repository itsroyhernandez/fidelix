const crypto = require("crypto");

// Codigo corto legible para programas (sin caracteres ambiguos: 0/O, 1/I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function shortCode(len = 6) {
  let out = "";
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// Codigo numerico de 6 digitos para verificar correo.
function verifyCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function cardToken() {
  return crypto.randomBytes(16).toString("hex");
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

// Estado real del plan de una marca (calcula expiracion del trial al vuelo).
function tenantStatus(tenant) {
  if (!tenant) return { plan: "EXPIRED", expired: true, daysLeft: 0 };
  if (tenant.plan === "ACTIVE") return { plan: "ACTIVE", expired: false, daysLeft: null };

  const end = tenant.trialEndsAt ? new Date(tenant.trialEndsAt).getTime() : 0;
  const msLeft = end - Date.now();
  const expired = tenant.plan === "EXPIRED" || msLeft <= 0;
  return {
    plan: expired ? "EXPIRED" : "TRIAL",
    expired,
    daysLeft: Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000))),
    trialEndsAt: tenant.trialEndsAt,
  };
}

module.exports = { shortCode, verifyCode, cardToken, slugify, tenantStatus };
