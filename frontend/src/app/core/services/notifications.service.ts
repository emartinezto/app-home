import { Injectable, computed, signal } from '@angular/core';

export type InAppNotificationKind =
  | 'proposal_ready'
  | 'reassign_request'
  | 'reassign_accepted'
  | 'reassign_rejected'
  | 'reminder'
  | 'member_joined'
  | 'task_done';

export interface InAppNotification {
  id: number;
  kind: InAppNotificationKind;
  title: string;
  body?: string;
  read: boolean;
  created_at: string;
  link?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private counter = 0;
  readonly notifications = signal<InAppNotification[]>([]);
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  push(input: Omit<InAppNotification, 'id' | 'read' | 'created_at'> & Partial<Pick<InAppNotification, 'created_at'>>): void {
    const n: InAppNotification = {
      id: ++this.counter,
      read: false,
      created_at: input.created_at ?? new Date().toISOString(),
      ...input
    };
    this.notifications.update(list => [n, ...list].slice(0, 100));
  }

  markAllRead(): void {
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
  }

  markRead(id: number): void {
    this.notifications.update(list => list.map(n => n.id === id ? { ...n, read: true } : n));
  }

  clear(): void {
    this.notifications.set([]);
  }
}
