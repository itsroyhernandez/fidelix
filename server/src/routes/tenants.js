const express = require("express");
const bcrypt = require("bcryptjs");
const { prisma } = require("../prisma");
const { env } = require("../env");
const { validate } = require("../validate");
const { authLimiter } = require("../security");
const { signToken, requireAuth, requireRole } = require("../middleware");
const { verifyCode, slugify, tenantStatus } = require("../util");
const { sendVerificationEmail } = require("../email");

const router = express.Router();

// --- PUBLICO: crear marca + prueba de 3 dias (registra al dueño como ADMIN) ---
router.post("/signup", authLimiter, validate("brandSignup"), async (req, res) => {
  const { brandName, ownerName, email, password, phone } = req.body;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Ese correo ya esta registrado" });

  // slug unico para la marca.
  let slug = slugify(brandName) || "marca";
  let n = 1;
  while (await prisma.tenant.findUnique({ where: { slug } })) slug = `${slugify(brandName)}-${n++}`;

  const code = verifyCode();
  const trialEndsAt = new Date(Date.now() + env.trialDays * 24 * 60 * 60 * 1000);

  const { tenant, admin } = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: brandName, slug, plan: "TRIAL", trialEndsAt, emoji: "🎁", supportPhone: phone || "" },
    });
    const admin = await tx.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        name: ownerName,
        role: "ADMIN",
        tenantId: tenant.id,
        verifyCode: code,
        verifyExpires: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    return { tenant, admin };
  });

  const mail = await sendVerificationEmail({ to: email, name: ownerName, code });

  res.status(201).json({
    token: signToken(admin),
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      tenantId: admin.tenantId,
      emailVerified: admin.emailVerified,
    },
    tenant: { id: tenant.id, name: tenant.name, ...tenantStatus(tenant) },
    ...(env.exposeDevCode ? { devCode: mail.devCode } : {}),
  });
});

// --- ADMIN: ver mi marca (branding + estado del plan) ---
router.get("/me", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
  if (!tenant) return res.status(404).json({ error: "Marca no encontrada" });
  res.json({ tenant: shapeTenant(tenant) });
});

// --- ADMIN: personalizar marca (logo, colores, emoji, soporte, descripcion) ---
router.put("/me", requireAuth, requireRole("ADMIN"), validate("branding"), async (req, res) => {
  const b = req.body;
  const tenant = await prisma.tenant.update({
    where: { id: req.user.tenantId },
    data: {
      ...(b.name !== undefined ? { name: b.name } : {}),
      ...(b.logo !== undefined ? { logo: b.logo } : {}),
      ...(b.primaryColor !== undefined ? { primaryColor: b.primaryColor } : {}),
      ...(b.accentColor !== undefined ? { accentColor: b.accentColor } : {}),
      ...(b.emoji !== undefined ? { emoji: b.emoji } : {}),
      ...(b.description !== undefined ? { description: b.description } : {}),
      ...(b.supportEmail !== undefined ? { supportEmail: b.supportEmail } : {}),
      ...(b.supportPhone !== undefined ? { supportPhone: b.supportPhone } : {}),
    },
  });
  res.json({ tenant: shapeTenant(tenant) });
});

// --- ADMIN: estadisticas de la marca ---
router.get("/me/stats", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const tenantId = req.user.tenantId;
  const programs = await prisma.program.findMany({ where: { tenantId }, select: { id: true } });
  const programIds = programs.map((p) => p.id);

  const where = { program: { tenantId } };
  const [customers, active, completed, redeemed, stamps] = await Promise.all([
    prisma.card.count({ where }),
    prisma.card.count({ where: { ...where, status: "ACTIVE" } }),
    prisma.card.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.card.count({ where: { ...where, status: "REDEEMED" } }),
    prisma.transaction.count({ where: { card: { program: { tenantId } } } }),
  ]);

  res.json({
    stats: {
      programs: programIds.length,
      customers,
      active,
      completed,
      redeemed,
      stampsGiven: stamps,
      redemptionRate: customers ? Math.round((redeemed / customers) * 100) : 0,
    },
  });
});

// --- ADMIN: ver el reporte mensual (el mismo que se envia por correo) ---
router.get("/me/report", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { buildReport } = require("../jobs/reports");
  const report = await buildReport(req.user.tenantId);
  if (!report) return res.status(404).json({ error: "Marca no encontrada" });
  res.json({ report });
});

// --- ADMIN: enviarme el reporte por correo ahora ---
router.post("/me/report/send", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { buildReport } = require("../jobs/reports");
  const { sendReportEmail } = require("../email");
  const admin = await prisma.user.findUnique({ where: { id: req.user.id } });
  const report = await buildReport(req.user.tenantId);
  if (!report) return res.status(404).json({ error: "Marca no encontrada" });

  const out = await sendReportEmail({ to: admin.email, name: admin.name, report });
  res.json({ delivered: !!out.delivered, to: admin.email });
});

function shapeTenant(t) {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    logo: t.logo,
    primaryColor: t.primaryColor,
    accentColor: t.accentColor,
    emoji: t.emoji,
    description: t.description,
    supportEmail: t.supportEmail,
    supportPhone: t.supportPhone,
    ...tenantStatus(t),
  };
}

module.exports = router;
