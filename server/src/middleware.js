const jwt = require("jsonwebtoken");
const { env } = require("./env");
const { prisma } = require("./prisma");
const { tenantStatus } = require("./util");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No autenticado" });
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, role: payload.role, tenantId: payload.tenantId };
    next();
  } catch {
    return res.status(401).json({ error: "Token invalido o expirado" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "No autorizado" });
    }
    next();
  };
}

// Exige que el correo del usuario este verificado.
async function requireVerified(req, res, next) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user?.emailVerified) {
    return res.status(403).json({ error: "Verifica tu correo primero", code: "UNVERIFIED" });
  }
  next();
}

// Exige que la marca (tenant) no tenga la prueba vencida. SUPERADMIN pasa siempre.
async function requireActiveTenant(req, res, next) {
  if (req.user.role === "SUPERADMIN") return next();
  const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
  const status = tenantStatus(tenant);
  if (status.expired) {
    return res.status(402).json({
      error: "Tu prueba de 3 dias termino. Activa un plan para continuar.",
      code: "TRIAL_EXPIRED",
    });
  }
  req.tenant = tenant;
  req.tenantStatus = status;
  next();
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, tenantId: user.tenantId },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

module.exports = { requireAuth, requireRole, requireVerified, requireActiveTenant, signToken };
