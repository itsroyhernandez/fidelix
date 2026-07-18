# Fidelix · Programa de lealtad para comercios

Plataforma web SaaS de programas de lealtad **multi-marca**. Cada comercio arma su
programa de sellos/puntos con **su** marca; el cliente lleva un "boleto" digital con QR.
Sin apps que instalar — todo corre en el navegador.

Desarrollada por **Movix** (la atribución "by Movix" va al final, nunca pegada al logo).

> Para el contexto completo (arquitectura, decisiones, accesos, pendientes y bugs
> conocidos) leé **[HANDOFF.md](HANDOFF.md)** — es la fuente de verdad del proyecto.

- **Roles**: `SUPERADMIN` (Movix, operador — ve todas las marcas), `ADMIN` (dueño de la marca), `STAFF` (caja), `CUSTOMER` (cliente final).
- **Prueba gratis de 3 días**: cualquier negocio se registra desde la web, obtiene su espacio aislado y prueba 3 días. Al vencer, se le pide activar plan.
- **Cada marca aislada** (multi-tenant): los usuarios de una marca no se cruzan con los de otra.
- **Verificación de correo por código** de 6 dígitos (en modo dev el código sale en pantalla/consola).
- **Tarjeta digital con QR**: el cliente la muestra, el staff la escanea y **suma sello/punto** al instante.
- **Personalización (branding)**: el dueño pone logo, colores, emoji, descripción e info de soporte, y crea/edita sus programas.
- **Panel operador Movix**: MRR, gestión de marcas, **impersonación** ("entrar como dueño"), y facturación manual.
- **Estadísticas** en vivo para el dueño (clientes, canjes, sellos, tasa de canje).
- **Depuración automática** de tarjetas canjeadas + índices para alto tráfico.
- **Seguridad por capas (OWASP)**. **Responsive** en cualquier dispositivo.

---

## 1. Requisitos
- Node.js 20+ (incluye npm; lo pide `node-cron`). Verificá con `node -v`.

## 2. Arrancar el backend (API)
```bash
cd server
npm install
copy .env.example .env        # PowerShell/CMD  (en Git Bash: cp .env.example .env)
# Editá .env y poné un JWT_SECRET real:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npx prisma db push            # crea la base SQLite (dev.db) desde el esquema
npm run seed                  # datos de demo (usuarios de prueba)
node src/server.js            # -> http://localhost:4000
```

## 3. Arrancar el frontend (web)
En otra terminal:
```bash
cd web
npm install
node node_modules/vite/bin/vite.js   # -> http://localhost:5173
```
El frontend hace proxy de `/api` al backend, así que no hay líos de CORS en dev.
Abrí **siempre** http://localhost:5173 (es React con Vite; nunca abrir `index.html`
directo ni con Live Server).

> **En VS Code:** Run and Debug (Ctrl+Shift+D) → "Fidelix: API + Web" → F5.
> El `launch.json` arranca con **node directo** a propósito: el PowerShell de esta
> máquina bloquea `npm.ps1` (ExecutionPolicy), así que arrancar con npm falla.
> Si da `EADDRINUSE`, algún proceso ya tiene el puerto ocupado.

## 4. Accesos de demostración (seed)
Entorno de demo 100% ficticio — el comercio es "Cafetería La Esquina" (plan ACTIVE, nunca expira).

| Rol                 | Correo              | Contraseña  |
|---------------------|---------------------|-------------|
| Movix (operador)    | dueno@movix.com     | movix1234   |
| Dueña del comercio  | dueno@laesquina.cr  | esquina123  |
| Caja (staff)        | caja@laesquina.cr   | caja12345   |
| Cliente final       | cliente@demo.cr     | cliente123  |

**Código de programa para inscribir clientes:** `CAFE10`

Todos los usuarios del seed ya vienen verificados. Los que crees nuevos desde la web
reciben un código de verificación (en modo demo aparece en pantalla y en la consola del server).
El seed también crea clientes extra (Juan 7/10, Ana 4/10, Luis 10/10 lista para canje)
para que el panel se vea vivo.

