import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { ApiError } from '@core/types/api.types';
import { HouseholdStore } from '@core/stores/household.store';
import { ToastService } from '@core/services/toast.service';

interface SignupForm {
  name: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'cg-signup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col safe-top safe-bottom">
      <div class="container-page px-6 py-12 flex-1 flex flex-col justify-center">
        <div class="text-center mb-10">
          <div class="w-16 h-16 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center text-3xl">🏡</div>
          <h1 class="text-2xl font-medium text-gray-900">Crea tu cuenta</h1>
          <p class="text-sm text-gray-500 mt-1">Empieza a repartir tareas con tu pareja</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="label" for="name">Tu nombre</label>
            <input id="name" type="text" autocomplete="given-name" class="input"
                   formControlName="name" placeholder="Ana" />
          </div>
          <div>
            <label class="label" for="email">Email</label>
            <input id="email" type="email" autocomplete="email" class="input"
                   formControlName="email" placeholder="tu@email.com" />
          </div>
          <div>
            <label class="label" for="password">Contraseña</label>
            <input id="password" type="password" autocomplete="new-password" class="input"
                   formControlName="password" placeholder="Mínimo 8 caracteres" />
            <p class="text-xs text-gray-500 mt-1">Al menos 8 caracteres.</p>
          </div>

          @if (errorMsg()) {
            <p class="text-sm text-danger text-center">{{ errorMsg() }}</p>
          }

          <button type="submit" class="btn-primary w-full" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Creando cuenta…' : 'Crear cuenta' }}
          </button>
        </form>

        <p class="text-center text-sm text-gray-600 mt-8">
          ¿Ya tienes cuenta?
          <a routerLink="/login" class="text-primary font-medium">Entra</a>
        </p>
      </div>
    </div>
  `
})
export class SignupComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private household = inject(HouseholdStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  private readonly inviteCode = (this.route.snapshot.queryParamMap.get('code') ?? '').trim().toUpperCase();

  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = new FormGroup<SignupForm>({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] })
  });

  async submit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      await this.auth.signup(this.form.getRawValue());
      if (this.inviteCode) {
        try {
          const res = await this.api.joinHousehold({ invite_code: this.inviteCode });
          this.household.setHousehold(res.household);
          const me = this.auth.currentUser();
          if (me) this.auth.setUser({ ...me, household_id: res.household.id });
          this.toast.success('Cuenta creada y unido al hogar');
          void this.router.navigate(['/onboarding/schedule'], { queryParams: { joining: '1' } });
          return;
        } catch {
          this.toast.info('Cuenta creada, pero no pudimos usar el código.');
          void this.router.navigateByUrl('/onboarding/home');
          return;
        }
      }
      this.toast.success('¡Cuenta creada!');
      void this.router.navigateByUrl('/onboarding/home');
    } catch (e) {
      const err = e as HttpErrorResponse;
      const code = (err.error as ApiError | undefined)?.error;
      if (code === 'EMAIL_TAKEN') this.errorMsg.set('Ese email ya está registrado.');
      else if (code === 'VALIDATION') this.errorMsg.set('Revisa los datos del formulario.');
      else this.errorMsg.set('No pudimos crear la cuenta. Inténtalo de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }
}
