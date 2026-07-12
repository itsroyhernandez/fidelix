const cron = require("node-cron");
const { prisma } = require("../prisma");
const { sendVerificationEmail } = require("../email"); // reutiliza el transporte de correo

// Construye el reporte mensual de una marca: estadisticas + branding + datos.
async function buildReport(tenantId, { month } = {}) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return null;

  const where = { program: { tenantId } };
  const [customers, active, completed, redeemed, stamps, programs] = await Promise.all([
    prisma.card.count({ where }),
    prisma.card.count({ where: { ...where, status: "ACTIVE" } }),
    prisma.card.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.card.count({ where: { ...where, status: "REDEEMED" } }),
    prisma.transaction.count({ where: { card: { program: { tenantId } } } }),
    prisma.program.count({ where: { tenantId } }),
  ]);

  return {
    brand: {
      name: tenant.name,
      logo: tenant.logo,
      emoji: tenant.emoji,
      primary: tenant.primaryColor,
      accent: tenant.accentColor,
    },
    period: month || monthLabel(),
    generatedAt: new Date().toISOString(),
    stats: {
      programs,
      customers,
      active,
      completed,
      redeemed,
      stampsGiven: stamps,
      redemptionRate: customers ? Math.round((redeemed / customers) * 100) : 0,
    },
  };
}

function monthLabel() {
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const d = new Date();
  return `${meses[d.getMonth()]} ${d.getFullYear()}`;
}

// Envia el reporte a cada dueño de marca (ADMIN). Sin proveedor de email -> modo dev (consola).
async function sendMonthlyReports() {
  const tenants = await prisma.tenant.findMany({ where: { plan: { not: "EXPIRED" } } });
  let sent = 0;
  for (const t of tenants) {
    const admin = await prisma.user.findFirst({ where: { tenantId: t.id, role: "ADMIN" } });
    if (!admin) continue;
    const report = await buildReport(t.id);
    // TODO(prod): renderizar HTML del reporte con el branding y enviarlo por email.
    console.log(`[report] ${t.name} -> ${admin.email}:`, JSON.stringify(report.stats));
    await sendVerificationEmail({ to: admin.email, name: admin.name, code: "REPORTE" }).catch(() => {});
    sent++;
  }
  return { sent };
}

// Primer dia de cada mes a las 8:00 AM.
function scheduleMonthlyReports() {
  cron.schedule("0 8 1 * *", async () => {
    try {
      const { sent } = await sendMonthlyReports();
      console.log(`[report] reportes mensuales enviados: ${sent}`);
    } catch (err) {
      console.error("[report] error:", err.message);
    }
  });
}

module.exports = { buildReport, sendMonthlyReports, scheduleMonthlyReports };
