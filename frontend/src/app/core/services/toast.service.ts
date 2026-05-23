import { Injectable, signal } from '@angular/core';
import { ApiErrorCode } from '../types/api.types';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  ttl: number;
}

const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  VALIDATION: 'Revisa los datos del formulario.',
  INVALID_CREDENTIALS: 'Email o contraseña incorrectos.',
  TOKEN_EXPIRED: 'Tu sesión ha expirado.',
  INVALID_TOKEN: 'Sesión inválida, inicia sesión de nuevo.',
  NO_AUTH: 'Inicia sesión para continuar.',
  NOT_YOUR_HOUSEHOLD: 'No tienes acceso a este hogar.',
  NOT_FOUND: 'No encontrado.',
  EMAIL_TAKEN: 'Ese email ya está registrado.',
  HOUSEHOLD_FULL: 'El hogar ya tiene dos miembros.',
  PROPOSAL_ALREADY_ACTIVE: 'Ya hay una propuesta activa para esta semana.',
  AVAILABILITY_NOT_CONFIRMED: 'Aún falta confirmar la disponibilidad.',
  ALREADY_DONE: 'Esa tarea ya estaba marcada.',
  WEEK_ALREADY_LOCKED: 'La semana ya está cerrada.',
  PENDING_REQUEST_EXISTS: 'Ya hay una solicitud pendiente para esa tarea.',
  TOO_MANY_ATTEMPTS: 'Demasiados intentos. Espera un momento.',
  UNKNOWN: 'Algo ha ido mal. Inténtalo otra vez.'
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  readonly toasts = signal<Toast[]>([]);

  success(message: string, ttl = 3000): void { this.push('success', message, ttl); }
  error(message: string, ttl = 4000): void { this.push('error', message, ttl); }
  info(message: string, ttl = 3000): void { this.push('info', message, ttl); }

  errorCode(code: ApiErrorCode | undefined, fallback?: string): void {
    const msg = code ? ERROR_MESSAGES[code] : (fallback ?? ERROR_MESSAGES.UNKNOWN);
    this.error(msg);
  }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  private push(kind: ToastKind, message: string, ttl: number): void {
    const id = ++this.counter;
    this.toasts.update(list => [...list, { id, kind, message, ttl }]);
    setTimeout(() => this.dismiss(id), ttl);
  }
}
