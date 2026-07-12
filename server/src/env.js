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
};

// En dev exponemos el codigo de verificacion en la respuesta para poder testear.
env.exposeDevCode = !env.emailEnabled && !env.isProd;

module.exports = { env };
