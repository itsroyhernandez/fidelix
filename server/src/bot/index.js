// Punto de entrada del modulo del chatbot omnicanal de Fidelix.
//
// Arquitectura (agnostica de canal):
//   webhook -> adapter del canal -> engine (nucleo) -> flows / IA -> services -> DB
//
// WhatsApp es el primer canal (API oficial Cloud, sin riesgo de baneo).
// Messenger/Instagram y TikTok se enchufan como adapters sin tocar el nucleo.

const botRouter = require("./routes");
const engine = require("./engine");

module.exports = { botRouter, engine };
