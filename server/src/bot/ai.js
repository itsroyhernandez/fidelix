// Capa de IA del bot: Claude como AGENTE con herramientas reales sobre el dominio
// de lealtad (consultar saldo, inscribir, info de programa, captar lead, derivar a
// humano). Es el "cerebro" para lo que los flujos estructurados no cubren: preguntas
// libres, en voseo, con la voz de Fidelix.
//
// Diseño hibrido: los flujos manejan las acciones criticas de forma deterministica;
// la IA maneja la conversacion abierta y puede EJECUTAR acciones via tools.
//
// Sin ANTHROPIC_API_KEY -> este modulo se desactiva y el bot cae a solo-flujos.

const { env } = require("../env");
const svc = require("./services");

const aiCfg = env.bot.ai;

let client = null;
function getClient() {
  if (client) return client;
  const mod = require("@anthropic-ai/sdk");
  const Anthropic = mod.default || mod;
  client = new Anthropic({ apiKey: aiCfg.apiKey });
  return client;
}

function isEnabled() {
  return !!aiCfg.enabled;
}

const SYSTEM = `Sos el asistente virtual de *Fidelix*, una plataforma costarricense de programas de lealtad (sellos digitales) para comercios. Fidelix es desarrollado por Movix.

TU VOZ:
- Español de Costa Rica, VOSEO (vos/sos/tenés/querés/mandame). Cercano, claro, sin sonar robot.
- Mensajes CORTOS (es WhatsApp): 1-3 frases. Usá emojis con moderación.
- Nunca inventes datos: si no sabés el saldo o un programa, USÁ las herramientas.

QUÉ PODÉS HACER (con herramientas):
- Consultar los sellos/tarjetas de la persona.
- Inscribir a la persona a un programa con su código (ej: CAFE10).
- Dar info de un programa por su código.
- Captar un negocio interesado en contratar Fidelix (lead).
- Derivar a un humano.

REGLAS:
- Si la persona quiere inscribirse pero no da código, pedíselo.
- Si pregunta por precios/planes: Start $49 (500 clientes), Pulse $119 (3.000), Hyper $349 (25.000), + $250 de implementación una vez. Si es un negocio interesado, captá el lead.
- No prometas cosas que Fidelix no hace. Si no podés ayudar, ofrecé derivar a un humano o escribir "menú".`;

const TOOLS = [
  {
    name: "get_my_cards",
    description: "Devuelve las tarjetas de lealtad de la persona con su saldo de sellos. Usar cuando pregunte cuántos sellos lleva, su saldo, o su tarjeta.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "enroll_in_program",
    description: "Inscribe a la persona en un programa de lealtad usando el código corto del comercio (ej: CAFE10).",
    input_schema: {
      type: "object",
      properties: { code: { type: "string", description: "Código del programa, ej: CAFE10" } },
      required: ["code"],
      additionalProperties: false,
    },
  },
  {
    name: "get_program_info",
    description: "Devuelve la información de un programa por su código (nombre, comercio, recompensa, meta).",
    input_schema: {
      type: "object",
      properties: { code: { type: "string" } },
      required: ["code"],
      additionalProperties: false,
    },
  },
  {
    name: "capture_lead",
    description: "Registra a un negocio interesado en contratar Fidelix. Usar cuando alguien con un negocio quiere info/contratar.",
    input_schema: {
      type: "object",
      properties: {
        business: { type: "string", description: "Nombre y rubro del negocio" },
        note: { type: "string", description: "Detalle de lo que pidió" },
      },
      required: ["business"],
      additionalProperties: false,
    },
  },
  {
    name: "request_human",
    description: "Devuelve la forma de contactar a un humano de Movix. Usar cuando la persona pide hablar con alguien o el bot no puede resolver.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
];

// Ejecuta una herramienta y devuelve texto (JSON) para el tool_result.
async function executeTool(name, input, ctx) {
  try {
    if (name === "get_my_cards") {
      if (!ctx.identity.userId) return JSON.stringify({ cards: [], hint: "Sin tarjetas; pedir código para inscribir." });
      const cards = await svc.getCards(ctx.identity.userId);
      return JSON.stringify({ cards });
    }
    if (name === "enroll_in_program") {
      const user = await svc.ensureCustomerUser(ctx.identity);
      const res = await svc.enrollByCode(user.id, input.code);
      return JSON.stringify(res);
    }
    if (name === "get_program_info") {
      const p = await svc.getProgramByCode(input.code);
      if (!p) return JSON.stringify({ found: false });
      return JSON.stringify({
        found: true,
        name: p.name,
        brand: p.tenant?.name,
        reward: p.rewardText,
        goal: p.goal,
        type: p.type,
      });
    }
    if (name === "capture_lead") {
      const lead = { name: ctx.identity.displayName, contact: ctx.identity.externalId, business: input.business, note: input.note || "", at: new Date().toISOString() };
      console.log(`[BOT][LEAD] ${JSON.stringify(lead)}`);
      return JSON.stringify({ ok: true });
    }
    if (name === "request_human") {
      return JSON.stringify({ contact: env.bot.humanHandoff ? `https://wa.me/${env.bot.humanHandoff}` : "El equipo de Movix te contactará." });
    }
    return JSON.stringify({ error: "unknown_tool" });
  } catch (e) {
    return JSON.stringify({ error: String(e.message || e) });
  }
}

// Punto de entrada: responde un mensaje libre. Devuelve { replies:[reply] } o null.
async function respond(ctx) {
  if (!isEnabled()) return null;

  const anthropic = getClient();
  const context = await buildContext(ctx);
  const messages = [
    { role: "user", content: `${context}\n\nMensaje de la persona: ${ctx.input}` },
  ];

  let finalText = "";
  for (let step = 0; step < aiCfg.maxSteps; step++) {
    const res = await anthropic.messages.create({
      model: aiCfg.model,
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      tools: TOOLS,
      messages,
    });

    // Texto que haya producido en esta vuelta.
    finalText = res.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (res.stop_reason !== "tool_use") break;

    const toolUses = res.content.filter((b) => b.type === "tool_use");
    messages.push({ role: "assistant", content: res.content });
    const results = [];
    for (const t of toolUses) {
      const out = await executeTool(t.name, t.input || {}, ctx);
      results.push({ type: "tool_result", tool_use_id: t.id, content: out });
    }
    messages.push({ role: "user", content: results });
  }

  const { reply: r } = require("./message");
  if (!finalText) finalText = "Perdón, no te entendí bien 🤔 Escribí *menú* para ver lo que puedo hacer.";
  return { replies: [r(finalText)] };
}

// Contexto compacto que le damos a Claude sobre quién escribe.
async function buildContext(ctx) {
  const id = ctx.identity;
  const parts = [
    `CONTEXTO — canal: ${id.channel}; nombre: ${id.displayName || "(desconocido)"}; rol: ${id.botRole}.`,
  ];
  if (id.userId) {
    const cards = await svc.getCards(id.userId);
    parts.push(`La persona tiene ${cards.length} tarjeta(s).`);
  } else {
    parts.push("La persona aún no está inscrita en ningún programa.");
  }
  return parts.join(" ");
}

module.exports = { respond, isEnabled };
