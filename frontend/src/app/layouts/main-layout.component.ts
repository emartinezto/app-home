import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { TabBarComponent } from '@shared/components/tab-bar.component';
import { HouseholdStore } from '@core/stores/household.store';
import { AuthService } from '@core/services/auth.service';
import { SocketService } from '@core/services/socket.service';
import { RealtimeBridge } from '@core/stores/realtime.bridge';
import { NotificationsService } from '@core/services/notifications.service';

@Component({
  selector: 'cg-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, TabBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <header class="sticky top-0 z-20 bg-white border-b border-gray-200 safe-top">
        <div class="container-page flex items-center justify-between px-4 h-12">
          <span class="font-medium text-primary">Casa García</span>
          <a routerLink="/notifications" class="relative p-2 -mr-2" aria-label="Notificaciones">
            <svg class="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14V11a6 6 0 10-12 0v3a2 2 0 01-.6 1.6L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            @if (unread() > 0) {
              <span class="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-danger text-white text-[10px] flex items-center justify-center">
                {{ unread() }}
              </span>
            }
          </a>
        </div>
      </header>

      <main class="flex-1 pb-24">
        <div class="container-page px-4 py-4">
          <router-outlet />
        </div>
      </main>

      <cg-tab-bar />
    </div>
  `
})
export class MainLayoutComponent implements OnInit {
  private household = inject(HouseholdStore);
  private auth = inject(AuthService);
  private socket = inject(SocketService);
  private bridge = inject(RealtimeBridge);
  private notifs = inject(NotificationsService);

  readonly unread = this.notifs.unreadCount;

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.socket.connect();
      this.bridge.start();
      void this.household.load();
    }
  }
}
