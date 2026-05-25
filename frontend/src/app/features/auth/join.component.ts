import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '@core/services/api.service';
import { ApiError } from '@core/types/api.types';
import { AuthService } from '@core/services/auth.service';
import { HouseholdStore } from '@core/stores/household.store';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'cg-join',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col safe-top safe-bottom">
      <div class="container-page px-6 py-12 flex-1 flex flex-col justify-center">
        <div class="text-center mb-8">
          <div class="w-16 h-16 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center text-3xl">🏡</div>
          <h1 class="text-2xl font-medium text-gray-900">Únete a un hogar</h1>
          @if (code()) {
            <p class="text-sm text-gray-500 mt-1">Código: <span class="font-mono font-medium tracking-wider">{{ code() }}</span></p>
          }
        </div>

        @if (status() === 'joining') {
          <p class="text-center text-sm text-gray-600">Uniéndote al hogar…</p>
        } @else if (status() === 'success') {
          <p class="text-center text-sm text-gray-700">¡Listo! Redirigiendo…</p>
        } @else if (status() === 'error') {
          <p class="text-sm text-danger text-center mb-4">{{ errorMsg() }}</p>
          <a routerLink="/" class="btn-primary w-full text-center">Ir al inicio</a>
        } @else {
          <p class="text-center text-sm text-gray-600">Preparando…</p>
        }
      </div>
    </div>
  `
})
export class JoinComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private household = inject(HouseholdStore);
  private toast = inject(ToastService);

  readonly code = signal<string>('');
  readonly status = signal<'idle' | 'joining' | 'success' | 'error'>('idle');
  readonly errorMsg = signal<string>('');

  constructor() {
    const raw = (this.route.snapshot.queryParamMap.get('code') ?? '').trim().toUpperCase();
    this.code.set(raw);
    void this.run(raw);
  }

  private async run(code: string): Promise<void> {
    if (!code) {
      this.status.set('error');
      this.errorMsg.set('Falta el código de invitación en el enlace.');
      return;
    }

    if (!this.auth.currentUser()) this.auth.bootstrap();

    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/signup'], { queryParams: { code } });
      return;
    }

    if (this.auth.hasHousehold()) {
      this.status.set('error');
      this.errorMsg.set('Ya perteneces a un hogar.');
      return;
    }

    this.status.set('joining');
    try {
      const res = await this.api.joinHousehold({ invite_code: code });
      this.household.setHousehold(res.household);
      const me = this.auth.currentUser();
      if (me) this.auth.setUser({ ...me, household_id: res.household.id });
      this.toast.success('Te has unido al hogar');
      this.status.set('success');
      void this.router.navigate(['/onboarding/schedule'], { queryParams: { joining: '1' } });
    } catch (e) {
      const err = e as HttpErrorResponse;
      const apiCode = (err.error as ApiError | undefined)?.error;
      this.status.set('error');
      if (apiCode === 'NOT_FOUND') this.errorMsg.set('El código no es válido o ha caducado.');
      else if (apiCode === 'HOUSEHOLD_FULL') this.errorMsg.set('Este hogar ya está completo.');
      else this.errorMsg.set('No pudimos unirte al hogar. Inténtalo de nuevo.');
    }
  }
}
