// Rutas HTTP del bot: el webhook por canal.
//   GET  /api/bot/:channel/webhook  -> verificacion inicial (Meta manda hub.challenge)
//   POST /api/bot/:channel/webhook  -> recepcion de mensajes (verifica firma)
//   GET  /api/bot/status            -> estado de configuracion (sin secretos)

const express = require("express");
const { env } = require("../env");
const engine = require("./engine");
const ai = require("./ai");

// Registro de adapters por canal. Agregar Messenger/TikTok = enchufar aca.
const ADAPTERS = {
  whatsapp: require("./channels/whatsapp"),
  messenger: require("./channels/messenger"),
  tiktok: require("./channels/tiktok"),
};

const router = express.Router();

function getAdapter(channel) {
  return ADAPTERS[channel] || null;
}

// --- Verificacion del webhook (GET) ---
router.get("/:channel/webhook", (req, res) => {
  const adapter = getAdapter(req.params.channel);
  if (!adapter) return res.sendStatus(404);
  const result = adapter.verifyWebhook(req.query);
  if (result.ok) return res.status(200).send(result.challenge);
  return res.sendStatus(403);
});

// --- Recepcion de mensajes (POST) ---
router.post("/:channel/webhook", (req, res) => {
  const adapter = getAdapter(req.params.channel);
  if (!adapter) return res.sendStatus(404);

  // Verificar que el POST viene de verdad de Meta (firma HMAC sobre el cuerpo crudo).
  const signature = req.headers["x-hub-signature-256"];
  if (!adapter.verifySignature(req.rawBody, signature)) {
    return res.sendStatus(401);
  }

  // Meta exige un 200 rapido; procesamos los mensajes en segundo plano.
  res.sendStatus(200);

  let messages = [];
  try {
    messages = adapter.parseInbound(req.body);
  } catch (e) {
    console.error("[BOT] parseInbound:", e.message);
    return;
  }
  for (const msg of messages) {
    engine.handle(adapter, msg).catch((e) => console.error("[BOT] handle:", e));
  }
});

// --- Estado (util para depurar la configuracion, sin exponer secretos) ---
router.get("/status", (req, res) => {
  res.json({
    channels: {
      whatsapp: {
        enabled: env.bot.whatsapp.enabled,
        configured: !!(env.bot.whatsapp.token && env.bot.whatsapp.phoneNumberId),
        devMode: env.botDevMode,
      },
      messenger: { ready: false },
      tiktok: { ready: false, note: "TikTok no ofrece API de DM para bots" },
    },
    ai: { enabled: ai.isEnabled(), model: env.bot.ai.enabled ? env.bot.ai.model : null },
  });
});

module.exports = router;
