# Sello · Programa de recompensas para retail

Plataforma web de lealtad **multi-marca** (SaaS). Desarrollada por **Movix**.

- **Roles**: `SUPERADMIN` (Movix/vos — ve todas las marcas), `ADMIN` (dueño de la marca), `STAFF` (caja), `CUSTOMER` (cliente final).
- **Prueba gratis de 3 días**: cualquier negocio se registra desde la web, obtiene su espacio aislado y prueba 3 días. Al vencer, se le pide activar plan.
- **Cada marca aislada**: los usuarios de "Kiku Holding" no se cruzan con los de otra marca. Se le puede entregar el acceso al cliente sin exponer a nadie más.
- **Verificación de correo por código**: cada usuario confirma su correo con un código de 6 dígitos (correos verídicos).
- **Tarjeta digital con QR**: el cliente la muestra, el staff la escanea y **suma sello/punto** al instante.
- **Personalización (branding)**: el dueño pone logo, colores, emoji, descripción e info de soporte, y crea/edita sus programas (sellos vs. puntos, meta, recompensa, emoji).
- **Estadísticas** en vivo para el dueño (clientes, canjes, sellos, tasa de canje).
- **Soporte y guías** para el cliente dentro del sitio.
- **Canje** de recompensa al llegar a la meta.
- **Wallet Apple/Google**: scaffolding listo para tus certificados.
- **Depuración automática** de tarjetas canjeadas + índices para **alto tráfico**.
- **Seguridad por capas (OWASP)**.
- **Responsive**: funciona en cualquier dispositivo desde el navegador (sin instalar apps).

---

## 1. Requisitos
- Node.js 18+ (incluye npm). Verificá con `node -v`.

## 2. Arrancar el backend (API)
```bash
cd server
npm install
copy .env.example .env        # PowerShell/CMD  (en Git Bash: cp .env.example .env)
# Editá .env y poné un JWT_SECRET real:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm run db:push               # crea la base SQLite (dev.db) desde el esquema
npm run seed                  # datos de demo (usuarios de prueba)
npm run dev                   # -> http://localhost:4000
```

## 3. Arrancar el frontend (PWA)
En otra terminal:
```bash
cd web
npm install
npm run dev                   # -> http://localhost:5173
```
El frontend hace proxy de `/api` al backend, así que no hay líos de CORS en dev.

## 4. Accesos de prueba (seed)
| Rol                | Correo            | Contraseña   |
|--------------------|-------------------|--------------|
| SUPERADMIN (Movix) | dueno@movix.com   | movix1234    |
| Dueño / Builder    | admin@kiku.com    | kiku1234     |
| Cajero (Staff)     | caja@kiku.com     | caja1234     |
| Cliente            | cliente@kiku.com  | cliente1234  |

**Código de programa para inscribir clientes:** `KIKU10`

Todos los usuarios del seed ya vienen verificados. Los que crees nuevos desde la web
reciben un código de verificación (en modo demo aparece en pantalla y en la consola del server).

**Flujos para probar:**
- **Builder (dueño):** entrá con `admin@kiku.com` → *Resumen* (stats), *Programas* (creá/editá, copiá el código), *Marca* (logo, colores, emoji, soporte), *Escanear*.
- **Cliente:** entrá con `cliente@kiku.com` → mostrá tu QR. O registrá uno nuevo desde "Soy cliente" → verificá el correo → inscribite con `KIKU10`.
- **Escaneo:** con `caja@kiku.com` o el admin → *Escanear* → cámara o pegá el token → *Sumar sello* → al llegar a 10, *Canjear*.
- **Prueba de 3 días:** en la landing → "Probar gratis 3 días" → creás una marca nueva con su espacio aislado.
- **Movix (vos):** entrá con `dueno@movix.com` → ves TODAS las marcas y dónde queda almacenado cada usuario.

---

## Arquitectura
```
sello/
├── server/            API Node + Express + Prisma
│   ├── prisma/        esquema de datos + seed
│   └── src/
│       ├── routes/    auth, programs, loyalty, wallet
│       ├── jobs/      purge (depuración diaria)
│       ├── security.js middleware.js validate.js
│       └── app.js server.js
└── web/               PWA React + Vite
    └── src/
        ├── pages/     Login, CustomerView, AdminView, ScanPanel
        └── api.js styles.css
```

---

## Seguridad (honestidad ante todo)
Ningún software es "inhackeable" — quien lo prometa, miente. Lo que sí es real y estándar de la industria:

- **Contraseñas hasheadas** con bcrypt (costo 12). Nunca se guardan en texto plano.
- **JWT** firmado para sesiones; expira automáticamente.
- **Rate limiting** global y reforzado en login/registro (frena fuerza bruta).
- **Helmet**: headers de seguridad (CSP, HSTS, anti-clickjacking).
- **CORS** restringido al dominio del frontend.
- **Validación estricta** de toda entrada con Zod.
- **Prisma parametriza** todas las consultas → inmune a inyección SQL.
- **Aislamiento multi-tenant**: cada admin solo ve/edita lo de su propio negocio.
- **Errores** sin filtrar stack traces en producción.

### Endurecimiento pendiente para producción
- HTTPS obligatorio (poné un reverse proxy: Nginx/Caddy o un PaaS con TLS).
- WAF / firewall a nivel de infraestructura (Cloudflare, AWS WAF) — el "firewall" real vive en la red, no en el código.
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

## Wallet nativo (Apple / Google)
El código de generación del pase está en `server/src/routes/wallet.js`. Hoy devuelve el
modelo de datos del pase; para emitir pases reales necesitás:

- **Apple Wallet**: cuenta Apple Developer, un *Pass Type ID* y sus certificados. Poné
  `APPLE_WALLET_ENABLED=true` y firmá el `.pkpass` (ej. con `passkit-generator`).
- **Google Wallet**: habilitá la Google Wallet API y un *service account* (issuer). Poné
  `GOOGLE_WALLET_ENABLED=true` y firmá el JWT del "Save to Google Wallet".

El QR del pase usa el mismo `token` que escanea el staff, así que el flujo ya calza.

---

## Roadmap (lo que sigue, siendo realista)
1. **Apps nativas** iOS/Android reales → con React Native reutilizando esta API (la PWA cubre el MVP hoy).
2. Firmado real de pases de Wallet con tus certificados.
3. Notificaciones push (recordar al cliente que le falta 1 sello).
4. Panel de métricas para el admin (retención, canjes, clientes activos).
5. Tests automatizados + CI con `npm audit`.
```
