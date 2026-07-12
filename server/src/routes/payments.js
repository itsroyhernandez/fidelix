const express = require("express");
const { requireAuth, requireRole } = require("../middleware");

const router = express.Router();

// Planes de Fidelix (fuente unica de verdad). Precios USD + referencia CRC redondeada.
// Tipo de cambio base ¢453.77 (PDF de rentabilidad). CRC se muestra redondeado.
const PLANS = [
  {
    id: "start",
    name: "Fidelix Start",
    tagline: "Local único",
    audience: "Cafeterías, barberías, tiendas de barrio.",
    monthlyUsd: 49,
    monthlyCrc: 22200,
    annualUsd: 470,
    maxUsers: 500,
    branches: 1,
    features: [
      "Hasta 500 usuarios activos",
      "1 sucursal física",
      "Apple Wallet y Google Wallet",
      "IA básica: chatbot de saldo y reglas",
      "Reportes mensuales por correo",
    ],
  },
  {
    id: "pulse",
    name: "Fidelix Pulse",
    tagline: "En crecimiento",
    audience: "Restaurantes, cadenas pequeñas, clínicas.",
    monthlyUsd: 119,
    monthlyCrc: 54000,
    annualUsd: 1142,
    maxUsers: 3000,
    branches: 3,
    popular: true,
    features: [
      "Hasta 3.000 usuarios activos",
      "Hasta 3 sucursales",
      "2 notificaciones push al mes",
      "IA interactiva: sugiere el próximo premio",
      "Estadísticas avanzadas",
    ],
  },
  {
    id: "hyper",
    name: "Fidelix Hyper",
    tagline: "Corporativo",
    audience: "Franquicias y marcas masivas.",
    monthlyUsd: 349,
    monthlyCrc: 158400,
    annualUsd: 3350,
    maxUsers: 25000,
    branches: null,
    features: [
      "Hasta 25.000 usuarios activos",
      "Sucursales ilimitadas",
      "Notificaciones push ilimitadas",
      "Integración API con tu POS",
      "IA predictiva de demanda de recompensas",
    ],
  },
];

const IMPLEMENTATION_FEE_USD = 250;

router.get("/plans", (req, res) => {
  res.json({ plans: PLANS, implementationFeeUsd: IMPLEMENTATION_FEE_USD, fxCrc: 453.77 });
});

// Crear intento de pago. PayPal y tarjetas (Stripe) requieren llaves reales.
// Devuelve instrucciones honestas hasta que se configuren.
router.post("/checkout", requireAuth, requireRole("ADMIN"), (req, res) => {
  const { planId, method } = req.body || {};
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return res.status(400).json({ error: "Plan no válido" });

  const configured = {
    paypal: !!process.env.PAYPAL_CLIENT_ID,
    card: !!process.env.STRIPE_SECRET_KEY, // tarjetas via Stripe
  };
  if (!configured[method]) {
    return res.status(501).json({
      error: `Pago con ${method === "paypal" ? "PayPal" : "tarjeta"} aún no configurado`,
      hint:
        method === "paypal"
          ? "Definí PAYPAL_CLIENT_ID y PAYPAL_SECRET en el .env."
          : "Definí STRIPE_SECRET_KEY y STRIPE_PUBLISHABLE_KEY en el .env.",
      plan: plan.name,
    });
  }
  // TODO(prod): crear la orden PayPal / PaymentIntent de Stripe y devolver la URL/clientSecret.
  res.status(501).json({ error: "Integración de cobro pendiente de implementar con tus llaves" });
});

module.exports = { router, PLANS };
