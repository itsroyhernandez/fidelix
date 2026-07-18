// Flujos estructurados del bot: la parte DETERMINISTICA (acciones que no pueden
// fallar ni alucinar: inscribir, sumar sello, canjear, vincular comercio).
// Cada flujo recibe un ctx y devuelve { replies, next }.
//   - replies: arreglo de respuestas a enviar (usar r()).
//   - next: { flow, step, data } para continuar multi-paso, o null para terminar (idle).
//
// Voseo costarricense en todo el copy de cara al cliente.

const { reply: r } = require("./message");
const { looksLikeCode } = require("./intents");
const svc = require("./services");
const { env } = require("../env");

const PLANES =
  "📦 *Start* — $49/mes, hasta 500 clientes\n" +
  "⚡ *Pulse* — $119/mes, hasta 3.000 clientes\n" +
  "🚀 *Hyper* — $349/mes, hasta 25.000 clientes\n" +
  "_+ $250 de implementación (una vez, incluye video de lanzamiento)._";

function done(replies) {
  return { replies: [].concat(replies), next: null };
}
function cont(replies, flow, step, data) {
  return { replies: [].concat(replies), next: { flow, step, data: data || {} } };
}

// --- MENU / bienvenida ---
async function menu(ctx) {
  const name = firstName(ctx.identity.displayName);
  const saludo = name ? `¡Hola, ${name}! 👋` : "¡Hola! 👋";
  if (ctx.identity.botRole === "MERCHANT") {
    return done(
      r(
        `${saludo} Soy el asistente de *Fidelix*. Como comercio podés:\n\n` +
          "• *Sumar sello* a un cliente\n• Ver el *reporte* del día\n\n¿Qué necesitás?",
        ["Sumar sello", "Reporte"]
      )
    );
  }
  return done(
    r(
      `${saludo} Soy el asistente de *Fidelix*, el sello digital de tus comercios favoritos. Puedo ayudarte a:\n\n` +
        "• *Inscribirte* a un programa (mandame el código)\n" +
        "• Ver *cuántos sellos* llevás\n" +
        "• Mostrar tu *tarjeta/QR*\n\n" +
        "También, si tenés un negocio, escribí *quiero Fidelix*.",
      ["Ver mis sellos", "Inscribirme", "Quiero Fidelix"]
    )
  );
}

// --- INSCRIBIRSE a un programa por codigo ---
async function enroll(ctx) {
  const { session, input } = ctx;
  // Arranque: si mandaron el codigo pelado, lo usamos; si no, lo pedimos.
  if (session.step !== "askCode") {
    if (looksLikeCode(input)) return finishEnroll(ctx, input);
    return cont(
      r("Perfecto 🎟️ Pasame el *código del programa* del comercio (ej: CAFE10)."),
      "enroll",
      "askCode"
    );
  }
  // Paso askCode: recibimos el codigo.
  return finishEnroll(ctx, input);
}

async function finishEnroll(ctx, code) {
  const user = await svc.ensureCustomerUser(ctx.identity);
  const res = await svc.enrollByCode(user.id, code);
  if (!res.ok) {
    return cont(
      r("Mmm, ese código no me aparece 🤔 Revisá que esté bien escrito y mandámelo de nuevo, o escribí *menú*."),
      "enroll",
      "askCode"
    );
  }
  const c = res.card;
  const head = res.already ? "Ya estabas inscrito 👍" : "¡Listo, quedaste inscrito! 🎉";
  return done(
    r(
      `${head}\n\n${c.brand?.emoji || "🎟️"} *${c.brand?.name || c.program.name}*\n` +
        `Llevás *${c.balance}/${c.program.goal}* ${c.program.emoji}\n` +
        (c.remaining > 0
          ? `Te faltan *${c.remaining}* para *${c.program.rewardText}*.`
          : `¡Ya completaste! Mostrá tu tarjeta en caja para *${c.program.rewardText}*.`),
      ["Ver mi tarjeta"]
    )
  );
}

// --- SALDO: cuantos sellos llevo ---
async function balance(ctx) {
  if (!ctx.identity.userId) {
    return cont(
      r("Todavía no tenés tarjetas 🎟️ Mandame el *código* de un comercio para inscribirte (ej: CAFE10)."),
      "enroll",
      "askCode"
    );
  }
  const cards = await svc.getCards(ctx.identity.userId);
  if (cards.length === 0) {
    return cont(
      r("Todavía no tenés tarjetas 🎟️ Mandame el *código* de un comercio para inscribirte."),
      "enroll",
      "askCode"
    );
  }
  const lines = cards.map((c) => {
    const estado =
      c.status === "COMPLETED" || c.status === "REDEEMED"
        ? "✅ lista para canjear"
        : `faltan ${c.remaining} para ${c.program.rewardText}`;
    return `${c.brand?.emoji || "🎟️"} *${c.brand?.name || c.program.name}* — ${c.balance}/${c.program.goal} (${estado})`;
  });
  return done(r("Tus tarjetas:\n\n" + lines.join("\n"), ["Ver mi tarjeta"]));
}

