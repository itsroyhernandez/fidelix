const express = require("express");
const { prisma } = require("../prisma");
const { requireAuth, requireRole } = require("../middleware");
const { tenantStatus } = require("../util");

const router = express.Router();

// Solo Movix (SUPERADMIN). Aqui revisas TODAS las marcas y sus usuarios.
// Los clientes-marca NO pueden entrar aqui: solo ven lo suyo (aislamiento).
router.use(requireAuth, requireRole("SUPERADMIN"));

// Resumen global.
router.get("/overview", async (req, res) => {
  const [tenants, users, cards] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.card.count(),
  ]);
  res.json({ overview: { tenants, users, cards } });
});

// Todas las marcas con conteos.
router.get("/tenants", async (req, res) => {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, programs: true } } },
  });
  res.json({
    tenants: tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      users: t._count.users,
      programs: t._count.programs,
      createdAt: t.createdAt,
      ...tenantStatus(t),
    })),
  });
});

// Usuarios de una marca (para revisar donde queda almacenado cada cliente).
router.get("/tenants/:id/users", async (req, res) => {
  const users = await prisma.user.findMany({
    where: { tenantId: req.params.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true },
  });
  // Clientes finales tambien: los que tienen tarjeta en programas de esta marca.
  const customers = await prisma.user.findMany({
    where: { cards: { some: { program: { tenantId: req.params.id } } } },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true },
  });
  res.json({ team: users, customers });
});

module.exports = router;
