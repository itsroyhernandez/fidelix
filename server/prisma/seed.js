// Datos de demostracion. Corre con: npm run seed
//
// Genera un entorno de VENTA/DEMO 100% ficticio (nada de marcas reales):
//   - SUPERADMIN Movix (operador: ve todas las marcas)
//   - Comercio demo "Cafetería La Esquina" (mismo nombre que los placeholders
//     del sitio) con dueña, cajero y clientes con progreso variado
//   - Plan ACTIVE (no TRIAL) para que la demo nunca expire a mitad de reunion
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { cardToken } = require("../src/util");

const prisma = new PrismaClient();
const hash = (p) => bcrypt.hashSync(p, 12);

async function upsertUser(data) {
  return prisma.user.upsert({ where: { email: data.email }, update: {}, create: data });
}

async function main() {
  // --- Operador: Movix ---
  await upsertUser({
    email: "dueno@movix.com",
    passwordHash: hash("movix1234"),
    name: "Movix (Operador)",
    role: "SUPERADMIN",
    emailVerified: true,
  });

  // --- Comercio de demostracion (ficticio) ---
  const tenant = await prisma.tenant.upsert({
    where: { slug: "cafeteria-la-esquina" },
    update: { plan: "ACTIVE" },
    create: {
      name: "Cafetería La Esquina",
      slug: "cafeteria-la-esquina",
      plan: "ACTIVE", // demo permanente: no expira
      emoji: "☕",
      primaryColor: "#6b4f3a",
      accentColor: "#e0b877",
      description: "El café de barrio que premia a los que vuelven.",
      supportEmail: "hola@laesquina.cr",
      supportPhone: "+506 8888 8888",
    },
  });

  // Dueña (builder) — el nombre del placeholder del sitio
  await upsertUser({
    email: "dueno@laesquina.cr",
    passwordHash: hash("esquina123"),
    name: "María Rodríguez",
    role: "ADMIN",
    tenantId: tenant.id,
    emailVerified: true,
  });

  // Cajero (staff)
  await upsertUser({
    email: "caja@laesquina.cr",
    passwordHash: hash("caja12345"),
    name: "Diego Campos",
    role: "STAFF",
    tenantId: tenant.id,
    emailVerified: true,
  });

  // Programa con codigo fijo para inscribirse
  let program = await prisma.program.findFirst({ where: { tenantId: tenant.id } });
  if (!program) {
    program = await prisma.program.create({
      data: {
        code: "CAFE10",
        tenantId: tenant.id,
        name: "Café Gratis #10",
        description: "Juntá 10 sellos y el siguiente café va por la casa.",
        type: "STAMP",
        goal: 10,
        rewardText: "1 café gratis",
        emoji: "☕",
        active: true,
      },
    });
  }

  // Clientes finales con progreso variado (para que el panel se vea vivo).
  // El principal lleva 7/10 — igual que el boleto del hero del sitio.
  const CUSTOMERS = [
    { email: "cliente@demo.cr", password: "cliente123", name: "Juan Pérez", balance: 7 },
    { email: "ana@correo.cr", password: "cliente123", name: "Ana Solís", balance: 4 },
    { email: "luis@correo.cr", password: "cliente123", name: "Luis Vargas", balance: 10 }, // lista para canje
  ];
  for (const c of CUSTOMERS) {
    const user = await upsertUser({
      email: c.email,
      passwordHash: hash(c.password),
      name: c.name,
      role: "CUSTOMER",
      emailVerified: true,
    });
    const existing = await prisma.card.findUnique({
      where: { programId_userId: { programId: program.id, userId: user.id } },
    });
    if (!existing) {
      const completed = c.balance >= program.goal;
      await prisma.card.create({
        data: {
          programId: program.id,
          userId: user.id,
          token: cardToken(),
          balance: c.balance,
          status: completed ? "COMPLETED" : "ACTIVE",
          completedAt: completed ? new Date() : null,
        },
      });
    }
  }

  console.log("\n=== ACCESOS DE DEMOSTRACION ===");
  console.log("MOVIX (operador):    dueno@movix.com     / movix1234");
  console.log("DUEÑA del comercio:  dueno@laesquina.cr  / esquina123");
  console.log("CAJA (staff):        caja@laesquina.cr   / caja12345");
  console.log("CLIENTE final:       cliente@demo.cr     / cliente123");
  console.log("CODIGO DE PROGRAMA:  CAFE10");
  console.log("================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
