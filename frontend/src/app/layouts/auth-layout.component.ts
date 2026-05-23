import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'cg-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col safe-top safe-bottom">
      <div class="container-page px-4 py-8 flex-1 flex flex-col">
        <router-outlet />
      </div>
    </div>
  `
})
export class AuthLayoutComponent {}
