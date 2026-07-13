const { env } = require("./env");

// Envio de correos. HONESTO: si no hay proveedor configurado, no manda nada real;
// deja el codigo en consola y disponible en modo dev para poder testear.
//
// Para produccion: conecta Resend o SendGrid (un API key) y completa sendReal().
async function sendVerificationEmail({ to, name, code }) {
  if (env.emailEnabled) {
    return sendReal({ to, name, code }); // TODO(prod): implementar con tu proveedor
  }
  // Modo dev: "entrega" el codigo por consola.
  console.log(`\n[email:dev] Codigo de verificacion para ${to}: ${code}\n`);
  return { delivered: false, devCode: code };
}

async function sendReal({ to, name, code }) {
  // Ejemplo con Resend (pseudo):
  //   await fetch("https://api.resend.com/emails", {
  //     method: "POST",
  //     headers: { Authorization: `Bearer ${env.emailApiKey}`, "Content-Type": "application/json" },
  //     body: JSON.stringify({ from: env.emailFrom, to, subject: "Tu codigo Sello", html: `Hola ${name}, tu codigo es ${code}` }),
  //   });
  console.log(`[email] (stub) enviar a ${to} codigo ${code}`);
  return { delivered: true };
}

// Envia el reporte mensual con el branding de la marca.
async function sendReportEmail({ to, name, report }) {
  if (env.emailEnabled) {
    // TODO(prod): renderizar HTML branded del reporte y enviarlo con tu proveedor.
    console.log(`[email] (stub) reporte para ${to}`);
    return { delivered: true };
  }
  console.log(`\n[email:dev] Reporte de "${report.brand.name}" para ${to}:`, JSON.stringify(report.stats), "\n");
  return { delivered: false };
}

module.exports = { sendVerificationEmail, sendReportEmail };
