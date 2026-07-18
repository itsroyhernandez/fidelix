// Adapter del canal WhatsApp — WhatsApp Business Cloud API (OFICIAL de Meta).
//
// Por que la API oficial y no una libreria tipo Baileys/whatsapp-web.js:
// esas se cuelgan de WhatsApp Web por ingenieria inversa y Meta BANEA el numero.
// La Cloud API es el canal sancionado: numero dedicado, hospedado por Meta, sin
// riesgo de baneo. A cambio hay que respetar sus reglas (ventana de 24h + plantillas
// aprobadas para mensajes proactivos) — ver README del bot.

const crypto = require("crypto");
const { env } = require("../../env");
const { inbound } = require("../message");

const cfg = env.bot.whatsapp;

// --- Webhook: verificacion inicial (GET). Meta manda hub.challenge y hay que devolverlo. ---
function verifyWebhook(query) {
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];
  if (mode === "subscribe" && token === cfg.verifyToken) {
    return { ok: true, challenge };
  }
  return { ok: false };
}

// --- Webhook: verificacion de firma (POST). Garantiza que el POST viene de Meta. ---
// Meta firma el cuerpo crudo con el App Secret usando HMAC-SHA256.
function verifySignature(rawBody, signatureHeader) {
  // Sin appSecret configurado no podemos verificar; en dev lo dejamos pasar.
  if (!cfg.appSecret) return env.botDevMode;
  if (!signatureHeader || !rawBody) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", cfg.appSecret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// --- Parseo de mensajes entrantes -> lista de InboundMessage normalizados. ---
// El payload de Meta anida entry[].changes[].value.{messages,contacts,statuses}.
// Ignoramos los "statuses" (acuses de entrega/lectura), solo nos interesan messages.
function parseInbound(body) {
  const out = [];
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change.value || {};
      const messages = Array.isArray(value.messages) ? value.messages : [];
      // Mapa de telefono -> nombre de perfil (viene en value.contacts).
      const names = {};
      for (const c of value.contacts || []) {
        if (c.wa_id) names[c.wa_id] = c.profile?.name || "";
      }
      for (const m of messages) {
        out.push(
          inbound({
            channel: "whatsapp",
            externalId: m.from,
            displayName: names[m.from] || "",
            text: extractText(m),
            type: m.type || "text",
            messageId: m.id || "",
            raw: m,
          })
        );
      }
    }
  }
  return out;
}

// Extrae texto util de cualquier tipo de mensaje (texto, boton, lista interactiva).
function extractText(m) {
  if (m.type === "text") return m.text?.body || "";
  if (m.type === "button") return m.button?.text || "";
  if (m.type === "interactive") {
    const i = m.interactive || {};
    if (i.type === "button_reply") return i.button_reply?.title || i.button_reply?.id || "";
    if (i.type === "list_reply") return i.list_reply?.title || i.list_reply?.id || "";
  }
  // Imagenes/audio/etc.: devolvemos vacio y el bot responde con el menu.
  return "";
}

// --- Envio de un mensaje de texto (con botones opcionales de respuesta rapida). ---
async function send(to, replyObj) {
  const text = typeof replyObj === "string" ? replyObj : replyObj.text;
  const quickReplies = (replyObj && replyObj.quickReplies) || [];

  // Modo dev / sin credenciales: no llamamos a Meta, imprimimos en consola.
  if (env.botDevMode || !cfg.token || !cfg.phoneNumberId) {
    console.log(`\n[WhatsApp DEV] -> ${to}\n${text}${quickReplies.length ? `\n[botones: ${quickReplies.join(" | ")}]` : ""}\n`);
    return { dev: true };
  }

  const payload = buildTextPayload(to, text, quickReplies);
  return callGraph(payload);
}

function buildTextPayload(to, text, quickReplies) {
  // Con hasta 3 opciones usamos botones interactivos; si no, texto plano.
  if (quickReplies.length > 0 && quickReplies.length <= 3) {
    return {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text },
        action: {
          buttons: quickReplies.map((title, i) => ({
            type: "reply",
            reply: { id: `qr_${i}`, title: String(title).slice(0, 20) },
          })),
        },
      },
    };
  }
  return {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { preview_url: true, body: text },
  };
}

// --- Envio de PLANTILLA aprobada (para mensajes PROACTIVOS fuera de la ventana de 24h). ---
// Ej: recordatorio "te falta 1 sello". Requiere que la plantilla exista y este
// aprobada por Meta en el WhatsApp Manager. category = utility | marketing | authentication.
async function sendTemplate(to, templateName, languageCode, components) {
  if (env.botDevMode || !cfg.token || !cfg.phoneNumberId) {
    console.log(`\n[WhatsApp DEV] plantilla "${templateName}" -> ${to}\n`);
    return { dev: true };
  }
  return callGraph({
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode || "es" },
      components: components || [],
    },
  });
}

// --- Marcar un mensaje como leido (mejora la experiencia y la calidad del numero). ---
async function markRead(messageId) {
  if (env.botDevMode || !cfg.token || !cfg.phoneNumberId || !messageId) return;
  try {
    await callGraph({ messaging_product: "whatsapp", status: "read", message_id: messageId });
  } catch {
    /* no critico */
  }
}

// Llamada base a la Graph API de Meta (fetch nativo de Node 18+).
async function callGraph(payload) {
  const url = `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(`WhatsApp API: ${msg}`);
  }
  return data;
}

module.exports = {
  channel: "whatsapp",
  verifyWebhook,
  verifySignature,
  parseInbound,
  send,
  sendTemplate,
  markRead,
};
