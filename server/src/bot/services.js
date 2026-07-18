// Servicios del bot: puente entre la conversacion y la base de datos de Fidelix.
// Reusa la MISMA logica de lealtad que la API HTTP (inscribir, sumar sello, canjear)
// para que el chat y el panel sean coherentes.

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { prisma } = require("../prisma");
const { cardToken } = require("../util");

// ---------------------------------------------------------------------------
// Identidad de canal + sesion de conversacion
// ---------------------------------------------------------------------------

// Devuelve (creando si hace falta) la identidad de quien escribe en un canal.
async function getOrCreateIdentity(channel, externalId, displayName) {
  const existing = await prisma.channelIdentity.findUnique({
    where: { channel_externalId: { channel, externalId } },
    include: { user: true, session: true },
  });
  if (existing) {
    // Actualiza el nombre de perfil si el canal ahora lo reporta.
    if (displayName && displayName !== existing.displayName) {
      await prisma.channelIdentity.update({
        where: { id: existing.id },
        data: { displayName },
      });
      existing.displayName = displayName;
    }
    return existing;
  }
  return prisma.channelIdentity.create({
    data: { channel, externalId, displayName: displayName || "" },
    include: { user: true, session: true },
  });
}

// Estado de conversacion (flujo/paso/datos). Siempre devuelve algo usable.
async function getSession(identityId) {
  const s = await prisma.botSession.findUnique({ where: { identityId } });
  if (s) return { ...s, data: safeParse(s.data) };
  return { identityId, flow: "", step: "", data: {}, lastInboundAt: null };
}

// Guarda (upsert) el estado del flujo en curso.
async function saveSession(identityId, { flow, step, data }) {
  const payload = {
    flow: flow || "",
    step: step || "",
    data: JSON.stringify(data || {}),
  };
  await prisma.botSession.upsert({
    where: { identityId },
    create: { identityId, ...payload },
    update: payload,
  });
}

// Limpia el flujo (vuelve a idle) sin borrar la fila (conserva lastInboundAt).
async function clearSession(identityId) {
  await prisma.botSession.upsert({
    where: { identityId },
    create: { identityId, flow: "", step: "", data: "{}" },
    update: { flow: "", step: "", data: "{}" },
  });
}

// Marca el momento del ultimo mensaje del usuario (ventana de servicio de 24h).
async function touchInbound(identityId) {
  await prisma.botSession.upsert({
    where: { identityId },
    create: { identityId, lastInboundAt: new Date() },
    update: { lastInboundAt: new Date() },
  });
}

// Bitacora de mensajes (entrantes/salientes) para depuracion y calidad.
async function logMessage(identityId, channel, direction, text, meta) {
  try {
    await prisma.botMessage.create({
      data: { identityId, channel, direction, text: text || "", meta: JSON.stringify(meta || {}) },
    });
  } catch {
    /* el log nunca debe tumbar la conversacion */
  }
}

// ---------------------------------------------------------------------------
// Usuarios: vincular una identidad de chat con un User de Fidelix
// ---------------------------------------------------------------------------

// Garantiza que la identidad tenga un User CLIENTE detras. En WhatsApp el numero
// ES la identidad, asi que si no hay usuario creamos uno "nativo de chat"
// (verificado por posesion del numero) para poder emitirle tarjetas.
async function ensureCustomerUser(identity) {
  if (identity.userId) {
    const user = await prisma.user.findUnique({ where: { id: identity.userId } });
    if (user) return user;
  }
  const email = `wa+${identity.externalId}@fidelix.bot`;
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const randomPass = crypto.randomBytes(24).toString("hex");
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(randomPass, 12),
        name: identity.displayName || "Cliente WhatsApp",
        role: "CUSTOMER",
        emailVerified: true, // posesion del numero = verificacion
      },
    });
  }
  await prisma.channelIdentity.update({
    where: { id: identity.id },
    data: { userId: user.id, botRole: "CUSTOMER" },
  });
  identity.userId = user.id;
  identity.botRole = "CUSTOMER";
  return user;
}

// Busca un usuario de comercio (dueño o caja) por correo, para vincularlo al chat.
async function findMerchantByEmail(email) {
  const user = await prisma.user.findUnique({
    where: { email: String(email || "").trim().toLowerCase() },
  });
  if (!user) return null;
  if (user.role !== "ADMIN" && user.role !== "STAFF") return null;
  return user;
}

// Vincula la identidad de chat a un usuario de comercio ya verificado por codigo.
async function linkMerchant(identityId, user) {
  await prisma.channelIdentity.update({
    where: { id: identityId },
    data: { userId: user.id, botRole: "MERCHANT" },
  });
}

