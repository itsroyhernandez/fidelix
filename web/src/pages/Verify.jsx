import { useState } from "react";
import { api } from "../api.js";
import Footer from "../components/Footer.jsx";
import Seal from "../components/Seal.jsx";

// Pantalla de verificacion de correo por codigo de 6 digitos.
export default function Verify({ user, devCode, onVerified, onDevCode, onLogout }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const d = await api("/auth/verify", { method: "POST", body: { code: code.trim() } });
      onVerified(d.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError("");
    setSent("");
    try {
      const d = await api("/auth/resend", { method: "POST" });
      if (d.devCode) onDevCode?.(d.devCode);
      setSent("Código reenviado.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand big"><Seal size={38} /> Fidelix</div>
        <h3>Verificá tu correo</h3>
        <p className="muted">
          Enviamos un código de 6 dígitos a <b>{user.email}</b>. Escribilo para confirmar que sos vos.
        </p>

        {devCode && (
          <div className="devcode">
            Modo demo — tu código es: <b>{devCode}</b>
          </div>
        )}

        <form onSubmit={submit} className="form">
          <input
            className="input code-input"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
          />
          {error && <div className="error">{error}</div>}
          {sent && <div className="muted tiny">{sent}</div>}
          <button className="btn primary" disabled={busy}>
            {busy ? "…" : "Verificar"}
          </button>
        </form>

        <div className="switch">
          <button className="link" onClick={resend}>
            Reenviar código
          </button>
          <button className="link" onClick={onLogout}>
            Salir
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
