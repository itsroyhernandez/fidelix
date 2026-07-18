// Mensaje normalizado, AGNOSTICO de canal.
// Cada adapter (whatsapp/messenger/tiktok) traduce su formato a esta forma,
// y el core del bot solo conoce esta estructura -> portar a otra red = escribir
// un adapter nuevo, sin tocar la logica de conversacion.

/**
 * @typedef {Object} InboundMessage
 * @property {string} channel      - "whatsapp" | "messenger" | "instagram" | "tiktok"
 * @property {string} externalId   - identificador de la persona en el canal (telefono/PSID)
 * @property {string} displayName  - nombre de perfil que reporta el canal (puede ir vacio)
 * @property {string} text         - texto plano del mensaje (botones/interactivos ya resueltos a texto)
 * @property {string} type         - "text" | "interactive" | "button" | "image" | "other"
 * @property {string} messageId    - id del mensaje en el canal (para marcar leido / dedupe)
 * @property {Object} raw          - payload original del canal (por si un flujo necesita mas)
 */

/**
 * @typedef {Object} OutboundReply
 * @property {string} text            - texto a enviar
 * @property {string[]} [quickReplies] - botones de respuesta rapida (max 3 en WhatsApp)
 */

function inbound(partial) {
  return {
    channel: partial.channel,
    externalId: String(partial.externalId || ""),
    displayName: partial.displayName || "",
    text: (partial.text || "").trim(),
    type: partial.type || "text",
    messageId: partial.messageId || "",
    raw: partial.raw || {},
  };
}

function reply(text, quickReplies) {
  return { text: String(text || ""), quickReplies: quickReplies || [] };
}

module.exports = { inbound, reply };
