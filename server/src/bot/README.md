# Chatbot omnicanal de Fidelix

Bot de atención por chat integrado al backend de Fidelix. Multi-audiencia
(clientes, comercios y ventas), motor **híbrido** (flujos deterministas + IA Claude),
y **agnóstico de canal**: WhatsApp hoy, Messenger/Instagram y TikTok después, sin
reescribir la lógica.

## Por qué la API oficial (y no te banean)

Se construyó sobre la **WhatsApp Business Cloud API** (Graph API oficial de Meta),
**no** sobre librerías tipo Baileys / whatsapp-web.js / Venom. Esas se cuelgan de
WhatsApp Web por ingeniería inversa y **Meta banea el número**. La Cloud API es el
canal sancionado: número dedicado, hospedado por Meta, sin riesgo de baneo.

Para mantener el número sano y nunca caer en spam:

- **Ventana de servicio de 24h:** dentro de 24h del último mensaje del cliente
  respondés libre. **Fuera** de esa ventana solo se puede escribir con
  **plantillas aprobadas** por Meta (`sendTemplate` en `channels/whatsapp.js`).
  Categorías: *utility* (recordatorios "te falta 1 sello"), *marketing* (promos),
  *authentication* (códigos).
- **Opt-in:** solo mandá proactivos a quien dio consentimiento (`ChannelIdentity.optIn`).
- **Calidad:** el número tiene un *quality rating* que sube/baja según cómo reacciona
  la gente. No mandes masivo ni irrelevante.

## Arquitectura

```
webhook (routes.js)
  -> adapter del canal (channels/whatsapp.js)   parsea/verifica/envía
     -> engine.js (núcleo, agnóstico de canal)   identidad · sesión · ruteo
        -> intents.js   detección por palabras clave
        -> flows.js     acciones deterministas (inscribir, sumar, canjear, vincular)
        -> ai.js        Claude como agente con tools (conversación libre)
           -> services.js   dominio de lealtad (misma lógica que la API HTTP)
              -> Prisma (ChannelIdentity, BotSession, BotMessage, + modelos de lealtad)
```

- **`ChannelIdentity`** mapea la persona del canal (teléfono) → `User` de Fidelix.
- **`BotSession`** guarda el flujo/paso en curso y `lastInboundAt` (ventana de 24h).
- **`BotMessage`** es la bitácora de mensajes (depuración/calidad).

## Qué hace

- **Clientes:** inscribirse con código (ej: `CAFE10`), consultar sellos, ver su
  tarjeta/QR, info de canje. (Se crea un usuario "nativo de chat" verificado por
  posesión del número.)
- **Comercios:** vincular su cuenta por correo + código, **sumar sellos** por chat,
  ver el **reporte del día**.
- **Ventas:** captar negocios interesados (lead-gen) y pasar precios.
- **Soporte:** FAQ + derivar a un humano.

## Modo dev (sin credenciales)

Con `WHATSAPP_ENABLED=false` el bot corre en **modo dev**: los mensajes salientes se
imprimen en consola y el webhook simulado funciona. Probalo así:

```bash
# 1) Verificación del webhook (GET)
curl "http://localhost:4000/api/bot/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=fidelix-verify&hub.challenge=123"
# -> 123

# 2) Mensaje entrante simulado (POST)
curl -X POST http://localhost:4000/api/bot/whatsapp/webhook -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[{"changes":[{"field":"messages","value":{"contacts":[{"profile":{"name":"Roy"},"wa_id":"50611112222"}],"messages":[{"from":"50611112222","id":"m1","type":"text","text":{"body":"hola"}}]}}]}]}'
# -> 200, y la respuesta del bot sale en la consola del server

# 3) Estado de configuración
curl http://localhost:4000/api/bot/status
```

## Conectar WhatsApp de verdad

1. **Meta for Developers** (developers.facebook.com) → crear una app tipo *Business*.
2. Agregar el producto **WhatsApp**. Meta te da un **número de prueba** gratis y un
   **Phone number ID**. (Para producción: registrar un número dedicado, **no** tu
   WhatsApp personal.)
3. Copiar a `.env`:
   - `WHATSAPP_ENABLED=true`
   - `WHATSAPP_TOKEN` = access token (para producción, generar uno **permanente** con
     un *system user*, no el temporal de 24h).
   - `WHATSAPP_PHONE_NUMBER_ID` = el Phone number ID.
   - `WHATSAPP_APP_SECRET` = App Secret (Configuración → Básica) para verificar la firma.
   - `WHATSAPP_VERIFY_TOKEN` = una palabra que vos inventás (la misma que ponés en Meta).
4. **Webhook:** en la app de Meta → WhatsApp → Configuration → Webhook:
   - Callback URL: `https://TU_DOMINIO/api/bot/whatsapp/webhook`
   - Verify token: el mismo `WHATSAPP_VERIFY_TOKEN`.
   - Suscribir el campo **messages**.
   - En local necesitás una URL pública (ngrok/cloudflared) porque Meta no llega a
     `localhost`. En producción, el dominio con HTTPS.
5. Para **proactivos** (recordatorios), crear y hacer aprobar **plantillas** en el
   WhatsApp Manager y llamarlas con `sendTemplate`.

## Activar la IA (Claude)

Sin `ANTHROPIC_API_KEY` el bot corre en **solo-flujos** (menús y comandos). Para el
modo híbrido completo:

- `BOT_AI_ENABLED=true`
- `ANTHROPIC_API_KEY=...`
- `BOT_AI_MODEL=claude-opus-4-8` (por defecto, el más capaz). Para **alto volumen**
  conviene `claude-haiku-4-5` (más barato y rápido).

La IA responde en voseo con la voz de Fidelix y puede **ejecutar acciones** (consultar
saldo, inscribir, dar info de programa, captar lead, derivar a humano) vía *tools*.

## Portar a Messenger / Instagram / TikTok

- **Messenger + Instagram:** misma infraestructura Graph de Meta. Completar
  `channels/messenger.js` (webhook, firma, parseo de `entry[].messaging[]` con PSID,
  envío por `/me/messages`) y registrarlo en `routes.js`. El núcleo no cambia.
- **TikTok:** ⚠️ TikTok **no** ofrece API de DM para bots. Lo viable es lead-gen /
  comentarios y **derivar a WhatsApp**. El stub queda como marcador.
