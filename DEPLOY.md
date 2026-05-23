# Despliegue gratuito de Casa García

Guía completa para desplegar la app sin coste usando:
- **Supabase** → base de datos Postgres (free 500 MB)
- **Render** → backend Node.js (free tier, se duerme tras 15 min sin uso)
- **Vercel** → frontend Angular (free, HTTPS automático)

Tiempo estimado: 45-60 min la primera vez.

---

## 0. Antes de empezar

Necesitas:
- Cuenta de **GitHub** (para que Render y Vercel hagan deploy desde tu repo).
- Tener `git` instalado en tu Mac.
- Una tarjeta NO necesaria para Supabase ni Vercel; Render free tier tampoco la pide.

**Decide el nombre del proyecto y el dominio del backend.** Ejemplo:
- Render: `casa-garcia-backend` → URL = `https://casa-garcia-backend.onrender.com`

---

## 1. Subir el código a GitHub

```bash
cd /Users/hectorgarcia/Desktop/app
# Si no es un repo todavía:
git init
git add .
git commit -m "Initial commit"

# Crea el repo en github.com (puede ser privado) y luego:
git remote add origin git@github.com:TU_USUARIO/casa-garcia.git
git branch -M main
git push -u origin main
```

> **Importante**: revisa que `backend/.env` esté en `.gitignore` (no debe subirse al repo). Si no lo está, añádelo antes del commit.

---

## 2. Supabase — la base de datos

1. Entra en https://supabase.com y crea cuenta.
2. **New project**:
   - Name: `casa-garcia`
   - Database password: genera una segura y **guárdala** (la necesitas para el `DATABASE_URL`).
   - Region: la más cercana a Madrid (ej. `eu-west-3` Paris).
3. Espera 1-2 min a que termine de crearse.
4. En el panel del proyecto → **SQL Editor** → **New query**.
5. Abre el archivo `backend/db/schema.postgres.sql` y pega todo su contenido. Ejecuta (Run).
   - Deberías ver mensajes de `CREATE TABLE`, `CREATE INDEX`, `INSERT 0 24`.
6. Ve a **Project Settings** → **Database** → **Connection string** → **URI**.
   - Copia la cadena que empieza por `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxx.supabase.co:5432/postgres`.
   - Sustituye `[YOUR-PASSWORD]` por la contraseña de paso 2.
   - **Esta es tu `DATABASE_URL`** — guárdala para Render.

---

## 3. Render — el backend

1. Entra en https://render.com y crea cuenta con GitHub.
2. **New +** → **Web Service** → conecta tu repo `casa-garcia`.
3. Configuración:
   - **Name**: `casa-garcia-backend`
   - **Region**: Frankfurt (la más cercana de las free)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**
4. **Environment Variables** → añade:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` *(Render expone el suyo, pero la app lee PORT)* |
   | `LOG_LEVEL` | `info` |
   | `DATABASE_URL` | el URI de Supabase de paso 2.6 |
   | `DB_SSL` | `true` |
   | `CORS_ORIGIN` | déjalo en blanco por ahora, lo rellenas tras Vercel |
   | `JWT_ACCESS_SECRET` | `nBAIkxMd4CqMm_aA-o6u9M6Cew04WaDjJT3DcciNIPJbtTpVsJ33vuxSNT34P840` |
   | `JWT_REFRESH_SECRET` | `S_BA1QEZ318jH8mKNGJQeKwM7xWMWOob5HGMs_LVdXK8qkDJUDStFTpHW_SG1wdF` |
   | `JWT_ACCESS_TTL` | `15m` |
   | `JWT_REFRESH_TTL_DAYS` | `30` |
   | `BCRYPT_COST` | `12` |
   | `LOGIN_RATE_LIMIT_MAX` | `5` |
   | `LOGIN_RATE_LIMIT_WINDOW_MS` | `300000` |
   | `VAPID_PUBLIC_KEY` | `BOTIrXo_axp4uSoJ0tIKSvyhD0QJFCJ114lRtqfIfcoEU_TefWmu2jlHfc3oa_m-GJxN__YWVrX5xShe8Er9vag` |
   | `VAPID_PRIVATE_KEY` | `NLrYp0w1MpdzivhcfJt5YQPFAqmpSVwxzTNAmCjZnCc` |
   | `VAPID_SUBJECT` | `mailto:tu@email.com` *(cambia por tu email real)* |
   | `CRON_TIMEZONE` | `Europe/Madrid` |
   | `CRON_ENABLED` | `true` |
   | `DEFAULT_TIMEZONE` | `Europe/Madrid` |
   | `INVITE_CODE_TTL_HOURS` | `48` |

5. **Create Web Service**. Espera 3-5 min al primer build.
6. Cuando esté **Live**, anota la URL: `https://casa-garcia-backend.onrender.com` (o similar).

