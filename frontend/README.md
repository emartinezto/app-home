# Casa García — Frontend

PWA en Angular 18 (standalone + signals + Tailwind) para repartir tareas del hogar entre una pareja.
Conecta con el backend de Fase 2 (Node.js + Express + MySQL + Socket.io).

## Stack

- Angular 18 (standalone components, signals, control flow `@if`/`@for`)
- TypeScript strict
- Tailwind CSS
- Reactive Forms tipados
- Socket.io-client 4
- date-fns + date-fns-tz (locale `es`, TZ `Europe/Madrid`)
- Web Push API + Service Worker propio (`sw-push.js`)
- Angular Service Worker para cacheo de assets

## Arrancar en local en 5 pasos

1. **Instalar dependencias**

   ```bash
   cd frontend
   npm install
   ```

2. **Configurar entorno de desarrollo**

   Edita `src/environments/environment.development.ts` con la URL de tu backend de Fase 2 y la VAPID public key:

   ```ts
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:3000/api/v1',
     socketUrl: 'http://localhost:3000',
     vapidPublicKey: 'BL...'   // misma que VAPID_PUBLIC_KEY del backend
   };
   ```

3. **Asegúrate de que el backend está corriendo**

   El backend de Fase 2 debe estar levantado en `http://localhost:3000` con la base de datos MySQL accesible. Si lo tienes en docker-compose, basta `docker compose up api mysql`.

4. **Arrancar el dev server**

   ```bash
   npm start
   ```

5. **Abrir y probar**

   Visita http://localhost:4200 y crea cuenta en `/signup`. Tras registrarte caerás en el wizard de onboarding (`/onboarding/home`).

## Probar la PWA (build de producción)

```bash
npm run build:prod
npm run serve:prod
```

Visita http://localhost:8080. El Service Worker de Angular cachea assets; se ve mejor desde la pestaña "Application" de DevTools.

> Para que el Service Worker funcione realmente debes servirlo en `https://` o `http://localhost`. El `ng serve` no registra el SW.

## Probar Web Push en local

1. Genera un par de claves VAPID en el backend (Fase 2 ya las gestiona).
2. Pega la **public key** en `environment.development.ts` → `vapidPublicKey`.
3. Arranca front y back, entra a la app y desde **Perfil → Push activadas** dale al toggle. Debe aparecer el prompt de permiso del navegador.
4. Una vez concedido, el frontend hace `POST /users/me/push-subscriptions`. El backend puede entonces enviar pushes con la private key.

> El push solo funciona en `localhost` o `https://`. Chrome/Firefox/Edge soportan Web Push; Safari iOS lo soporta solo si la app está instalada como PWA en la pantalla de inicio.

## Variables de entorno

Las variables del frontend viven en `src/environments/`. Solo hay tres y se inyectan en build:

| Variable          | Lado  | Ejemplo                                          | Descripción                                |
| ----------------- | ----- | ------------------------------------------------ | ------------------------------------------ |
| `apiUrl`          | front | `http://localhost:3000/api/v1`                   | Base de la API REST                         |
| `socketUrl`       | front | `http://localhost:3000`                          | Origen de Socket.io (suele = API sin path) |
| `vapidPublicKey`  | front | `BLk...`                                         | VAPID public key. Misma que el backend     |

En Railway, esas tres se configuran como variables del servicio del frontend (Fase 4).

## Estructura

```
src/app/
├─ core/
│  ├─ services/    # api, auth, socket, push, storage, toast, notifications
│  ├─ interceptors # auth (Bearer), error (refresh+retry, toasts)
│  ├─ guards/      # auth, household, no-auth
│  ├─ stores/      # household, week, realtime bridge
│  ├─ types/       # api types y socket types
│  └─ utils/       # date.util (TZ Europe/Madrid)
├─ shared/
│  ├─ components/  # avatar, category-dot, load-bar, task-card, task-sheet,
│  │               # bottom-sheet, tab-bar, toast-host, confirm-modal,
│  │               # progress-bar, skeleton, empty-state, day-pill
│  └─ pipes/       # relativeDate, weight
├─ features/
│  ├─ auth/        # login, signup
│  ├─ onboarding/  # 5 pasos: home, invite, schedule, tasks, weights
│  ├─ dashboard/   # /  vista diaria
│  ├─ week/        # /week vista semanal
│  ├─ availability # /availability editor domingo
│  ├─ proposal/    # /proposal revisión y confirmación
│  ├─ reassignment # outgoing + incoming
│  ├─ notifications# /notifications
│  ├─ stats/       # /load
│  ├─ profile/     # /profile
│  └─ settings/    # /settings
└─ layouts/        # main-layout (con tab-bar), auth-layout
```

## Cómo se conecta al backend

- Toda llamada HTTP pasa por el `authInterceptor` (añade `Authorization: Bearer ...` salvo en `/auth/login|signup|refresh`).
- El `errorInterceptor` captura 401:
  - Si el body trae `error: "TOKEN_EXPIRED"` → llama a `POST /auth/refresh` con el refresh token, guarda los nuevos tokens, reconecta el socket y reintenta la request original **una vez**.
  - Cualquier otro 401 → limpia tokens, desconecta socket, redirige a `/login`.
- El `SocketService` maneja la conexión persistente, ping de presencia cada 30s y reconexión automática tras refresh de token.
- El `RealtimeBridge` (instanciado al entrar en `MainLayout`) conecta los eventos del socket con los stores y con las notificaciones in-app.

## Troubleshooting

### CORS

Si ves `Access-Control-Allow-Origin missing`, asegúrate de que el backend de Fase 2 acepta el origen `http://localhost:4200` en su middleware CORS.

### Loop de 401 / "Sesión expirada" repetido

- Verifica que el endpoint `/auth/refresh` está accesible y responde con `{ user, access_token, refresh_token }`.
- Si el backend está reiniciándose con frecuencia, los refresh tokens se invalidan y caes en loop. Borra `localStorage` (`cg.access_token`, `cg.refresh_token`, `cg.user`) y vuelve a entrar.

### Push: permiso denegado

- Si el navegador denegó el permiso una vez, no volverá a pedirlo. Hay que ir a la configuración del sitio (icono del candado en la barra) y reactivar las notificaciones manualmente.
- Comprueba que `vapidPublicKey` coincide **exactamente** con la del backend; si no, `pushManager.subscribe` falla en silencio.
- En Safari iOS: la PWA debe estar instalada en la pantalla de inicio para recibir push.

### Socket.io desconecta y reconecta sin parar

- Lo más habitual: el JWT expiró. El `SocketService` detecta `INVALID_TOKEN`/`TOKEN_EXPIRED` en el handshake y debería refrescar; si no, recarga la página.
- Si el backend usa un `path` distinto de `/socket.io`, ajusta `environment.socketUrl`.

### Tailwind no aplica clases dinámicas

Tailwind purga lo que no detecta en plantillas. En este proyecto evitamos clases dinámicas de Tailwind: usamos `[style.background-color]` y togglers explícitos.

## Convenciones

- Mensajes de UI en español; código y tipos en inglés.
- Standalone components siempre, `OnPush` siempre.
- `inject()` en lugar de constructor injection.
- Estado: signals locales por componente; `signal()` en stores cuando hace falta compartir.
