// Adapter de TikTok (FUTURO, con salvedad importante).
//
// REALIDAD: TikTok NO ofrece hoy una API publica de mensajeria/DM para bots
// como WhatsApp o Messenger. Lo que si existe es la API de Lead Generation y la
// de comentarios. Por eso un "bot que responde DMs de TikTok" oficialmente no es
// viable por ahora. La jugada realista: captar leads de TikTok (formularios/comentarios)
// y derivarlos al bot de WhatsApp. Este stub queda como marcador de esa integracion.

function notReady() {
  throw new Error(
    "TikTok no expone API de DM para bots. Integracion realista: lead-gen -> derivar a WhatsApp."
  );
}

module.exports = {
  channel: "tiktok",
  ready: false,
  verifyWebhook: () => ({ ok: false }),
  verifySignature: () => false,
  parseInbound: () => [],
  send: notReady,
  sendTemplate: notReady,
  markRead: () => {},
};
