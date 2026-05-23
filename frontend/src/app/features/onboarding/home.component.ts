import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { HouseholdStore } from '@core/stores/household.store';
import { ProgressBarComponent } from '@shared/components/progress-bar.component';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'cg-onboarding-home',
  standalone: true,
  imports: [ReactiveFormsModule, ProgressBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white flex flex-col safe-top safe-bottom">
      <div class="container-page px-6 pt-6 pb-12 flex-1 flex flex-col">
        <cg-progress-bar [value]="20" />
        <p class="text-xs text-gray-500 mt-2">Paso 1 de 5</p>

        <div class="flex-1 flex flex-col justify-center">
          <div class="text-center mb-8">
            <div class="w-24 h-24 rounded-3xl bg-primary mx-auto mb-4 flex items-center justify-center text-5xl">🏡</div>
            <h1 class="text-2xl font-medium text-gray-900">Crea tu hogar</h1>
            <p class="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
              Dale un nombre a tu hogar. Tu pareja se unirá con un código.
            </p>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="label" for="hh-name">Nombre del hogar</label>
              <input id="hh-name" type="text" class="input"
                     formControlName="name" placeholder="Casa García" autofocus />
            </div>
            <button type="submit" class="btn-primary w-full" [disabled]="form.invalid || loading()">
              {{ loading() ? 'Creando…' : 'Siguiente' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `
})
export class OnboardingHomeComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private household = inject(HouseholdStore);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly loading = signal(false);

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] })
  });

  async submit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    try {
      const res = await this.api.createHousehold(this.form.getRawValue());
      this.household.setHousehold(res.household);
      const me = this.auth.currentUser();
      if (me) this.auth.setUser({ ...me, household_id: res.household.id });
      this.toast.success('Hogar creado');
      void this.router.navigateByUrl('/onboarding/invite');
    } catch {
      // toast lo emite el interceptor
    } finally {
      this.loading.set(false);
    }
  }
}
