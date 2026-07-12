import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../api.js";

// Panel de escaneo para STAFF/ADMIN: cámara + entrada manual del token.
export default function ScanPanel() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);

  async function startCamera() {
    setError("");
    setScanning(true);
    try {
      const qr = new Html5Qrcode("reader");
      scannerRef.current = qr;
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        (decoded) => {
          setToken(decoded);
          stopCamera();
          submitScan(decoded);
        },
        () => {}
      );
    } catch (err) {
      setError("No se pudo abrir la cámara: " + err.message);
      setScanning(false);
    }
  }

  async function stopCamera() {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {}
    setScanning(false);
  }

  useEffect(() => () => void stopCamera(), []);

  async function submitScan(t) {
    setError("");
    setResult(null);
    try {
      const d = await api("/loyalty/scan", {
        method: "POST",
        body: { token: (t || token).trim(), delta: 1 },
      });
      setResult(d.card);
    } catch (err) {
      setError(err.message);
    }
  }

  async function redeem() {
    if (!result) return;
    try {
      const d = await api("/loyalty/redeem", { method: "POST", body: { cardId: result.id } });
      setResult(d.card);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack">
      <h2>Escanear tarjeta</h2>

      <div id="reader" className={scanning ? "reader active" : "reader"} />

      <div className="row">
        {!scanning ? (
          <button className="btn primary" onClick={startCamera}>
            📷 Abrir cámara
          </button>
        ) : (
          <button className="btn ghost" onClick={stopCamera}>
            Detener
          </button>
        )}
      </div>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          submitScan();
        }}
      >
        <input
          className="input"
          placeholder="…o pegá el token manualmente"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button className="btn">Sumar sello</button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="scan-result">
          <div className="lc-title">{result.program.name}</div>
          <div className="big-balance">
            {result.balance} <span className="muted">/ {result.program.goal}</span>
          </div>
          <span className={`badge ${result.status === "COMPLETED" ? "ok" : ""}`}>
            {statusLabel(result.status)}
          </span>
          {result.status === "COMPLETED" && (
            <button className="btn primary" onClick={redeem}>
              🎁 Canjear {result.program.rewardText}
            </button>
          )}
          {result.status === "REDEEMED" && (
            <p className="muted">Recompensa entregada ✔</p>
          )}
        </div>
      )}
    </div>
  );
}

function statusLabel(s) {
  return { ACTIVE: "En progreso", COMPLETED: "¡Meta lista!", REDEEMED: "Canjeada" }[s] || s;
}
