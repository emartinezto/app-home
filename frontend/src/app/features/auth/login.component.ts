import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '@core/services/auth.service';
import { ApiError } from '@core/types/api.types';
import { ToastService } from '@core/services/toast.service';

interface LoginForm {
  email: FormControl<string>;
  password: FormControl<string>;
}

function parseErrorBody(raw: unknown): ApiError | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw as ApiError;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as ApiError; } catch { return null; }
  }
  return null;
}

@Component({
  selector: 'cg-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col safe-top safe-bottom">
      <div class="container-page px-6 py-12 flex-1 flex flex-col justify-center">
        <div class="text-center mb-10">
          <div class="w-16 h-16 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center text-3xl">🏡</div>
          <h1 class="text-2xl font-medium text-gray-900">Casa García</h1>
          <p class="text-sm text-gray-500 mt-1">Inicia sesión para entrar a tu hogar</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="label" for="email">Email</label>
            <input id="email" type="email" autocomplete="email" class="input"
                   formControlName="email" placeholder="tu@email.com" />
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <p class="text-xs text-danger mt-1">Introduce un email válido.</p>
            }
          </div>
          <div>
            <label class="label" for="password">Contraseña</label>
            <input id="password" type="password" autocomplete="current-password" class="input"
                   formControlName="password" placeholder="••••••••" />
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <p class="text-xs text-danger mt-1">La contraseña es obligatoria.</p>
            }
          </div>

          @if (errorMsg()) {
            <p class="text-sm text-danger text-center">{{ errorMsg() }}</p>
          }

          <button type="submit" class="btn-primary w-full" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>

        <p class="text-center text-sm text-gray-600 mt-8">
          ¿Aún no tienes cuenta?
          <a routerLink="/signup" class="text-primary font-medium">Regístrate</a>
        </p>
        <p class="text-center text-sm text-gray-500 mt-3">
          <a routerLink="/forgot-password" class="text-primary">¿Olvidaste tu contraseña?</a>
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  private readonly inviteCode = (this.route.snapshot.queryParamMap.get('code') ?? '').trim().toUpperCase();

  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = new FormGroup<LoginForm>({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] })
  });

  async submit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const user = await this.auth.login(this.form.getRawValue());
      this.toast.success(`Hola, ${user.name}`);
      if (this.inviteCode && !user.household_id) {
        void this.router.navigate(['/join'], { queryParams: { code: this.inviteCode } });
      } else {
        void this.router.navigateByUrl(user.household_id ? '/' : '/onboarding/home');
      }
    } catch (e) {
      const err = e as HttpErrorResponse;
      const body = parseErrorBody(err.error);
      const code = body?.error;
      if (err.status === 429 || code === 'TOO_MANY_ATTEMPTS') {
        this.errorMsg.set('Demasiados intentos. Espera unos minutos.');
      } else if (err.status === 401 || code === 'INVALID_CREDENTIALS') {
        this.errorMsg.set('Email o contraseña incorrectos. Si aún no tienes cuenta, regístrate.');
      } else {
        this.errorMsg.set('No pudimos iniciar sesión. Inténtalo de nuevo.');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
