# Fidelix by Movix — Traspaso de proyecto

> Documento para que cualquier sesión de Claude (u otro desarrollador) tome este
> proyecto **en frío**, con todo el contexto, sin depender del chat original.
> Última actualización: 2026-07-15.

---

## 1. Qué es

**Fidelix** (marca; "by Movix" es la atribución del desarrollador — va al final, nunca pegado al logo del nav) es una **plataforma SaaS de programas de lealtad** para comercios de Costa Rica. Web, sin apps que instalar: cada comercio arma su programa de sellos/puntos con su marca, y el cliente lleva un "boleto" digital con QR.

- **Nombre de producto:** Fidelix. Nunca "Sello" (fue el nombre de trabajo inicial; la carpeta técnica sigue siendo `fidelix/` pero antes fue `sello/`). Username: `@fidelixbymovix`.
- **Operador de la plataforma:** Movix (rol SUPERADMIN).
- **Posicionamiento:** el punto medio entre Bee Loyal (masivo, te mete en SU app) y Lealto (corporativo/enterprise). Fidelix = tu marca, precio de PYME, con video de lanzamiento de Movix.

## 2. Stack y estructura

```
fidelix/
├── server/         API — Node + Express + Prisma
│   ├── src/routes/ auth, tenants, programs, loyalty, wallet, superadmin, oauth, payments
│   ├── src/jobs/   purge (depuración diaria), reports (reporte mensual)
│   ├── src/        app.js, server.js, middleware.js, validate.js (zod), util.js, email.js, env.js, prisma.js, security.js
│   └── prisma/     schema.prisma, seed.js
├── web/            Frontend — React 18 + Vite
│   └── src/
│       ├── pages/      Public (landing+auth), AdminView, CustomerView, ScanPanel, SuperDashboard, Verify, Privacy
│       ├── components/ Seal, SealBuddy, BrandLogos, Icon, InkField, InkCursor, TiltCard, StampDemo, PlanFinder, Stats, Branding, Report, Footer
│       └── hooks/      useReveal, useScrollProgress, useSectionProgress, useDragScroll, useCountUp, useMagnetic
├── docs/           presentacion-fidelix.html (pitch deck, imprimible a PDF)
├── .vscode/        launch.json (arranca con node directo, sin npm/PowerShell)
└── README.md, HANDOFF.md
```

- **Dev DB:** SQLite (`server/prisma/dev.db`, gitignored). **Prod:** cambiar `provider` a `postgresql` en `schema.prisma` + `DATABASE_URL`.
- **Proxy:** Vite (`web`, puerto 5173) hace proxy de `/api` al backend (puerto 4000). Sin líos de CORS en dev.

## 3. Cómo correrlo

**Requisito:** Node 20+ (lo pide `node-cron`). Nunca abrir `index.html` directo ni con Live Server — es React, necesita Vite.

```bash
# Backend
cd server && npm install
cp .env.example .env            # editar JWT_SECRET (node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
npx prisma db push              # crea la DB SQLite
npm run seed                    # datos demo
node src/server.js              # -> http://localhost:4000

# Frontend (otra terminal)
cd web && npm install
node node_modules/vite/bin/vite.js   # -> http://localhost:5173
```

**En VS Code:** Run and Debug (Ctrl+Shift+D) → "Fidelix: API + Web" → F5. El `launch.json` usa **node directo** a propósito: el PowerShell de esta máquina bloquea `npm.ps1` (ExecutionPolicy), así que arrancar con npm falla. Si da `EADDRINUSE`, algún proceso ya tiene el puerto.

## 4. Accesos de demostración (seed) — entorno ficticio "Cafetería La Esquina"

| Rol | Correo | Contraseña |
|---|---|---|
| Movix (operador) | dueno@movix.com | movix1234 |
| Dueña del comercio | dueno@laesquina.cr | esquina123 |
| Caja (staff) | caja@laesquina.cr | caja12345 |
| Cliente final | cliente@demo.cr | cliente123 |

Código de programa: **CAFE10**. Clientes demo: Juan 7/10, Ana 4/10, Luis 10/10 (listo para canje). Comercio en plan ACTIVE (no expira en demos). **Kiku fue eliminado** (era cliente real, no va en demos).

## 5. Roles y qué hace cada panel

- **SUPERADMIN (Movix):** panel operador con 3 pestañas → Resumen (MRR activo/potencial), Marcas (buscar, ver usuarios, **entrar como dueño** vía impersonación, activar/suspender/+3 días), Facturación (tarifa editable + "registrar pago" manual). La impersonación guarda la sesión Movix y muestra banner "Volver a Movix".
- **ADMIN (dueño):** Resumen (stats con count-up), Programas (crear/editar, código de inscripción, **agregar cliente manual** con QR+credenciales), Marca (branding: logo, 10 swatches+hex, emoji, soporte), Escanear (cámara/QR), Reportes (reporte mensual branded + "enviarme").
- **STAFF (caja):** solo escaneo/sumar sellos.
- **CUSTOMER:** tarjetas con QR (tocar → QR gigante para caja), tilt 3D, sellos en cascada, microcopy "te faltan X", Guía, Soporte.