// --- TARJETA / QR ---
async function card(ctx) {
  if (!ctx.identity.userId) {
    return cont(
      r("Primero inscribite: mandame el *código* de un comercio (ej: CAFE10)."),
      "enroll",
      "askCode"
    );
  }
  const cards = await svc.getCards(ctx.identity.userId);
  const usable = cards.filter((c) => c.status !== "ARCHIVED");
  if (usable.length === 0) {
    return cont(r("No encontré tarjetas activas. Mandame un *código* para inscribirte."), "enroll", "askCode");
  }
  const blocks = usable.map(
    (c) =>
      `${c.brand?.emoji || "🎟️"} *${c.brand?.name || c.program.name}* (${c.balance}/${c.program.goal})\n` +
      `Mostrá este código en caja: \`${c.token}\`\n` +
      `Tarjeta: ${env.publicUrl}/?card=${c.token}`
  );
  return done(r(blocks.join("\n\n")));
}

// --- CANJE (info) ---
async function redeem(ctx) {
  if (!ctx.identity.userId) {
    return cont(r("Primero inscribite con el *código* de un comercio."), "enroll", "askCode");
  }
  const cards = await svc.getCards(ctx.identity.userId);
  const ready = cards.filter((c) => c.status === "COMPLETED");
  if (ready.length === 0) {
    const closest = cards.sort((a, b) => a.remaining - b.remaining)[0];
    if (!closest) return done(r("Todavía no tenés tarjetas. Mandame un *código* para empezar."));
    return done(
      r(`Todavía no hay premios listos. En *${closest.brand?.name || closest.program.name}* te faltan *${closest.remaining}* ${closest.program.emoji}. ¡Ya casi!`)
    );
  }
  const lines = ready.map((c) => `${c.brand?.emoji || "🎁"} *${c.brand?.name || c.program.name}* — ${c.program.rewardText}`);
  return done(
    r("¡Tenés premios listos! 🎉 Mostrá tu tarjeta en caja para canjear:\n\n" + lines.join("\n"), ["Ver mi tarjeta"])
  );
}

// --- COMERCIO: vincular cuenta (dueño/caja) por correo + codigo ---
async function merchant(ctx) {
  const { session, input } = ctx;
  if (session.step === "askEmail") {
    const user = await svc.findMerchantByEmail(input);
    if (!user) {
      return cont(
        r("No encontré un comercio con ese correo 🤔 Probá de nuevo, o si querés *contratar Fidelix* escribí *quiero Fidelix*."),
        "merchant",
        "askEmail"
      );
    }
    const code = sixDigits();
    // En dev el codigo se ve en consola (mismo patron que la verificacion de correo).
    console.log(`[BOT] Codigo de vinculacion para ${user.email}: ${code}`);
    const tail = env.botDevMode ? `\n\n_(modo dev: tu código es ${code})_` : "";
    return cont(
      r(`Te mandé un código de 6 dígitos a *${user.email}*. Escribilo acá para vincular tu negocio.${tail}`),
      "merchant",
      "askCode",
      { code, userId: user.id, attempts: 0 }
    );
  }
  if (session.step === "askCode") {
    const data = session.data || {};
    if (String(input).trim() === String(data.code)) {
      const user = { id: data.userId };
      await svc.linkMerchant(ctx.identity.id, user);
      ctx.identity.botRole = "MERCHANT";
      ctx.identity.userId = data.userId;
      return done(
        r("¡Negocio vinculado! ✅ Ahora podés *sumar sellos* a tus clientes y ver el *reporte* del día desde acá.", ["Sumar sello", "Reporte"])
      );
    }
    const attempts = (data.attempts || 0) + 1;
    if (attempts >= 3) {
      return done(r("Demasiados intentos. Escribí *soy comercio* para volver a empezar."));
    }
    return cont(r("Código incorrecto. Probá de nuevo."), "merchant", "askCode", { ...data, attempts });
  }
  // Arranque
  return cont(
    r("Vamos a vincular tu negocio 🏪 Pasame el *correo* con el que entrás a tu panel de Fidelix."),
    "merchant",
    "askEmail"
  );
}

