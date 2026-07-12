const express = require("express");
const { env } = require("../env");

const router = express.Router();

// Login social: Google, Apple ID y Microsoft.
// El flujo OAuth real necesita registrar la app en cada proveedor y pegar
// CLIENT_ID / CLIENT_SECRET / REDIRECT_URI. Aqui dejamos el punto de entrada
// listo; mientras no haya credenciales, responde con instrucciones (501).
const PROVIDERS = {
  google: {
    label: "Google",
    envKey: "GOOGLE_OAUTH_CLIENT_ID",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scope: "openid email profile",
  },
  microsoft: {
    label: "Microsoft",
    envKey: "MICROSOFT_OAUTH_CLIENT_ID",
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    scope: "openid email profile",
  },
  apple: {
    label: "Apple",
    envKey: "APPLE_OAUTH_CLIENT_ID",
    authUrl: "https://appleid.apple.com/auth/authorize",
    scope: "name email",
  },
};

router.get("/:provider/start", (req, res) => {
  const p = PROVIDERS[req.params.provider];
  if (!p) return res.status(404).json({ error: "Proveedor no soportado" });

  const clientId = process.env[p.envKey];
  if (!clientId) {
    return res.status(501).json({
      error: `Login con ${p.label} aún no configurado`,
      hint: `Registrá la app en ${p.label}, luego definí ${p.envKey}, ${p.envKey.replace(
        "CLIENT_ID",
        "CLIENT_SECRET"
      )} y OAUTH_REDIRECT_URI en el .env.`,
      provider: req.params.provider,
    });
  }

  // TODO(prod): construir la URL con state/PKCE y redirigir:
  //   const url = `${p.authUrl}?client_id=${clientId}&redirect_uri=...&response_type=code&scope=${p.scope}`;
  //   res.redirect(url);
  res.status(501).json({ error: "Callback OAuth pendiente de implementar" });
});

module.exports = router;
