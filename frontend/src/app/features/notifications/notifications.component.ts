import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationsService, InAppNotification, InAppNotificationKind } from '@core/services/notifications.service';
import { EmptyStateComponent } from '@shared/components/empty-state.component';
import { RelativeDatePipe } from '@shared/pipes/relative-date.pipe';

const ICONS: Record<InAppNotificationKind, { emoji: string; bg: string; tint: string }> = {
  proposal_ready:    { emoji: '📅', bg: '#FEF3C7', tint: '#92400E' },
  reassign_request:  { emoji: '↔️', bg: '#DBEAFE', tint: '#1E40AF' },
  reassign_accepted: { emoji: '✓',  bg: '#DCFCE7', tint: '#166534' },
  reassign_rejected: { emoji: '✕',  bg: '#FEE2E2', tint: '#991B1B' },
  reminder:          { emoji: '⏰', bg: '#F3F4F6', tint: '#374151' },
  member_joined:     { emoji: '👋', bg: '#E0E7FF', tint: '#3730A3' },
  task_done:         { emoji: '✓',  bg: '#DCFCE7', tint: '#166534' }
};

@Component({
  selector: 'cg-notifications',
  standalone: true,
  imports: [EmptyStateComponent, RelativeDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-medium text-gray-900">
        Notificaciones
        @if (unread() > 0) {
          <span class="ml-2 inline-flex min-w-[20px] h-5 px-1.5 rounded-full bg-danger text-white text-xs items-center justify-center align-middle">
            {{ unread() }}
          </span>
        }
      </h1>
      @if (notifications().length > 0) {
        <button class="text-sm text-primary" (click)="markAllRead()">Marcar todas</button>
      }
    </header>

    @if (notifications().length === 0) {
      <cg-empty-state icon="🔔" title="Sin notificaciones" description="Te avisaremos cuando haya novedades." />
    } @else {
      <div class="space-y-2">
        @for (n of notifications(); track n.id) {
          <button type="button"
                  class="w-full text-left flex items-start gap-3 p-3 rounded-2xl border transition border-gray-200"
                  [class.bg-gray-50]="!n.read"
                  [class.bg-white]="n.read"
                  (click)="open(n)">
            <span class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  [style.background-color]="iconBg(n.kind)"
                  [style.color]="iconTint(n.kind)">
              {{ iconEmoji(n.kind) }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900">{{ n.title }}</p>
              @if (n.body) {
                <p class="text-xs text-gray-600 truncate">{{ n.body }}</p>
              }
              <p class="text-[11px] text-gray-400 mt-0.5">{{ n.created_at | relativeDate }}</p>
            </div>
            @if (!n.read) {
              <span class="w-2 h-2 rounded-full bg-primary mt-2 shrink-0"></span>
            }
          </button>
        }
      </div>
    }
  `
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private notifs = inject(NotificationsService);
  private router = inject(Router);

  readonly notifications = this.notifs.notifications;
  readonly unread = this.notifs.unreadCount;

  ngOnInit(): void {
    setTimeout(() => this.notifs.markAllRead(), 1000);
  }

  ngOnDestroy(): void {}

  iconEmoji(kind: InAppNotificationKind): string { return ICONS[kind].emoji; }
  iconBg(kind: InAppNotificationKind): string { return ICONS[kind].bg; }
  iconTint(kind: InAppNotificationKind): string { return ICONS[kind].tint; }

  markAllRead(): void { this.notifs.markAllRead(); }

  open(n: InAppNotification): void {
    this.notifs.markRead(n.id);
    if (n.link) void this.router.navigateByUrl(n.link);
  }
}
