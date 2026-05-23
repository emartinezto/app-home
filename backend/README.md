# Casa García — Backend

API REST + Socket.io para la PWA de reparto de tareas del hogar.

Stack: Node.js 20 (ESM), Express 4, Socket.io 4, MySQL 8 (`mysql2/promise`, sin ORM), JWT + bcrypt, zod, pino, node-cron, web-push.

---

## 1. Arrancar en local en 5 pasos

```bash
# 1. Clonar e instalar
git clone <repo>
cd backend
npm install

# 2. Configurar variables
cp .env.example .env
#    → edita .env: DB_*, JWT_*_SECRET (mínimo 32 chars cada uno)
#    → genera VAPID:  npm run vapid:keys   y pega las claves en .env

# 3. Crear la base de datos y aplicar el schema de Fase 1
mysql -u root -p -e "CREATE DATABASE casa_garcia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p casa_garcia < ../docs/schema.sql   # o como tengas el schema

# 4. Verificar conexión y poblar templates
npm run db:check
npm run db:seed

# 5. Arrancar en modo desarrollo
npm run dev
# → http://localhost:3000/health
```

---

## 2. Variables de entorno

| Variable | Obligatoria | Default | Descripción |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development`, `test` o `production` |
| `PORT` | no | `3000` | Puerto HTTP |
| `LOG_LEVEL` | no | `info` | `fatal`/`error`/`warn`/`info`/`debug`/`trace` |
| `CORS_ORIGIN` | no | `*` | Lista CSV de orígenes permitidos |
| `DB_HOST` | sí | — | Host MySQL |
| `DB_PORT` | no | `3306` | Puerto MySQL |
| `DB_USER` | sí | — | Usuario MySQL |
| `DB_PASSWORD` | sí | — | Password MySQL |
| `DB_NAME` | sí | — | Nombre de la BD |
| `DB_CONNECTION_LIMIT` | no | `10` | Tamaño del pool |
| `JWT_ACCESS_SECRET` | sí | — | ≥ 32 caracteres |
| `JWT_REFRESH_SECRET` | sí | — | ≥ 32 caracteres, distinto del anterior |
| `JWT_ACCESS_TTL` | no | `15m` | TTL del access token (formato `ms`/`jsonwebtoken`) |
| `JWT_REFRESH_TTL_DAYS` | no | `30` | Días de vida del refresh token |
| `BCRYPT_COST` | no | `12` | Cost factor (10–15) |
| `LOGIN_RATE_LIMIT_MAX` | no | `5` | Intentos máximos en la ventana |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | no | `300000` | Ventana en ms (5 min por defecto) |
| `VAPID_PUBLIC_KEY` | recomendada | vacío | Genera con `npm run vapid:keys` |
| `VAPID_PRIVATE_KEY` | recomendada | vacío | Idem |
| `VAPID_SUBJECT` | no | `mailto:admin@casa-garcia.local` | URL/mailto identificador VAPID |
| `CRON_TIMEZONE` | no | `Europe/Madrid` | Timezone de los crons |
| `CRON_ENABLED` | no | `true` | Pon `false` para desactivar todos los crons |
| `DEFAULT_TIMEZONE` | no | `Europe/Madrid` | Timezone por defecto al crear hogar |
| `INVITE_CODE_TTL_HOURS` | no | `48` | Validez del código de invitación |

---

## 3. Scripts npm

| Script | Hace |
|---|---|
| `npm run dev` | Arranca con nodemon (recarga al cambiar `src/`) |
| `npm start` | Arranca en producción |
| `npm run db:check` | Verifica conexión MySQL y que las tablas existen |
| `npm run db:seed` | Inserta los `task_templates` por defecto (idempotente) |
| `npm run vapid:keys` | Genera VAPID keys nuevas |

---

## 4. Probar con curl

```bash
# Signup
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","password":"superSecreto1","name":"Ana"}'

# Login (devuelve access_token y refresh_token)
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","password":"superSecreto1"}' \
  | jq -r .access_token)

# Crear hogar
curl -X POST http://localhost:3000/api/v1/households \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Casa García"}'

# Ver mi hogar (incluye invite_code)
curl http://localhost:3000/api/v1/households/me \
  -H "Authorization: Bearer $TOKEN"

# Activar varias tareas a partir de templates
curl -X POST http://localhost:3000/api/v1/tasks/bulk-activate \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"template_ids":[1,2,5,8]}'

# Definir disponibilidad de la semana (lunes 2026-05-04)
curl -X PUT http://localhost:3000/api/v1/weeks/2026-05-04/availability/me \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"office_days":["mon","wed","thu"]}'

curl -X POST http://localhost:3000/api/v1/weeks/2026-05-04/availability/me/confirm \
  -H "Authorization: Bearer $TOKEN"

# Tras confirmar ambos miembros: generar propuesta
curl -X POST http://localhost:3000/api/v1/weeks/2026-05-04/proposal/generate \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. Estructura de carpetas

