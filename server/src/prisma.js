const { PrismaClient } = require("@prisma/client");

// Un solo cliente Prisma para toda la app (evita agotar el pool de conexiones).
// Prisma parametriza TODAS las consultas -> inmune a inyeccion SQL.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
});

module.exports = { prisma };
