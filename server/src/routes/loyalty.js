const express = require("express");
const { prisma } = require("../prisma");
const { validate } = require("../validate");
const { requireAuth, requireRole, requireVerified } = require("../middleware");
const { cardToken } = require("../util");

const router = express.Router();

// --- CLIENTE: inscribirse con el CODIGO del programa (exige correo verificado) ---
router.post("/enroll", requireAuth, requireVerified, validate("enroll"), async (req, res) => {
  const code = req.body.code.trim().toUpperCase();
  const program = await prisma.program.findFirst({
    where: { code, active: true },
    include: { tenant: true },
  });
  if (!program) return res.status(404).json({ error: "Codigo de programa no valido" });

  const existing = await prisma.card.findUnique({
    where: { programId_userId: { programId: program.id, userId: req.user.id } },
  });
  if (existing) return res.json({ card: shapeCard(existing, program, program.tenant) });

  const card = await prisma.card.create({
    data: { programId: program.id, userId: req.user.id, token: cardToken() },
  });
  res.status(201).json({ card: shapeCard(card, program, program.tenant) });
});

// --- CLIENTE: ver sus tarjetas ---
router.get("/cards", requireAuth, async (req, res) => {
  const cards = await prisma.card.findMany({
    where: { userId: req.user.id, status: { not: "ARCHIVED" } },
    include: { program: { include: { tenant: true } } },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ cards: cards.map((c) => shapeCard(c, c.program, c.program.tenant)) });
});

// --- STAFF/ADMIN: escanear QR del cliente y sumar sello/punto ---
router.post("/scan", requireAuth, requireRole("ADMIN", "STAFF"), validate("scan"), async (req, res) => {
  const { token, delta, reason } = req.body;

  const result = await prisma.$transaction(async (tx) => {
    const card = await tx.card.findUnique({
      where: { token },
      include: { program: { include: { tenant: true } } },
    });
    if (!card) throw httpError(404, "Tarjeta no encontrada");
    if (card.program.tenantId !== req.user.tenantId)
      throw httpError(403, "Esta tarjeta no pertenece a tu negocio");
    if (card.status === "REDEEMED" || card.status === "ARCHIVED")
      throw httpError(409, "La tarjeta ya fue canjeada");

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
      data: { cardId: card.id, staffId: req.user.id, delta, reason },
    });
    return updated;
  });

  res.json({ card: shapeCard(result, result.program, result.program.tenant) });
});

// --- STAFF/ADMIN: canjear recompensa ---
router.post("/redeem", requireAuth, requireRole("ADMIN", "STAFF"), validate("redeem"), async (req, res) => {
  const result = await prisma.$transaction(async (tx) => {
    const card = await tx.card.findUnique({
      where: { id: req.body.cardId },
      include: { program: { include: { tenant: true } } },
    });
    if (!card) throw httpError(404, "Tarjeta no encontrada");
    if (card.program.tenantId !== req.user.tenantId)
      throw httpError(403, "Esta tarjeta no pertenece a tu negocio");
    if (card.status !== "COMPLETED")
      throw httpError(409, "La tarjeta aun no completa la meta");

    const updated = await tx.card.update({
      where: { id: card.id },
      data: { status: "REDEEMED", redeemedAt: new Date() },
      include: { program: { include: { tenant: true } } },
    });
    await tx.redemption.create({
      data: { cardId: card.id, staffId: req.user.id, note: req.body.note },
    });
    return updated;
  });

  res.json({ card: shapeCard(result, result.program, result.program.tenant), message: "Recompensa canjeada" });
});

function shapeCard(card, program, tenant) {
  return {
    id: card.id,
    token: card.token,
    balance: card.balance,
    status: card.status,
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
      ? {
          name: tenant.name,
          logo: tenant.logo,
          emoji: tenant.emoji,
          primary: tenant.primaryColor,
          accent: tenant.accentColor,
        }
      : null,
  };
}
function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

module.exports = router;
