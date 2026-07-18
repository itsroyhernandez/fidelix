require("dotenv").config();

function required(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Falta la variable de entorno ${name}. Copia .env.example a .env`);
  }
  return v;
}

const env = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  retentionDays: Number(process.env.RETENTION_DAYS || 90),
  appleWalletEnabled: process.env.APPLE_WALLET_ENABLED === "true",
  googleWalletEnabled: process.env.GOOGLE_WALLET_ENABLED === "true",
  // Email (verificacion de correo). Sin proveedor -> modo dev (codigo en consola/panel).
  emailEnabled: process.env.EMAIL_ENABLED === "true",
  emailApiKey: process.env.EMAIL_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "no-reply@sello.app",
  trialDays: Number(process.env.TRIAL_DAYS || 3),
  isProd: process.env.NODE_ENV === "production",

  // URL publica del frontend (para armar links de tarjeta/QR en los mensajes del bot).
  publicUrl: process.env.PUBLIC_URL || "http://localhost:5173",

  // --- Chatbot omnicanal ---
  bot: {
    // WhatsApp Business Cloud API (oficial de Meta -> NO banean el numero).
    whatsapp: {
      enabled: process.env.WHATSAPP_ENABLED === "true",
      token: process.env.WHATSAPP_TOKEN || "", // access token (permanente / system user)
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "fidelix-verify", // reto del webhook (GET)
      appSecret: process.env.WHATSAPP_APP_SECRET || "", // firma X-Hub-Signature-256
      apiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
    },
    // Capa de IA (Claude). Sin API key -> el bot corre en modo solo-flujos.
    ai: {
      enabled: process.env.BOT_AI_ENABLED === "true" && !!process.env.ANTHROPIC_API_KEY,
      apiKey: process.env.ANTHROPIC_API_KEY || "",
      // Por defecto el modelo mas capaz. Para alto volumen podes bajar a
      // "claude-haiku-4-5" (mas barato y rapido) via BOT_AI_MODEL.
      model: process.env.BOT_AI_MODEL || "claude-opus-4-8",
      maxSteps: Number(process.env.BOT_AI_MAX_STEPS || 6),
    },
    // Contacto para derivar a un humano (numero de WhatsApp de Movix, formato E.164 sin +).
    humanHandoff: process.env.BOT_HUMAN_HANDOFF || "",
    // A donde llegan los leads de ventas captados por el bot.
    salesInbox: process.env.BOT_SALES_INBOX || "",
  },
};

// El bot solo enciende de verdad si WhatsApp esta configurado; si no, modo dev
// (los mensajes salientes se imprimen en consola y se puede simular el flujo).
env.botDevMode = !env.bot.whatsapp.enabled;

// En dev exponemos el codigo de verificacion en la respuesta para poder testear.
env.exposeDevCode = !env.emailEnabled && !env.isProd;

module.exports = { env };
