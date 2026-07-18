const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { env } = require("./env");

// Capas de seguridad de la industria (OWASP). Ningun sistema es 100% "inhackeable",
// pero esto cubre las vulnerabilidades mas comunes de una API retail.
function applySecurity(app) {
  app.disable("x-powered-by");

  // Headers de seguridad (CSP, HSTS, anti-clickjacking, etc.)
  app.use(
    helmet({
      contentSecurityPolicy: env.isProd ? undefined : false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  // Solo el frontend autorizado puede llamar la API.
  app.use(
    cors({
      origin: env.corsOrigin.split(",").map((s) => s.trim()),
      credentials: true,
    })
  );

  // Limite de tamaño de payload (anti-DoS por cuerpos gigantes).
  // Guardamos el cuerpo crudo (rawBody) para poder verificar la firma HMAC del
  // webhook de WhatsApp/Meta (X-Hub-Signature-256), que se calcula sobre los bytes exactos.
  app.use(
    require("express").json({
      limit: "100kb",
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // Rate limit global: frena fuerza bruta / abuso.
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Demasiadas solicitudes, intenta mas tarde" },
    })
  );
}

// Limite mas estricto para login/registro (anti fuerza bruta de credenciales).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos de autenticacion" },
});

module.exports = { applySecurity, authLimiter };
