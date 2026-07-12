const cron = require("node-cron");
const { prisma } = require("../prisma");
const { env } = require("../env");

// Depuracion: cuando una tarjeta ya fue canjeada y paso el periodo de retencion,
// se archiva (status ARCHIVED) y se borran sus transacciones voluminosas.
// Mantiene la BD liviana para alto trafico sin perder la traza del canje (Redemption).
async function purgeRedeemedCards({ retentionDays = env.retentionDays } = {}) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const stale = await prisma.card.findMany({
    where: { status: "REDEEMED", redeemedAt: { lte: cutoff } },
    select: { id: true },
    take: 1000, // por lotes: no bloquea la BD bajo carga
  });
  if (stale.length === 0) return { archived: 0 };

  const ids = stale.map((c) => c.id);
  await prisma.$transaction([
    prisma.transaction.deleteMany({ where: { cardId: { in: ids } } }),
    prisma.card.updateMany({
      where: { id: { in: ids } },
      data: { status: "ARCHIVED" },
    }),
  ]);
  return { archived: ids.length };
}

// Corre todos los dias a las 3:00 AM.
function schedulePurge() {
  cron.schedule("0 3 * * *", async () => {
    try {
      const { archived } = await purgeRedeemedCards();
      if (archived) console.log(`[purge] tarjetas archivadas: ${archived}`);
    } catch (err) {
      console.error("[purge] error:", err.message);
    }
  });
}

module.exports = { purgeRedeemedCards, schedulePurge };
