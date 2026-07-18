const { z } = require("zod");

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color hex invalido");

// Fecha (YYYY-MM-DD, la que da un <input type="date">). Opcional en todos lados.
const birthDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha invalida")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Fecha invalida")
  .optional();

// Regla de contraseña: 8-200, al menos una letra Y un numero, sin espacios,
// sin comas y sin emojis. Minusculas permitidas.
const EMOJI = /\p{Extended_Pictographic}/u;
const password = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(200)
  .refine((v) => !/\s/.test(v), "Sin espacios")
  .refine((v) => !v.includes(","), "Sin comas")
  .refine((v) => !EMOJI.test(v), "Sin emojis")
  .refine((v) => /[A-Za-z]/.test(v), "Debe incluir al menos una letra")
  .refine((v) => /\d/.test(v), "Debe incluir al menos un número");

// Validacion estricta de TODO lo que entra.
const schemas = {
  register: z.object({
    email: z.string().email().max(160),
    password,
    name: z.string().min(1).max(120),
    birthDate,
  }),
  login: z.object({
    email: z.string().email().max(160),
    password: z.string().min(1).max(200),
  }),
  verify: z.object({
    code: z.string().length(6),
  }),
  brandSignup: z.object({
    brandName: z.string().min(2).max(80),
    ownerName: z.string().min(1).max(120),
    email: z.string().email().max(160),
    password,
    phone: z.string().max(40).optional().default(""),
  }),
  branding: z.object({
    name: z.string().min(2).max(80).optional(),
    logo: z.string().max(300000).optional(), // permite dataURL de logo pequeño
    primaryColor: hex.optional(),
    accentColor: hex.optional(),
    emoji: z.string().max(8).optional(),
    description: z.string().max(600).optional(),
    supportEmail: z.string().email().max(160).or(z.literal("")).optional(),
    supportPhone: z.string().max(40).optional(),
  }),
  program: z.object({
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional().default(""),
    type: z.enum(["STAMP", "POINTS", "BIRTHDAY"]).default("STAMP"),
    goal: z.number().int().min(1).max(1000).default(10),
    rewardText: z.string().min(1).max(200).default("Recompensa gratis"),
    emoji: z.string().max(8).optional().default("⭐"),
    active: z.boolean().optional().default(true),
  }),
  enroll: z.object({
    code: z.string().min(4).max(20),
  }),
  addCustomer: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email().max(160),
    balance: z.number().int().min(0).max(1000).optional().default(0),
    birthDate,
  }),
  scan: z.object({
    token: z.string().min(8).max(80),
    delta: z.number().int().min(1).max(50).default(1),
    reason: z.string().max(80).optional().default("scan"),
  }),
  redeem: z.object({
    cardId: z.string().min(1).max(60),
    note: z.string().max(200).optional().default(""),
  }),
};

function validate(schemaName) {
  const schema = schemas[schemaName];
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Datos invalidos",
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate, schemas };
