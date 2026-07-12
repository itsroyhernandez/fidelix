// Datos de demo con accesos de prueba. Corre con: npm run seed
//
// Genera:
//   - SUPERADMIN (Movix / Royner)  -> ve TODAS las marcas
//   - Marca "Kiku Holding" con dueño (ADMIN), cajero (STAFF) y un cliente (CUSTOMER)
//   - Un programa de lealtad con codigo para inscribirse
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { cardToken } = require("../src/util");

const prisma = new PrismaClient();
const hash = (p) => bcrypt.hashSync(p, 12);

async function upsertUser(data) {
  return prisma.user.upsert({ where: { email: data.email }, update: {}, create: data });
}

async function main() {
  // --- SUPERADMIN: Movix ---
  await upsertUser({
    email: "dueno@movix.com",
    passwordHash: hash("movix1234"),
    name: "Movix (Superadmin)",
    role: "SUPERADMIN",
    emailVerified: true,
  });

  // --- Marca de prueba: Kiku Holding (prueba de 3 dias vigente) ---
  const tenant = await prisma.tenant.upsert({
    where: { slug: "kiku-holding" },
    update: {},
    create: {
      name: "Kiku Holding",
      slug: "kiku-holding",
      plan: "TRIAL",
      trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      emoji: "☕",
      primaryColor: "#6b4f3a",
      accentColor: "#e0b877",
      description: "Programa de recompensas de Kiku Holding.",
      supportEmail: "soporte@kikucr.com",
    },
  });

  // Dueño de la marca (ADMIN / builder)
  await upsertUser({
    email: "admin@kiku.com",
    passwordHash: hash("kiku1234"),
    name: "Dueño Kiku",
    role: "ADMIN",
    tenantId: tenant.id,
    emailVerified: true,
  });

  // Cajero (STAFF)
  await upsertUser({
    email: "caja@kiku.com",
    passwordHash: hash("caja1234"),
    name: "Cajero Kiku",
    role: "STAFF",
    tenantId: tenant.id,
    emailVerified: true,
  });

  // Cliente final (CUSTOMER) verificado
  const customer = await upsertUser({
    email: "cliente@kiku.com",
    passwordHash: hash("cliente1234"),
    name: "Cliente Demo",
    role: "CUSTOMER",
    emailVerified: true,
  });

  // Programa con codigo fijo para testear
  let program = await prisma.program.findFirst({ where: { tenantId: tenant.id } });
  if (!program) {
    program = await prisma.program.create({
      data: {
        code: "KIKU10",
        tenantId: tenant.id,
        name: "Cafe Gratis #10",
        description: "Junta 10 sellos y llevate un cafe gratis.",
        type: "STAMP",
        goal: 10,
        rewardText: "1 cafe gratis",
        emoji: "☕",
        active: true,
      },
    });
  }

  // Tarjeta del cliente con 4 sellos (para ver el QR y el progreso)
  const existing = await prisma.card.findUnique({
    where: { programId_userId: { programId: program.id, userId: customer.id } },
  });
  if (!existing) {
    await prisma.card.create({
      data: { programId: program.id, userId: customer.id, token: cardToken(), balance: 4 },
    });
  }

  console.log("\n=== ACCESOS DE PRUEBA ===");
  console.log("SUPERADMIN (Movix):  dueno@movix.com   / movix1234");
  console.log("DUEÑO/BUILDER Kiku:  admin@kiku.com    / kiku1234");
  console.log("CAJERO Kiku (STAFF): caja@kiku.com     / caja1234");
  console.log("CLIENTE Kiku:        cliente@kiku.com  / cliente1234");
  console.log("CODIGO DE PROGRAMA:  KIKU10");
  console.log("=========================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
