const express = require("express");
const { prisma } = require("../prisma");
const { validate } = require("../validate");
const { requireAuth, requireRole, requireActiveTenant } = require("../middleware");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { shortCode, cardToken } = require("../util");

const router = express.Router();

// Todo aqui exige ADMIN, marca con prueba vigente, y opera solo sobre su tenant.
router.use(requireAuth, requireRole("ADMIN"), requireActiveTenant);

router.get("/", async (req, res) => {
  const programs = await prisma.program.findMany({
    where: { tenantId: req.user.tenantId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ programs });
});

router.post("/", validate("program"), async (req, res) => {
  const b = req.body;

  // Codigo corto unico para inscripcion.
  let code = shortCode();
  while (await prisma.program.findUnique({ where: { code } })) code = shortCode();

  const program = await prisma.program.create({
    data: {
      code,
      tenantId: req.user.tenantId,
      name: b.name,
      description: b.description,
      type: b.type,
      goal: b.goal,
      rewardText: b.rewardText,
      emoji: b.emoji || "⭐",
      active: b.active,
    },
  });
  res.status(201).json({ program });
});

router.put("/:id", validate("program"), async (req, res) => {
  const owned = await prisma.program.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
  });
  if (!owned) return res.status(404).json({ error: "Programa no encontrado" });

  const b = req.body;
  const program = await prisma.program.update({
    where: { id: owned.id },
    data: {
      name: b.name,
      description: b.description,
      type: b.type,
      goal: b.goal,
      rewardText: b.rewardText,
      emoji: b.emoji || owned.emoji,
      active: b.active,
    },
  });
  res.json({ program });
});

// Clientes inscritos + progreso (paginado).
router.get("/:id/customers", async (req, res) => {
  const program = await prisma.program.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
  });
  if (!program) return res.status(404).json({ error: "Programa no encontrado" });

  const take = Math.min(Number(req.query.take) || 50, 200);
  const skip = Number(req.query.skip) || 0;

  const [cards, total] = await Promise.all([
    prisma.card.findMany({
      where: { programId: program.id },
      include: { user: { select: { name: true, email: true, emailVerified: true } } },
      orderBy: { updatedAt: "desc" },
      take,
      skip,
    }),
    prisma.card.count({ where: { programId: program.id } }),
  ]);

  res.json({
    total,
    customers: cards.map((c) => ({
      cardId: c.id,
      name: c.user.name,
      email: c.user.email,
      verified: c.user.emailVerified,
      balance: c.balance,
      goal: program.goal,
      status: c.status,
    })),
  });
});

// Alta MANUAL de un cliente en un programa (para el mostrador / walk-in).
// El dueño da fe de la persona, asi que la cuenta queda verificada. Se le crea
// una contraseña temporal y se devuelve el token del QR para entregarselo.
router.post("/:id/customers", validate("addCustomer"), async (req, res) => {
  const program = await prisma.program.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
  });
  if (!program) return res.status(404).json({ error: "Programa no encontrado" });

  const email = req.body.email.toLowerCase().trim();
  const balance = Math.min(req.body.balance || 0, program.goal);

  const result = await prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email } });
    let tempPassword = null;
    if (!user) {
      tempPassword = crypto.randomBytes(5).toString("hex"); // 10 chars, con letras+numeros
      user = await tx.user.create({
        data: {
          email,
          name: req.body.name,
          passwordHash: await bcrypt.hash(tempPassword, 12),
          role: "CUSTOMER",
          emailVerified: true, // el comercio da fe
        },
      });
    }

    const existing = await tx.card.findUnique({
      where: { programId_userId: { programId: program.id, userId: user.id } },
    });
    if (existing) {
      const e = new Error("Ese cliente ya está en este programa");
      e.status = 409;
      throw e;
    }

    const completed = balance >= program.goal;
    const card = await tx.card.create({
      data: {
        programId: program.id,
        userId: user.id,
        token: cardToken(),
        balance,
        status: completed ? "COMPLETED" : "ACTIVE",
        completedAt: completed ? new Date() : null,
      },
    });
    return { user, card, tempPassword };
  });

  res.status(201).json({
    customer: {
      cardId: result.card.id,
      name: result.user.name,
      email: result.user.email,
      token: result.card.token,
      balance: result.card.balance,
      goal: program.goal,
      status: result.card.status,
    },
    // Solo si se creó cuenta nueva: credenciales para entregarle al cliente.
    credentials: result.tempPassword
      ? { email: result.user.email, tempPassword: result.tempPassword }
      : null,
  });
});

module.exports = router;