// ---------------------------------------------------------------------------
// Lealtad (misma logica que server/src/routes/loyalty.js)
// ---------------------------------------------------------------------------

async function getProgramByCode(code) {
  return prisma.program.findFirst({
    where: { code: String(code || "").trim().toUpperCase(), active: true },
    include: { tenant: true },
  });
}

// Inscribe a un usuario en un programa por su codigo corto. Idempotente.
async function enrollByCode(userId, code) {
  const program = await getProgramByCode(code);
  if (!program) return { ok: false, error: "CODE_NOT_FOUND" };

  const existing = await prisma.card.findUnique({
    where: { programId_userId: { programId: program.id, userId } },
  });
  if (existing) return { ok: true, card: shapeCard(existing, program, program.tenant), already: true };

  const card = await prisma.card.create({
    data: { programId: program.id, userId, token: cardToken() },
  });
  return { ok: true, card: shapeCard(card, program, program.tenant) };
}

// Tarjetas activas de un cliente.
async function getCards(userId) {
  const cards = await prisma.card.findMany({
    where: { userId, status: { not: "ARCHIVED" } },
    include: { program: { include: { tenant: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return cards.map((c) => shapeCard(c, c.program, c.program.tenant));
}

// COMERCIO: suma sello/punto a una tarjeta por su token de QR. Transaccion atomica,
// valida que la tarjeta pertenezca al negocio del comercio.
async function addStampByToken(merchantUser, token, delta = 1, reason = "chat") {
  return prisma.$transaction(async (tx) => {
    const card = await tx.card.findUnique({
      where: { token: String(token || "").trim() },
      include: { program: { include: { tenant: true } } },
    });
    if (!card) return { ok: false, error: "CARD_NOT_FOUND" };
    if (card.program.tenantId !== merchantUser.tenantId)
      return { ok: false, error: "WRONG_TENANT" };
    if (card.status === "REDEEMED" || card.status === "ARCHIVED")
      return { ok: false, error: "ALREADY_REDEEMED" };

    const newBalance = Math.min(card.balance + delta, card.program.goal);
    const completed = newBalance >= card.program.goal;
    const updated = await tx.card.update({
      where: { id: card.id },
      data: {
        balance: newBalance,
        status: completed ? "COMPLETED" : "ACTIVE",
        completedAt: completed && !card.completedAt ? new Date() : card.completedAt,
      },
      include: { program: { include: { tenant: true } } },
    });
    await tx.transaction.create({
      data: { cardId: card.id, staffId: merchantUser.id, delta, reason },
    });
    return { ok: true, card: shapeCard(updated, updated.program, updated.program.tenant) };
  });
}

// COMERCIO: reporte del dia para un negocio.
async function merchantDailyReport(tenantId) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [stamps, redemptions, activeCards, newCards] = await Promise.all([
    prisma.transaction.aggregate({
      where: { card: { program: { tenantId } }, createdAt: { gte: start } },
      _sum: { delta: true },
      _count: true,
    }),
    prisma.redemption.count({
      where: { card: { program: { tenantId } }, createdAt: { gte: start } },
    }),
    prisma.card.count({ where: { program: { tenantId }, status: "ACTIVE" } }),
    prisma.card.count({ where: { program: { tenantId }, createdAt: { gte: start } } }),
  ]);

  return {
    sellosHoy: stamps._sum.delta || 0,
    escaneosHoy: stamps._count || 0,
    canjesHoy: redemptions,
    tarjetasActivas: activeCards,
    clientesNuevosHoy: newCards,
  };
}

// ---------------------------------------------------------------------------
// Forma compartida de una tarjeta (igual que loyalty.js) + helpers
// ---------------------------------------------------------------------------

function shapeCard(card, program, tenant) {
  return {
    id: card.id,
    token: card.token,
    balance: card.balance,
    status: card.status,
    remaining: Math.max(0, program.goal - card.balance),
    program: {
      id: program.id,
      code: program.code,
      name: program.name,
      type: program.type,
      goal: program.goal,
      rewardText: program.rewardText,
      emoji: program.emoji,
    },
    brand: tenant
      ? { name: tenant.name, emoji: tenant.emoji, primary: tenant.primaryColor }
      : null,
  };
}

function safeParse(s) {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
}

module.exports = {
  getOrCreateIdentity,
  getSession,
  saveSession,
  clearSession,
  touchInbound,
  logMessage,
  ensureCustomerUser,
  findMerchantByEmail,
  linkMerchant,
  getProgramByCode,
  enrollByCode,
  getCards,
  addStampByToken,
  merchantDailyReport,
  shapeCard,
};
