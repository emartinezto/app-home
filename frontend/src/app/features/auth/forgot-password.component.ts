import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'cg-forgot-password',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col safe-top safe-bottom">
      <div class="container-page px-6 py-12 flex-1 flex flex-col justify-center">
        <div class="text-center mb-8">
          <div class="w-16 h-16 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center text-3xl">🔑</div>
          <h1 class="text-2xl font-medium text-gray-900">Olvidé mi contraseña</h1>
        </div>

        <div class="card mb-4">
          <p class="text-sm text-gray-700 mb-3">
            En Casa García las contraseñas las restaura tu pareja para no depender de servicios de email.
          </p>
          <p class="text-sm text-gray-700 mb-3">
            <strong>Pídele a tu pareja que:</strong>
          </p>
          <ol class="text-sm text-gray-700 space-y-1 list-decimal pl-5">
            <li>Abra la app desde su iPhone.</li>
            <li>Vaya a su <strong>Perfil</strong>.</li>
            <li>Pulse <strong>"Resetear mi contraseña"</strong> en la fila con tu nombre.</li>
            <li>Te mande la contraseña nueva por WhatsApp.</li>
          </ol>
        </div>

        <a routerLink="/login" class="btn-primary w-full text-center">Volver al login</a>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {}
