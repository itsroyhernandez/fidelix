const express = require("express");
const { applySecurity } = require("./security");

const authRoutes = require("./routes/auth");
const tenantRoutes = require("./routes/tenants");
const programRoutes = require("./routes/programs");
const loyaltyRoutes = require("./routes/loyalty");
const walletRoutes = require("./routes/wallet");
const superadminRoutes = require("./routes/superadmin");
const oauthRoutes = require("./routes/oauth");
const { router: paymentRoutes } = require("./routes/payments");
const { botRouter } = require("./bot");

function createApp() {
  const app = express();

  applySecurity(app); // helmet + cors + rate limit + json limit

  app.get("/api/health", (req, res) => res.json({ ok: true, service: "sello" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/auth/oauth", oauthRoutes);
  app.use("/api/tenants", tenantRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/programs", programRoutes);
  app.use("/api/loyalty", loyaltyRoutes);
  app.use("/api/wallet", walletRoutes);
  app.use("/api/super", superadminRoutes);
  app.use("/api/bot", botRouter);

  // 404
  app.use((req, res) => res.status(404).json({ error: "Recurso no encontrado" }));

  // Manejador de errores central (no filtra stack traces en prod).
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.message || "Error interno" });
  });

  return app;
}

module.exports = { createApp };
