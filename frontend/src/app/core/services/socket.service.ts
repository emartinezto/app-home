import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '@env/environment';
import { StorageService } from './storage.service';
import {
  HouseholdMemberJoinedEvent, PresenceOfflineEvent, PresenceOnlineEvent,
  ReassignRequestEvent, ReassignResponseEvent, SocketEventMap, TaskDoneEvent,
  TaskUndoneEvent, WeeklyAvailabilityConfirmedEvent, WeeklyAvailabilitySetEvent,
  WeeklyProposalConfirmedEvent, WeeklyProposalReadyEvent
} from '../types/socket.types';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private storage = inject(StorageService);
  private zone = inject(NgZone);

  private socket: Socket | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private refreshAttempted = false;

  readonly connected = signal(false);
  readonly onlineUsers = signal<Set<number>>(new Set());

  // Subjects públicos por tipo de evento
  readonly taskDone$ = new Subject<TaskDoneEvent>();
  readonly taskUndone$ = new Subject<TaskUndoneEvent>();
  readonly reassignRequest$ = new Subject<ReassignRequestEvent>();
  readonly reassignResponse$ = new Subject<ReassignResponseEvent>();
  readonly availabilitySet$ = new Subject<WeeklyAvailabilitySetEvent>();
  readonly availabilityConfirmed$ = new Subject<WeeklyAvailabilityConfirmedEvent>();
  readonly proposalReady$ = new Subject<WeeklyProposalReadyEvent>();
  readonly proposalConfirmed$ = new Subject<WeeklyProposalConfirmedEvent>();
  readonly memberJoined$ = new Subject<HouseholdMemberJoinedEvent>();
  readonly online$ = new Subject<PresenceOnlineEvent>();
  readonly offline$ = new Subject<PresenceOfflineEvent>();

  connect(): void {
    if (this.socket && this.socket.connected) return;
    const token = this.storage.getAccessToken();
    if (!token) return;

    this.disconnect();

    this.socket = io(environment.socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000
    });

    this.socket.on('connect', () => {
      this.zone.run(() => {
        this.connected.set(true);
        this.refreshAttempted = false;
        this.startPing();
      });
    });

    this.socket.on('disconnect', () => {
      this.zone.run(() => {
        this.connected.set(false);
        this.stopPing();
      });
    });

    this.socket.on('connect_error', (err: Error & { data?: { error?: string } }) => {
      const code = err?.data?.error;
      if ((code === 'INVALID_TOKEN' || code === 'TOKEN_EXPIRED') && !this.refreshAttempted) {
        this.refreshAttempted = true;
        this.disconnect();
      }
    });

    this.bindEvent('task:done', this.taskDone$);
    this.bindEvent('task:undone', this.taskUndone$);
    this.bindEvent('task:reassign-request', this.reassignRequest$);
    this.bindEvent('task:reassign-response', this.reassignResponse$);
    this.bindEvent('weekly:availability-set', this.availabilitySet$);
    this.bindEvent('weekly:availability-confirmed', this.availabilityConfirmed$);
    this.bindEvent('weekly:proposal-ready', this.proposalReady$);
    this.bindEvent('weekly:proposal-confirmed', this.proposalConfirmed$);
    this.bindEvent('household:member-joined', this.memberJoined$);

    this.socket.on('presence:online', (e: PresenceOnlineEvent) => {
      this.zone.run(() => {
        const next = new Set(this.onlineUsers());
        next.add(e.user_id);
        this.onlineUsers.set(next);
        this.online$.next(e);
      });
    });
    this.socket.on('presence:offline', (e: PresenceOfflineEvent) => {
      this.zone.run(() => {
        const next = new Set(this.onlineUsers());
        next.delete(e.user_id);
        this.onlineUsers.set(next);
        this.offline$.next(e);
      });
    });
  }

  disconnect(): void {
    this.stopPing();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected.set(false);
  }

  /** Reconecta tras refresh de token. */
  reconnectWithFreshToken(): void {
    this.disconnect();
    this.connect();
  }

  /** Reconecta tras un cambio de household (crear o unirse a hogar). */
  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  emitWeeklyViewing(weekStart: string): void {
    this.socket?.emit('weekly:viewing', { week_start: weekStart });
  }

  private bindEvent<K extends keyof SocketEventMap>(name: K, subject: Subject<SocketEventMap[K]>): void {
    this.socket?.on(name as string, (payload: SocketEventMap[K]) => {
      this.zone.run(() => subject.next(payload));
    });
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.socket?.emit('presence:ping', {});
    }, 30_000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}
