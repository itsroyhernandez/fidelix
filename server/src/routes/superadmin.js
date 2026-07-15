const express = require("express");
const { prisma } = require("../prisma");
const { requireAuth, requireRole, signToken } = require("../middleware");
const { tenantStatus } = require("../util");
const { PLANS } = require("./payments");

const router = express.Router();

// Solo Movix (SUPERADMIN). Panel de OPERACION, no solo lectura:
// facturacion, activar/suspender planes, extender pruebas y entrar como dueño.
router.use(requireAuth, requireRole("SUPERADMIN"));

const TIER_PRICE = Object.fromEntries(PLANS.map((p) => [p.id.toUpperCase(), p.monthlyUsd]));

function shapeTenant(t) {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    users: t._count?.users,
    programs: t._count?.programs,
    planTier: t.planTier,
    mrr: t.plan === "ACTIVE" ? TIER_PRICE[t.planTier] || 0 : 0,
    potentialMrr: TIER_PRICE[t.planTier] || 0,
    createdAt: t.createdAt,
    ...tenantStatus(t),
  };
}

// Resumen global + dinero.
router.get("/overview", async (req, res) => {
  const [tenants, users, cards, allTenants] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.card.count(),
    prisma.tenant.findMany(),
  ]);
  let mrr = 0, potential = 0, actives = 0, trials = 0, expired = 0;
  for (const t of allTenants) {
    const st = tenantStatus(t);
    const price = TIER_PRICE[t.planTier] || 0;
    if (st.plan === "ACTIVE") { mrr += price; actives++; }
    else if (st.plan === "TRIAL") { potential += price; trials++; }
    else expired++;
  }
  res.json({ overview: { tenants, users, cards, mrr, potentialMrr: potential, actives, trials, expired } });
});

// Todas las marcas con conteos + facturacion.
router.get("/tenants", async (req, res) => {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, programs: true } } },
  });
  res.json({ tenants: tenants.map(shapeTenant) });
});

// Usuarios de una marca (equipo + clientes finales).
router.get("/tenants/:id/users", async (req, res) => {
  const users = await prisma.user.findMany({
    where: { tenantId: req.params.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true },
  });
  const customers = await prisma.user.findMany({
    where: { cards: { some: { program: { tenantId: req.params.id } } } },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true },
  });
  res.json({ team: users, customers });
});

// Operar la marca: activar plan (tras recibir el pago), suspender,
// cambiar tarifa o extender la prueba N dias.
router.patch("/tenants/:id", async (req, res) => {
  const t = await prisma.tenant.findUnique({ where: { id: req.params.id } });
  if (!t) return res.status(404).json({ error: "Marca no encontrada" });

  const { plan, planTier, extendTrialDays } = req.body || {};
  const data = {};
  if (plan && ["TRIAL", "ACTIVE", "EXPIRED"].includes(plan)) data.plan = plan;
  if (planTier && ["START", "PULSE", "HYPER"].includes(planTier)) data.planTier = planTier;
  if (extendTrialDays) {
    const days = Math.min(Math.max(Number(extendTrialDays) || 0, 1), 60);
    const base = t.trialEndsAt && new Date(t.trialEndsAt) > new Date() ? new Date(t.trialEndsAt) : new Date();
    data.trialEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    data.plan = "TRIAL";
  }
  if (!Object.keys(data).length) return res.status(400).json({ error: "Nada que actualizar" });

  const updated = await prisma.tenant.update({
    where: { id: t.id },
    data,
    include: { _count: { select: { users: true, programs: true } } },
  });
  res.json({ tenant: shapeTenant(updated) });
});

// "Entrar como dueño": devuelve un token del ADMIN de esa marca para que el
// operador vea y opere el panel EXACTAMENTE como lo ve el cliente.
router.post("/tenants/:id/impersonate", async (req, res) => {
  const admin = await prisma.user.findFirst({
    where: { tenantId: req.params.id, role: "ADMIN" },
  });
  if (!admin) return res.status(404).json({ error: "Esa marca no tiene dueño (ADMIN)" });
  res.json({
    token: signToken(admin),
    user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role, tenantId: admin.tenantId, emailVerified: admin.emailVerified },
  });
});

module.exports = router;
