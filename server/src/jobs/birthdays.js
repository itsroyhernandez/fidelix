const cron = require("node-cron");
const { prisma } = require("../prisma");

// Otorga el premio de cumpleanos: para cada tarjeta de un programa tipo BIRTHDAY,
// si hoy es el cumpleanos del cliente (mes+dia) y todavia no se le otorgo ESTE
// año, la marca como completada (lista para canjear en caja). Reutiliza el mismo
// mecanismo de Card/Program que sellos y puntos -> cero UI nueva para el staff.
//
// El cliente se "inscribe" al premio de cumpleanos igual que a cualquier otro
// programa: con el codigo del programa BIRTHDAY del comercio.
async function grantBirthdayRewards(now = new Date()) {
  const month = now.getMonth();
  const day = now.getDate();
  const year = now.getFullYear();

  const cards = await prisma.card.findMany({
    where: { program: { type: "BIRTHDAY", active: true }, status: { not: "ARCHIVED" } },
    include: { user: { select: { birthDate: true } }, program: true },
  });

  let granted = 0;
  for (const card of cards) {
    const bd = card.user.birthDate;
    if (!bd) continue;
    if (bd.getMonth() !== month || bd.getDate() !== day) continue;

    // Ya se le otorgo este mismo año (evita re-otorgar si el cron corre 2 veces
    // el mismo dia, y renueva automaticamente al año siguiente).
    if (card.completedAt && card.completedAt.getFullYear() === year) continue;

    await prisma.card.update({
      where: { id: card.id },
      data: {
        balance: card.program.goal,
        status: "COMPLETED",
        completedAt: now,
        redeemedAt: null, // re-arma el canje para este nuevo año
      },
    });
    granted++;
  }
  return { granted };
}

// Corre todos los dias a las 6:00 AM (listo antes de que abra el negocio).
function scheduleBirthdays() {
  cron.schedule("0 6 * * *", async () => {
    try {
      const { granted } = await grantBirthdayRewards();
      if (granted) console.log(`[birthdays] premios de cumpleanos otorgados: ${granted}`);
    } catch (err) {
      console.error("[birthdays] error:", err.message);
    }
  });
}

module.exports = { grantBirthdayRewards, scheduleBirthdays };
