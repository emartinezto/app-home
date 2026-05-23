import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class PushService {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private readonly CUSTOM_SW = '/sw-push.js';

  isSupported(): boolean {
    return typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'PushManager' in window
      && 'Notification' in window;
  }

  permission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  /** Pide permiso, registra SW de push y suscribe. Devuelve true si todo OK. */
  async enable(): Promise<boolean> {
    if (!this.isSupported()) {
      this.toast.error('Tu navegador no soporta notificaciones push.');
      return false;
    }
    if (!environment.vapidPublicKey) {
      this.toast.error('Falta configurar VAPID_PUBLIC_KEY.');
      return false;
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      this.toast.info('Permiso de notificaciones no concedido.');
      return false;
    }

    const reg = await this.registerSw();
    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(environment.vapidPublicKey)
    });

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys) return false;
    try {
      await this.api.addPushSubscription({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys['p256dh'] ?? '', auth: json.keys['auth'] ?? '' }
      });
      this.toast.success('Notificaciones activadas.');
      return true;
    } catch {
      this.toast.error('No pude registrar la suscripción en el servidor.');
      return false;
    }
  }

  async disable(): Promise<void> {
    if (!this.isSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration(this.CUSTOM_SW);
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  }

  private async registerSw(): Promise<ServiceWorkerRegistration> {
    const existing = await navigator.serviceWorker.getRegistration(this.CUSTOM_SW);
    if (existing) return existing;
    return navigator.serviceWorker.register(this.CUSTOM_SW, { scope: '/' });
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
    return out;
  }
}
