import webpush from 'web-push';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import {
  findPushSubscriptionsByUser,
  deletePushSubscription,
  touchPushSubscription,
} from '../domains/users/users.repository.js';

let initialized = false;

export function initPushService() {
  if (!config.vapid.enabled) {
    logger.warn('VAPID no configurado: push notifications desactivadas');
    return;
  }
  webpush.setVapidDetails(
    config.vapid.subject,
    config.vapid.publicKey,
    config.vapid.privateKey,
  );
  initialized = true;
  logger.info('🔔 Push service inicializado');
}

export async function sendToUser(userId, { title, body, url }) {
  if (!initialized) return { sent: 0, failed: 0, skipped: true };

  let subs;
  try {
    subs = await findPushSubscriptionsByUser(userId);
  } catch (err) {
    logger.error({ err, user_id: userId }, 'No se pudieron leer push subscriptions');
    return { sent: 0, failed: 0 };
  }
  if (subs.length === 0) return { sent: 0, failed: 0 };

  const payload = JSON.stringify({ title, body, url, ts: Date.now() });
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
          },
          payload,
          { TTL: 60 * 60 * 24 },
        );
        sent += 1;
        await touchPushSubscription(sub.id).catch(() => {});
      } catch (err) {
        const status = err.statusCode || err.status;
        if (status === 404 || status === 410) {
          logger.info(
            { sub_id: sub.id, user_id: userId, status },
            'subscription expirada → borrando',
          );
          await deletePushSubscription(userId, sub.id).catch(() => {});
        } else {
          logger.warn(
            { err: err.message, status, sub_id: sub.id, user_id: userId },
            'Error enviando push',
          );
        }
        failed += 1;
      }
    }),
  );

  return { sent, failed };
}

export function isPushEnabled() {
  return initialized;
}
