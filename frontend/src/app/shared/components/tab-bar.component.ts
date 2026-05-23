import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NotificationsService } from '@core/services/notifications.service';

@Component({
  selector: 'cg-tab-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white safe-bottom">
      <div class="max-w-md mx-auto grid grid-cols-4">
        <a routerLink="/" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="text-primary"
           class="flex flex-col items-center gap-0.5 py-2 text-gray-500 active:bg-gray-50">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-6 0h6m-6 0v-6h6v6"/>
          </svg>
          <span class="text-[11px]">Hoy</span>
        </a>
        <a routerLink="/week" routerLinkActive="text-primary"
           class="flex flex-col items-center gap-0.5 py-2 text-gray-500 active:bg-gray-50">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <rect x="3" y="5" width="18" height="16" rx="2"/>
            <path stroke-linecap="round" d="M3 10h18M8 3v4M16 3v4"/>
          </svg>
          <span class="text-[11px]">Semana</span>
        </a>
        <a routerLink="/load" routerLinkActive="text-primary"
           class="flex flex-col items-center gap-0.5 py-2 text-gray-500 active:bg-gray-50">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18M7 14l3-3 3 3 5-5"/>
          </svg>
          <span class="text-[11px]">Carga</span>
        </a>
        <a routerLink="/profile" routerLinkActive="text-primary"
           class="flex flex-col items-center gap-0.5 py-2 text-gray-500 active:bg-gray-50 relative">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="8" r="4"/>
            <path stroke-linecap="round" d="M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8"/>
          </svg>
          <span class="text-[11px]">Perfil</span>
          @if (unread() > 0) {
            <span class="absolute top-1.5 right-[calc(50%-18px)] min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] flex items-center justify-center">
              {{ unread() }}
            </span>
          }
        </a>
      </div>
    </nav>
  `
})
export class TabBarComponent {
  private notifs = inject(NotificationsService);
  readonly unread = this.notifs.unreadCount;
}
