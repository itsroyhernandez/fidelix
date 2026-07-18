// Nucleo del bot — AGNOSTICO de canal.
// Recibe un mensaje ya normalizado + el adapter del canal, decide la respuesta
// (flujo estructurado o IA) y la envia. No conoce WhatsApp/Messenger/TikTok:
// eso vive en los adapters. Portar a otra red = escribir un adapter nuevo.

const svc = require("./services");
const { detectIntent, norm } = require("./intents");
const { FLOWS } = require("./flows");
const ai = require("./ai");

// Palabras que SIEMPRE cortan el flujo en curso y vuelven al menu.
const RESET_WORDS = ["menu", "menú", "cancelar", "salir", "cancel", "inicio"];

// Dedupe simple en memoria: Meta puede reintentar el webhook y no queremos
// procesar dos veces el mismo mensaje. (Para multi-instancia: mover a la DB.)
const seen = new Set();
function alreadyProcessed(messageId) {
  if (!messageId) return false;
  if (seen.has(messageId)) return true;
  seen.add(messageId);
  if (seen.size > 500) seen.delete(seen.values().next().value); // cap
  return false;
}

// Procesa UN mensaje entrante de un canal.
async function handle(adapter, msg) {
  if (alreadyProcessed(msg.messageId)) return;

  const identity = await svc.getOrCreateIdentity(msg.channel, msg.externalId, msg.displayName);
  await svc.logMessage(identity.id, msg.channel, "in", msg.text, { type: msg.type, messageId: msg.messageId });
  await svc.touchInbound(identity.id);

  const session = await svc.getSession(identity.id);
  const ctx = { identity, session, input: msg.text, channel: msg.channel };

  let result;
  try {
    result = await route(ctx);
  } catch (e) {
    console.error("[BOT] error en flujo:", e);
    const { reply } = require("./message");
    result = { replies: [reply("Uy, se me trabó algo 😅 Probá de nuevo o escribí *menú*.")], next: null };
  }

  // Persistir estado de la conversacion.
  if (result.next) {
    await svc.saveSession(identity.id, result.next);
  } else {
    await svc.clearSession(identity.id);
  }

  // Enviar respuestas + log saliente.
  for (const rep of result.replies) {
    try {
      await adapter.send(msg.externalId, rep);
      await svc.logMessage(identity.id, msg.channel, "out", rep.text, { quickReplies: rep.quickReplies });
    } catch (e) {
      console.error("[BOT] error enviando:", e.message);
    }
  }
  adapter.markRead && adapter.markRead(msg.messageId);
}

// Decide QUE responder.
async function route(ctx) {
  const text = ctx.input || "";

  // Mensaje sin texto (imagen/audio/sticker) -> ofrecer el menu.
  if (!text) return FLOWS.menu(ctx);

  // Reset global: corta cualquier flujo en curso.
  if (RESET_WORDS.includes(norm(text))) {
    ctx.session = { ...ctx.session, flow: "", step: "", data: {} };
    return FLOWS.menu(ctx);
  }

  // Si hay un flujo en curso, continuarlo (multi-paso).
  if (ctx.session.flow && FLOWS[ctx.session.flow]) {
    return FLOWS[ctx.session.flow](ctx);
  }

  // Sin flujo activo: detectar intencion por palabras clave.
  const intent = detectIntent(text);
  if (intent && FLOWS[intent]) {
    // Reinicia paso/datos al arrancar un flujo nuevo.
    ctx.session = { ...ctx.session, flow: intent, step: "", data: {} };
    return FLOWS[intent](ctx);
  }

  // Nada matcheó: la IA maneja la conversacion libre (si esta encendida).
  if (ai.isEnabled()) {
    const aiRes = await ai.respond(ctx);
    if (aiRes) return { replies: aiRes.replies, next: null };
  }

  // Fallback final: menu.
  return FLOWS.menu(ctx);
}

module.exports = { handle };
