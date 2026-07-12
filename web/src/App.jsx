import { useEffect, useState } from "react";
import { api, auth } from "./api.js";
import Public from "./pages/Public.jsx";
import Verify from "./pages/Verify.jsx";
import CustomerView from "./pages/CustomerView.jsx";
import AdminView from "./pages/AdminView.jsx";
import ScanPanel from "./pages/ScanPanel.jsx";
import SuperDashboard from "./pages/SuperDashboard.jsx";
import Footer from "./components/Footer.jsx";
import Seal from "./components/Seal.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [devCode, setDevCode] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!auth.token) return setLoading(false);
    try {
      const d = await api("/auth/me");
      setUser(d.user);
      setTenant(d.tenant);
    } catch {
      auth.token = null;
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  function onAuthed(u, t, code) {
    setUser(u);
    setTenant(t || null);
    if (code) setDevCode(code);
  }
  function logout() {
    auth.token = null;
    setUser(null);
    setTenant(null);
    setDevCode(null);
  }

  if (loading) return <div className="center muted">Cargando…</div>;
  if (!user) return <Public onAuthed={onAuthed} />;

  // Aplica el color de la marca (branding) a la interfaz del admin/cliente.
  const brandStyle = tenant?.primaryColor ? { "--primary": tenant.primaryColor } : {};

  if (!user.emailVerified) {
    return (
      <Verify
        user={user}
        devCode={devCode}
        onVerified={(u) => setUser(u)}
        onDevCode={setDevCode}
        onLogout={logout}
      />
    );
  }

  const trialBanner =
    tenant && tenant.plan === "TRIAL" ? (
      <div className="trial-banner">
        🎁 Prueba gratis · te quedan <b>{tenant.daysLeft} día{tenant.daysLeft === 1 ? "" : "s"}</b>
      </div>
    ) : tenant && tenant.plan === "EXPIRED" ? (
      <div className="trial-banner expired">⛔ Tu prueba terminó. Activá un plan para seguir.</div>
    ) : null;

  return (
    <div className="app" style={brandStyle}>
      <header className="topbar">
        <span className="brand"><Seal size={22} /> Fidelix</span>
        <div className="topbar-right">
          <span className="muted hide-sm">
            {user.name} · <span className="role">{roleLabel(user.role)}</span>
          </span>
          <button className="btn ghost sm" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      {trialBanner}

      <main className="content">
        {user.role === "SUPERADMIN" && <SuperDashboard />}
        {user.role === "ADMIN" && <AdminView tenant={tenant} onTenant={setTenant} />}
        {user.role === "STAFF" && <ScanPanel />}
        {user.role === "CUSTOMER" && <CustomerView />}
      </main>

      <Footer />
    </div>
  );
}

function roleLabel(r) {
  return { SUPERADMIN: "Movix", ADMIN: "Dueño", STAFF: "Caja", CUSTOMER: "Cliente" }[r] || r;
}
