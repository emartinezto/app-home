import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastHostComponent } from './shared/components/toast-host.component';
import { AuthService } from './core/services/auth.service';
import { SocketService } from './core/services/socket.service';

@Component({
  selector: 'cg-root',
  standalone: true,
  imports: [RouterOutlet, ToastHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <cg-toast-host />
  `
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);
  private socket = inject(SocketService);

  ngOnInit(): void {
    this.auth.bootstrap();
    if (this.auth.isAuthenticated()) {
      this.socket.connect();
    }
  }
}