**Flujos para probar:**
- **Dueño (ADMIN):** entrá con `dueno@laesquina.cr` → *Resumen* (stats), *Programas* (creá/editá, copiá el código, agregá cliente manual), *Marca* (logo, colores, emoji, soporte), *Escanear*, *Reportes*.
- **Cliente:** entrá con `cliente@demo.cr` → mostrá tu QR (7/10, igual que el hero del sitio). O registrá uno nuevo desde "Soy cliente" → verificá el correo → inscribite con `CAFE10`.
- **Escaneo:** con `caja@laesquina.cr` o la dueña → *Escanear* → cámara o pegá el token → *Sumar sello* → al llegar a 10, *Canjear*.
- **Prueba de 3 días:** en la landing → "Probar gratis 3 días" → creás una marca nueva con su espacio aislado.
- **Movix (operador):** entrá con `dueno@movix.com` → *Resumen* (MRR activo/potencial), *Marcas* (buscar, ver usuarios, **entrar como dueño** vía impersonación, activar/suspender/+3 días), *Facturación* (tarifa editable + registrar pago manual).

---

## Arquitectura
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

---

## Planes (fuente de verdad: `server/src/routes/payments.js`)

| Plan          | Usuarios | Mensual | ≈ CRC     |
|---------------|----------|---------|-----------|
| Fidelix Start | 500      | $49     | ₡22,200   |
| Fidelix Pulse | 3,000    | $119    | ₡54,000   |
| Fidelix Hyper | 25,000   | $349    | ₡158,400  |

Fee de implementación $250 (una vez, incluye video UGC). Tipo de cambio del modelo: ₡453.77.

---

## Seguridad (honestidad ante todo)
Ningún software es "inhackeable" — quien lo prometa, miente. Lo que sí es real y estándar de la industria:

- **Contraseñas hasheadas** con bcrypt (costo 12). Nunca en texto plano.
- **JWT** firmado para sesiones; expira automáticamente.
- **Rate limiting** global y reforzado en login/registro (frena fuerza bruta).
- **Helmet**: headers de seguridad (CSP, HSTS, anti-clickjacking).
- **CORS** restringido al dominio del frontend.
- **Validación estricta** de toda entrada con Zod.
- **Prisma parametriza** todas las consultas → inmune a inyección SQL.
- **Aislamiento multi-tenant**: cada admin solo ve/edita lo de su propio negocio.
- **Errores** sin filtrar stack traces en producción.

### Endurecimiento pendiente para producción
- HTTPS obligatorio (reverse proxy: Nginx/Caddy o un PaaS con TLS).
- WAF / firewall a nivel de infraestructura (Cloudflare, AWS WAF).
- Rotación de secretos y `.env` fuera del repo (ya está en `.gitignore`).
- 2FA para admins, refresh tokens, y logs de auditoría.
- Escaneo de dependencias (`npm audit`) en tu CI.

---

## Alto tráfico
- **PostgreSQL** en producción (cambiá `provider` en `schema.prisma` a `postgresql` y la `DATABASE_URL`). Usá pool de conexiones (PgBouncer).
- **Índices** ya definidos en las columnas de consulta (token, status, tenantId, redeemedAt).
- **Escaneo atómico** con transacciones → sin condiciones de carrera al sumar puntos concurrentes.
- **Paginación** en el listado de clientes.
- **Depuración por lotes** (`src/jobs/purge.js`): archiva tarjetas canjeadas viejas y borra sus transacciones voluminosas. Configurable con `RETENTION_DAYS`.

---

## Pendiente para producción (scaffolding — necesita credenciales, NO código faltante)
- **Correo real:** conectar Resend/SendGrid en `server/src/email.js` (hoy modo dev: el código sale en pantalla/consola). Desbloquea verificación + reportes por correo.
- **Pagos:** Stripe (tarjeta) + PayPal en `server/src/routes/payments.js`. Hoy el operador cobra por SINPE/transferencia y activa a mano en Facturación.
- **OAuth** Google/Apple/Microsoft: `server/src/routes/oauth.js` (botones listos, faltan client IDs/secrets).
- **Wallet** Apple/Google: `server/src/routes/wallet.js` (falta cuenta Apple Developer + Google Wallet API). El QR del pase usa el mismo `token` que escanea el staff, así que el flujo ya calza.
- **Deploy:** hosting (Railway/Render/Fly) + PostgreSQL + dominio + HTTPS/WAF (Cloudflare).
- **WhatsApp FAB:** número placeholder `50688888888` en `Public.jsx` → poner el real de Movix.