```
backend/
├── package.json
├── .env.example
├── nodemon.json
├── README.md
└── src/
    ├── app.js                       # Express + middlewares + routers
    ├── server.js                    # HTTP + Socket.io + cron
    ├── config/
    │   ├── env.js                   # validación zod del .env
    │   ├── db.js                    # pool mysql2 + withTransaction
    │   └── logger.js                # pino + redact
    ├── middlewares/
    │   ├── auth.js                  # requireAuth, requireHousehold
    │   ├── validate.js              # zod
    │   ├── errorHandler.js          # mapeo a contrato
    │   ├── requestId.js
    │   ├── logger.js
    │   └── asyncHandler.js
    ├── utils/
    │   ├── errors.js                # AppError + atajos E.*
    │   ├── jwt.js                   # access/refresh
    │   ├── password.js              # bcrypt
    │   ├── dates.js                 # week_start, day_of_week...
    │   └── invite-code.js
    ├── domains/
    │   ├── auth/
    │   ├── households/
    │   ├── users/
    │   ├── task-templates/
    │   ├── tasks/
    │   ├── weeks/                   # availability + proposals + assignments
    │   ├── reassignments/
    │   ├── stats/
    │   └── settings/
    ├── services/
    │   ├── algorithm.service.js     # algoritmo de reparto v1
    │   └── push.service.js
    ├── sockets/
    │   └── index.js
    ├── cron/
    │   └── index.js
    └── scripts/
        ├── seed.js
        ├── check-db.js
        └── generate-vapid.js
```

Cada dominio sigue `routes → controller → service → repository`. Solo los `repositories` tocan SQL; los `services` reciben/devuelven datos planos (no `req`/`res`); validación con zod en `validators/`.

---

## 6. Eventos Socket.io

Conexión: `io(URL, { auth: { token: <accessToken> } })`. El servidor te mete a la room `household:<id>`.

Eventos emitidos por el servidor:

- `weekly:proposal-ready` — la propuesta de la semana se generó
- `weekly:proposal-confirmed` — alguien confirmó (o ambos → status `active`)
- `assignment:created` — asignación manual añadida
- `task:done` / `task:undone` — alguien marcó/desmarcó una tarea
- `reassignment:requested` / `:accepted` / `:rejected` / `:cancelled`
- `presence:user-online` / `:user-offline`
- `typing:start` / `typing:stop`

---

## 7. Cron jobs (timezone `Europe/Madrid`)

| Cuándo | Qué |
|---|---|
| Domingo 21:00 | Push "Mete tus días de oficina" a quien aún no haya confirmado availability de la próxima semana |
| Domingo 22:30 | Si ambos confirmaron y no hay propuesta, **genera la propuesta automáticamente** |
| Lunes 09:00 | Si la propuesta no está confirmada por ambos, push recordatorio |

Desactívalos con `CRON_ENABLED=false` (útil en tests).

---

## 8. Troubleshooting

**`EADDRINUSE: address already in use :::3000`**
Otro proceso está usando el puerto. Cambia `PORT` en `.env` o mata el proceso:
```bash
lsof -i :3000     # ver PID
kill -9 <PID>
```

**`ER_ACCESS_DENIED_ERROR` o `ECONNREFUSED 127.0.0.1:3306`**
- Comprueba que MySQL está arriba: `mysqladmin -u root -p ping`
- Verifica `DB_USER`/`DB_PASSWORD` en `.env`
- Si MySQL está en otro host (Docker, Railway), revisa `DB_HOST`/`DB_PORT`

**`JWT_ACCESS_SECRET debe tener al menos 32 caracteres`**
Genera secretos largos:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**`AVAILABILITY_NOT_CONFIRMED` al generar propuesta**
Ambos usuarios del hogar deben llamar a `POST /weeks/:weekStart/availability/me/confirm` antes.

**`PROPOSAL_ALREADY_ACTIVE`**
Ya hay una propuesta `pending_confirmation` o `active` para esa semana. Espera al lunes siguiente o, si quieres regenerarla, primero pasa la propuesta a estado `draft` manualmente en BD (no hay endpoint público para eso por diseño).

**Push notifications no llegan**
- Asegúrate de tener `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` en `.env`
- El frontend debe registrar la subscripción contra `POST /users/me/push-subscriptions` con la **misma** `VAPID_PUBLIC_KEY` que usa el backend
- En logs verás `VAPID no configurado` si falta la config

**`HOUSEHOLD_FULL` al unirse**
El hogar ya tiene 2 miembros (límite por trigger). No es un bug.

---

## 9. Decisiones técnicas

- **Refresh tokens opacos** (no JWT): random 64 bytes en BD como SHA-256 → permite revocar uno a uno y rotar en cada `/refresh`.
- **Multi-tenant defensivo**: TODA query filtra por `household_id` aunque parezca redundante.
- **Sin ORM**: queries crudas con `mysql2/promise`. Repositories aíslan SQL del resto.
- **Transacciones explícitas** (`withTransaction`) cuando un endpoint escribe en >1 tabla (ej. signup, generación de propuesta, reasignación aceptada).
- **Algoritmo determinista y reproducible** ante empates exactos (paridad por orden estable).