## 6. Identidad visual (respetarla)

Concepto: **sello de tinta sobre papel de boleto**. NO gradiente violeta genérico (eso es "AI slop", ya se descartó). Paleta en `web/src/styles.css :root`:
`--ink #14110f · --paper #efe7d8 · --brick #b23a2e (acento/CTA) · --bronze #9c7a3c · --pine #3d6b57`.
Tipografía: **Fraunces** (display/serif), **Work Sans** (body), **IBM Plex Mono** (precios/códigos/números).
Logo real = `components/Seal.jsx` (sello circular con check). Emojis SOLO como contenido del comercio (íconos de programa); en el chrome se usan íconos SVG propios (`Icon.jsx`).

Landing interactiva (`Public.jsx`): hero con título palabra-por-palabra, `InkField` (fondo canvas que reacciona al mouse), `InkCursor`, botones magnéticos, `SealBuddy` (mascota del login que sigue el mouse, cierra ojos en contraseña, espía, se entristece en error), marquee de recompensas, StatBand "7/10 no vuelven", FAQ, botón WhatsApp, PlanFinder (slider recomienda plan), demo estampable con slam+salpicadura.

## 7. Planes y economía (fuente: doc de rentabilidad + presentación)

| Plan | Usuarios | Mensual | ≈ CRC | Margen |
|---|---|---|---|---|
| Fidelix Start | 500 | $49 | ₡22,200 | ~71% |
| Fidelix Pulse | 3,000 | $119 | ₡54,000 | ~76% |
| Fidelix Hyper | 25,000 | $349 | ₡158,400 | ~78% |

Fee de implementación $250 (una vez, incluye video UGC). Costo directo Start = $14/cliente (servidor $5 + IA $5 + licencias $4). Costos fijos plataforma ≈ $40–80/mes (breakeven = 2 clientes Start). Tipo de cambio del modelo: ₡453.77. Fuente de verdad de precios: `server/src/routes/payments.js` (`PLANS`).

## 8. Pendiente para producción (todo scaffolding, necesita credenciales — NO es código faltante)

- **Correo real:** conectar Resend/SendGrid en `server/src/email.js` (hoy modo dev: el código de verificación sale en pantalla/consola). Desbloquea verificación + reportes por correo.
- **Pagos:** Stripe (tarjeta) + PayPal en `server/src/routes/payments.js`. Hoy el operador cobra por SINPE/transferencia y activa a mano en Facturación.
- **OAuth** Google/Apple/Microsoft: `server/src/routes/oauth.js` (botones listos, faltan client IDs/secrets).
- **Wallet** Apple/Google: `server/src/routes/wallet.js` (falta cuenta Apple Developer $99/año + Google Wallet API).
- **Deploy:** hosting (Railway/Render/Fly) + PostgreSQL + dominio + HTTPS/WAF (Cloudflare). Recién ahí "localhost" deja de ser un problema.
- **WhatsApp FAB:** número placeholder `50688888888` en `Public.jsx` → poner el real de Movix.

## 9. Gotchas aprendidos (para no repetir bugs)

- **Regla de instrucciones sobre marcas de terceros** (logos Google/MS, verde WhatsApp): no recolorear; enmarcarlas en el sistema visual (papel).
- **SealBuddy:** pupilas/párpados/tilt se mueven por **atributo `transform` SVG** (JS/rAF). NO poner transform/transition CSS ahí — lo pisan.
- **`.stage > *`** con `position:relative` puede enterrar overlays con `position:fixed` → los modales/overlays van FUERA de `.stage`, como hermanos.
- **Contraseña:** exige ≥1 letra + ≥1 número, sin espacios/comas/emoji. Botón "ver" usa `onMouseDown preventDefault` para no robar foco.
- **Autenticidad (regla de Royner):** NADA de testimonios ni contadores de clientes inventados. Se activan cuando existan clientes reales.
- **Testing en navegador headless:** la pestaña queda `document.hidden` → rAF/IntersectionObserver se pausan y los count-up/animaciones no se observan; verificar por DOM. Eventos sintéticos de React necesitan `bubbles:true`.

## 10. Migrar a otra cuenta / máquina

El código es portable por Git. Opciones (ver también la respuesta del chat):
1. **GitHub** (recomendado): crear repo y `git push`. Requiere instalar `gh` o configurar un remoto con credenciales.
2. **Bundle:** `git clone fidelix.bundle fidelix` desde el archivo `fidelix.bundle` (historia completa).
3. **Misma máquina:** la carpeta ya está en `Documents/claude/fidelix`; la otra cuenta solo abre esa carpeta. Este HANDOFF.md le da el contexto.

Lo que NO está en git (regenerable): `.env` (crear desde `.env.example`), `node_modules` (`npm install`), `dev.db` (`npx prisma db push && npm run seed`).