// --- COMERCIO: sumar un sello a un cliente ---
async function merchantAdd(ctx) {
  const merchantUser = await requireMerchant(ctx);
  if (!merchantUser) return notMerchant();

  if (ctx.session.step === "askToken") {
    const res = await svc.addStampByToken(merchantUser, ctx.input, 1, "chat");
    if (!res.ok) return done(r(stampError(res.error)));
    const c = res.card;
    const extra = c.status === "COMPLETED" ? "\n🎉 ¡Completó! Ya puede canjear." : "";
    return done(r(`Sello sumado ✅\n${c.brand?.emoji || "🎟️"} ${c.balance}/${c.program.goal}${extra}`));
  }
  return cont(
    r("Pasame el *código de la tarjeta* del cliente (lo ves en su QR) para sumarle el sello."),
    "merchantAdd",
    "askToken"
  );
}

// --- COMERCIO: reporte del dia ---
async function merchantReport(ctx) {
  const merchantUser = await requireMerchant(ctx);
  if (!merchantUser) return notMerchant();
  const rep = await svc.merchantDailyReport(merchantUser.tenantId);
  return done(
    r(
      "📊 *Reporte de hoy*\n\n" +
        `• Sellos sumados: *${rep.sellosHoy}*\n` +
        `• Escaneos: *${rep.escaneosHoy}*\n` +
        `• Canjes: *${rep.canjesHoy}*\n` +
        `• Clientes nuevos: *${rep.clientesNuevosHoy}*\n` +
        `• Tarjetas activas: *${rep.tarjetasActivas}*`
    )
  );
}

// --- VENTAS: captar un comercio interesado (lead-gen) ---
async function sales(ctx) {
  const { session, input } = ctx;
  if (session.step === "askBiz") {
    const biz = String(input).trim().slice(0, 120);
    const lead = { name: ctx.identity.displayName, contact: ctx.identity.externalId, biz, at: new Date().toISOString() };
    console.log(`[BOT][LEAD] ${JSON.stringify(lead)}`);
    if (env.bot.salesInbox) console.log(`[BOT][LEAD] avisar a ${env.bot.salesInbox}`);
    return done(
      r(
        `¡Gracias! 🙌 Anoté *${biz}*. Un asesor de Movix te contacta para armar tu programa.\n\n` +
          "Mientras tanto, los planes:\n" +
          PLANES,
        ["Ver la web"]
      )
    );
  }
  return cont(
    r(
      "¡Buenísimo que quieras Fidelix para tu negocio! 🚀\n\n" +
        "Es tu propio programa de lealtad con *tu marca*: sellos digitales, QR, sin apps.\n\n" +
        PLANES +
        "\n\n¿Cómo se llama tu negocio y de qué es?"
    ),
    "sales",
    "askBiz"
  );
}

// --- SOPORTE: FAQ + derivar a humano ---
async function support(ctx) {
  const handoff = env.bot.humanHandoff
    ? `\n\nSi querés hablar con una persona, escribinos: https://wa.me/${env.bot.humanHandoff}`
    : "";
  return done(
    r(
      "Estoy para ayudarte 🤝 Puedo:\n" +
        "• Inscribirte a un programa (mandame el código)\n" +
        "• Decirte cuántos sellos llevás\n" +
        "• Mostrarte tu tarjeta/QR\n" +
        "Escribí *menú* para ver las opciones." +
        handoff
    )
  );
}

// ---------------------------------------------------------------------------
// Helpers de flujo
// ---------------------------------------------------------------------------

async function requireMerchant(ctx) {
  if (ctx.identity.botRole !== "MERCHANT" || !ctx.identity.userId) return null;
  const { prisma } = require("../prisma");
  const user = await prisma.user.findUnique({ where: { id: ctx.identity.userId } });
  if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) return null;
  return user;
}
function notMerchant() {
  return cont(
    r("Para esto primero vinculá tu negocio. Escribí *soy comercio* y seguimos."),
    "merchant",
    ""
  );
}
function stampError(code) {
  if (code === "CARD_NOT_FOUND") return "No encontré esa tarjeta. Revisá el código del QR.";
  if (code === "WRONG_TENANT") return "Esa tarjeta es de otro negocio, no puedo sumarle.";
  if (code === "ALREADY_REDEEMED") return "Esa tarjeta ya fue canjeada.";
  return "No pude sumar el sello. Probá de nuevo.";
}
function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "";
}
function sixDigits() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Mapa intent -> flujo.
const FLOWS = { menu, enroll, balance, card, redeem, merchant, merchantAdd, merchantReport, sales, support };

module.exports = { FLOWS };