---

## 4. Vercel — el frontend

1. **Antes**: edita `frontend/src/environments/environment.production.ts` y cambia `BACKEND_URL_RENDER` por tu URL real de Render. Commit + push.

   ```ts
   const BACKEND_URL = 'https://casa-garcia-backend.onrender.com';
   ```

2. Entra en https://vercel.com y crea cuenta con GitHub.
3. **Add New** → **Project** → importa tu repo.
4. Configuración:
   - **Framework Preset**: `Angular`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` *(Vercel lo detecta solo)*
   - **Output Directory**: `dist/casa-garcia-frontend/browser` *(verifica el path tras el primer build)*
5. **Deploy**. Espera ~2 min.
6. Anota la URL: `https://casa-garcia-frontend.vercel.app` (o el dominio que te dé).

---

## 5. Cerrar el círculo — CORS

1. Vuelve a Render → tu servicio → **Environment** → edita `CORS_ORIGIN`:
   ```
   https://casa-garcia-frontend.vercel.app
   ```
2. **Save Changes** — Render reinicia el backend automáticamente.

---

## 6. Verifica

1. Abre `https://casa-garcia-frontend.vercel.app` en el ordenador.
2. Crea cuenta nueva (el primer request tras 15 min de inactividad tarda ~30s — es el cold start de Render free).
3. Crea hogar, configura horario, tareas, etc.

---

## 7. Instalar en el iPhone como app

1. Abre `https://casa-garcia-frontend.vercel.app` en **Safari** (no Chrome).
2. Botón **Compartir** (cuadrado con flecha hacia arriba).
3. **Añadir a pantalla de inicio**.
4. Confirma el nombre ("Casa García") y pulsa **Añadir**.
5. Ya tienes el icono 🏡 en la pantalla principal. Al pulsar abre la app en modo standalone (sin barras de Safari).

Repite el mismo proceso en el móvil de tu pareja.

---

## Notas y limitaciones de los planes free

- **Render** se duerme tras 15 min sin tráfico. El primer request lo despierta (~30s). Para vosotros (uso diario por las mañanas y noches) significa una espera de medio minuto la primera vez del día.
- **Supabase** free aguanta 500 MB de datos — más que de sobra para 2 usuarios.
- **Vercel** no se duerme, es 100% estático.

## Si algo falla

- **Render dice "Application failed to respond"**: revisa los logs en Render → tu servicio → Logs. Lo más típico es que `DATABASE_URL` esté mal o falte `DB_SSL=true`.
- **El frontend dice "No pudimos iniciar sesión"**: probablemente CORS. Verifica que `CORS_ORIGIN` en Render coincide EXACTO con la URL de Vercel (sin barra final).
- **Las notificaciones push no llegan**: cuando aceptes el permiso en iOS, el navegador registra una subscripción contra el `VAPID_PUBLIC_KEY`. Si las regeneras, tienes que aceptar el permiso de nuevo en el móvil.

## Cuando muevas el dominio (más adelante)

Si compras un dominio propio (ej. `casagarcia.com`) y lo apuntas a Vercel:
1. Actualiza `CORS_ORIGIN` en Render con el nuevo dominio.
2. No hace falta tocar nada más; el backend sigue donde está.
