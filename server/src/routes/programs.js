const express = require("express");
const { prisma } = require("../prisma");
const { validate } = require("../validate");
const { requireAuth, requireRole, requireActiveTenant } = require("../middleware");
const { shortCode } = require("../util");

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

module.exports = router;
