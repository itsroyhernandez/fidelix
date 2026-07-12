const express = require("express");
const { prisma } = require("../prisma");
const { env } = require("../env");
const { requireAuth } = require("../middleware");

const router = express.Router();

// Genera el MODELO de dato que ambos wallets necesitan.
// El firmado real requiere certificados (Apple) / service account (Google).
function buildPassData(card) {
  return {
    serialNumber: card.token,
    organizationName: card.program.name,
    description: `Tarjeta de lealtad - ${card.program.name}`,
    reward: card.program.rewardText,
    balance: card.balance,
    goal: card.program.goal,
    // El QR del pase apunta al mismo token que escanea el staff.
    barcode: { format: "PKBarcodeFormatQR", message: card.token },
  };
}

// Apple Wallet (.pkpass). Requiere:
//   - Pass Type ID + certificado (.pem) y clave, WWDR cert.
//   - Libreria de firmado, ej: passkit-generator.
router.get("/apple/:cardId", requireAuth, async (req, res) => {
  const card = await getOwnedCard(req);
  if (!card) return res.status(404).json({ error: "Tarjeta no encontrada" });

  if (!env.appleWalletEnabled) {
    return res.status(501).json({
      error: "Apple Wallet no configurado",
      hint: "Activa APPLE_WALLET_ENABLED y agrega tus certificados de Apple Developer.",
      passData: buildPassData(card), // listo para firmar cuando tengas los certs
    });
  }
  // TODO(prod): firmar y devolver el .pkpass con passkit-generator.
  res.status(501).json({ error: "Firmado de .pkpass pendiente de implementar con tus certs" });
});

// Google Wallet: se entrega como un "Save to Google Wallet" (JWT firmado con service account).
router.get("/google/:cardId", requireAuth, async (req, res) => {
  const card = await getOwnedCard(req);
  if (!card) return res.status(404).json({ error: "Tarjeta no encontrada" });

  if (!env.googleWalletEnabled) {
    return res.status(501).json({
      error: "Google Wallet no configurado",
      hint: "Activa GOOGLE_WALLET_ENABLED y agrega el service account del Google Wallet API.",
      passData: buildPassData(card),
    });
  }
  // TODO(prod): construir LoyaltyObject y firmar el JWT -> https://pay.google.com/gp/v/save/<jwt>
  res.status(501).json({ error: "Generacion de JWT de Google Wallet pendiente con tus credenciales" });
});

async function getOwnedCard(req) {
  const card = await prisma.card.findUnique({
    where: { id: req.params.cardId },
    include: { program: true },
  });
  if (!card || card.userId !== req.user.id) return null;
  return card;
}

module.exports = router;
