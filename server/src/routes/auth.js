const express = require("express");
const bcrypt = require("bcryptjs");
const { prisma } = require("../prisma");
const { env } = require("../env");
const { validate } = require("../validate");
const { authLimiter } = require("../security");
const { signToken, requireAuth } = require("../middleware");
const { verifyCode, tenantStatus } = require("../util");
const { sendVerificationEmail } = require("../email");

const router = express.Router();

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    tenantId: u.tenantId,
    emailVerified: u.emailVerified,
  };
}

// Registro de cliente final (CUSTOMER). Genera codigo de verificacion.
router.post("/register", authLimiter, validate("register"), async (req, res) => {
  const { email, password, name, birthDate } = req.body;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Ese correo ya esta registrado" });

  const passwordHash = await bcrypt.hash(password, 12);
  const code = verifyCode();
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: "CUSTOMER",
      birthDate: birthDate ? new Date(birthDate) : null,
      verifyCode: code,
      verifyExpires: new Date(Date.now() + 30 * 60 * 1000),
    },
  });
  const mail = await sendVerificationEmail({ to: email, name, code });

  res.status(201).json({
    token: signToken(user),
    user: publicUser(user),
    ...(env.exposeDevCode ? { devCode: mail.devCode } : {}),
  });
});

router.post("/login", authLimiter, validate("login"), async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!ok) return res.status(401).json({ error: "Credenciales invalidas" });
  res.json({ token: signToken(user), user: publicUser(user) });
});

// Verificar correo con el codigo de 6 digitos.
router.post("/verify", requireAuth, authLimiter, validate("verify"), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  if (user.emailVerified) return res.json({ user: publicUser(user) });

  const valid =
    user.verifyCode === req.body.code &&
    user.verifyExpires &&
    new Date(user.verifyExpires).getTime() > Date.now();
  if (!valid) return res.status(400).json({ error: "Codigo invalido o vencido" });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyCode: null, verifyExpires: null },
  });
  res.json({ user: publicUser(updated) });
});

// Reenviar codigo.
router.post("/resend", requireAuth, authLimiter, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  if (user.emailVerified) return res.json({ ok: true });

  const code = verifyCode();
  await prisma.user.update({
    where: { id: user.id },
    data: { verifyCode: code, verifyExpires: new Date(Date.now() + 30 * 60 * 1000) },
  });
  const mail = await sendVerificationEmail({ to: user.email, name: user.name, code });
  res.json({ ok: true, ...(env.exposeDevCode ? { devCode: mail.devCode } : {}) });
});

// Perfil + estado de la marca (para saber dias de prueba restantes).
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { tenant: true },
  });
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

  res.json({
    user: publicUser(user),
    tenant: user.tenant
      ? {
          id: user.tenant.id,
          name: user.tenant.name,
          ...tenantStatus(user.tenant),
        }
      : null,
  });
});

module.exports = router;
