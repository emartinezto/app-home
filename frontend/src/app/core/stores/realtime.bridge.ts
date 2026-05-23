import { Injectable, effect, inject } from '@angular/core';
import { SocketService } from '../services/socket.service';
import { WeekStore } from './week.store';
import { NotificationsService } from '../services/notifications.service';
import { HouseholdStore } from './household.store';
import { AuthService } from '../services/auth.service';

/**
 * Conecta los eventos de Socket.io con los stores.
 * Se instancia perezosamente desde el MainLayout.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeBridge {
  private socket = inject(SocketService);
  private week = inject(WeekStore);
  private notifs = inject(NotificationsService);
  private household = inject(HouseholdStore);
  private auth = inject(AuthService);

  private wired = false;

  start(): void {
    if (this.wired) return;
    this.wired = true;

    this.socket.taskDone$.subscribe(e => {
      if (e.week_start === this.week.weekStart()) {
        this.week.patchAssignment(e.assignment_id, {
          is_done: true,
          done_at: e.done_at,
          done_by: e.done_by
        });
      }
      const me = this.auth.currentUser();
      if (me && e.done_by !== me.id) {
        this.notifs.push({ kind: 'task_done', title: 'Tu pareja ha completado una tarea' });
      }
    });

    this.socket.taskUndone$.subscribe(e => {
      if (e.week_start === this.week.weekStart()) {
        this.week.patchAssignment(e.assignment_id, { is_done: false, done_at: null, done_by: null });
      }
    });

    this.socket.reassignRequest$.subscribe(e => {
      const me = this.auth.currentUser();
      if (me && e.requested_to === me.id) {
        this.notifs.push({
          kind: 'reassign_request',
          title: 'Solicitud de reasignación',
          body: `Te piden la tarea: ${e.task_name}`,
          link: `/reassign/incoming/${e.request_id}`
        });
      }
    });

    this.socket.reassignResponse$.subscribe(e => {
      this.notifs.push({
        kind: e.status === 'accepted' ? 'reassign_accepted' : 'reassign_rejected',
        title: e.status === 'accepted' ? 'Reasignación aceptada' : 'Reasignación rechazada',
        body: e.rejection_reason ?? undefined
      });
    });

    this.socket.proposalReady$.subscribe(e => {
      this.notifs.push({
        kind: 'proposal_ready',
        title: 'Propuesta semanal lista',
        body: 'Revisa el reparto antes de confirmar.',
        link: '/proposal'
      });
      if (e.week_start === this.week.weekStart()) {
        void this.week.load(e.week_start, true);
      }
    });

    this.socket.proposalConfirmed$.subscribe(() => {
      void this.week.load(this.week.weekStart(), true);
    });

    this.socket.availabilitySet$.subscribe(() => {
      void this.week.load(this.week.weekStart(), true);
    });

    this.socket.availabilityConfirmed$.subscribe(() => {
      void this.week.load(this.week.weekStart(), true);
    });

    this.socket.memberJoined$.subscribe(e => {
      this.household.upsertMember({ id: e.user_id, name: e.name, avatar_color: e.avatar_color });
      this.notifs.push({ kind: 'member_joined', title: `${e.name} se ha unido al hogar` });
    });

    // Mantén la suscripción a presence ya gestionada por SocketService.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    effect(() => this.socket.connected());
  }
}
