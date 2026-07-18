// Adapter de Meta Messenger + Instagram Direct (FUTURO).
//
// Misma infraestructura Graph de Meta que WhatsApp -> se implementa igual que
// whatsapp.js: verificacion de webhook, firma X-Hub-Signature-256, parseo de
// `entry[].messaging[]` (PSID en vez de telefono) y envio via /me/messages.
// El core del bot no cambia; solo se completa este adapter.

function notReady() {
  throw new Error("Canal Messenger/Instagram todavia no configurado (adapter pendiente).");
}

module.exports = {
  channel: "messenger",
  ready: false,
  verifyWebhook: () => ({ ok: false }),
  verifySignature: () => false,
  parseInbound: () => [],
  send: notReady,
  sendTemplate: notReady,
  markRead: () => {},
};
