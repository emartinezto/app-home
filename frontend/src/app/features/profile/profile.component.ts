import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { HouseholdStore } from '@core/stores/household.store';
import { AvatarComponent } from '@shared/components/avatar.component';
import { BottomSheetComponent } from '@shared/components/bottom-sheet.component';
import { ConfirmModalComponent } from '@shared/components/confirm-modal.component';
import { ToastService } from '@core/services/toast.service';
import { PushService } from '@core/services/push.service';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

@Component({
  selector: 'cg-profile',
  standalone: true,
  imports: [AvatarComponent, BottomSheetComponent, ConfirmModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-4">
      <h1 class="text-2xl font-medium text-gray-900">Perfil</h1>
    </header>

    @if (user(); as me) {
      <div class="card flex flex-col items-center text-center mb-4 py-6">
        <cg-avatar [name]="me.name" [color]="me.avatar_color" [size]="80" [square]="true" />
        <h2 class="font-medium text-lg mt-3">{{ me.name }}</h2>
        <p class="text-sm text-gray-500">
          {{ household()?.name ?? 'Sin hogar' }}
          @if (joinedLabel()) {
            · {{ joinedLabel() }}
          }
        </p>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="card text-center">
          <p class="text-xs text-gray-500 mb-1">Tareas esta semana</p>
          <p class="text-2xl font-medium text-primary">—</p>
        </div>
        <div class="card text-center">
          <p class="text-xs text-gray-500 mb-1">% de carga</p>
          <p class="text-2xl font-medium text-primary">—</p>
        </div>
      </div>

      <section class="card mb-4">
        <h3 class="text-xs uppercase tracking-wide text-gray-500 mb-3">Notificaciones</h3>
        <div class="space-y-3">
          <label class="flex items-center justify-between cursor-pointer">
            <span class="text-sm">Push activadas</span>
            <button type="button"
                    class="relative inline-block w-11 h-6 rounded-full transition"
                    [class.bg-primary]="pushEnabled()"
                    [class.bg-gray-300]="!pushEnabled()"
                    (click)="togglePush()">
              <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                    [class.translate-x-5]="pushEnabled()"></span>
            </button>
          </label>
          @for (key of toggleKeys; track key) {
            <label class="flex items-center justify-between cursor-pointer">
              <span class="text-sm">{{ toggleLabel(key) }}</span>
              <button type="button"
                      class="relative inline-block w-11 h-6 rounded-full transition"
                      [class.bg-primary]="prefs()[key]"
                      [class.bg-gray-300]="!prefs()[key]"
                      (click)="togglePref(key)">
                <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                      [class.translate-x-5]="prefs()[key]"></span>
              </button>
            </label>
          }
        </div>
      </section>

      <button class="btn-secondary w-full mb-2" (click)="editSchedule()">Editar mi horario laboral</button>
      <button class="btn-secondary w-full mb-2" (click)="goSettings()">Ajustes del hogar</button>
      @if (partnerName(); as pname) {
        <button class="btn-secondary w-full mb-2" (click)="openPartnerReset()">Resetear contraseña de {{ pname }}</button>
      }
      <button class="btn-outline w-full mb-2" (click)="logout()">Cerrar sesión</button>
      <button class="btn-danger-outline w-full" (click)="confirmLeave.set(true)">Salir del hogar</button>
    }

    <cg-bottom-sheet [open]="resetOpen()" (close)="resetOpen.set(false)">
      @if (resetStep() === 'edit') {
        <h3 class="font-medium text-lg mb-2">Resetear contraseña de {{ partnerName() }}</h3>
        <p class="text-sm text-gray-600 mb-3">
          Elige una contraseña nueva o pulsa "Generar". Después se la mandas por WhatsApp.
        </p>
        <div class="mb-3">
          <label class="label">Contraseña nueva</label>
          <input class="input" [value]="newPassword()" (input)="onPasswordInput($event)"
                 placeholder="Mínimo 8 caracteres" />
        </div>
        <button type="button" class="btn-ghost w-full text-sm mb-3" (click)="generateRandom()">
          Generar contraseña aleatoria
        </button>
        <div class="flex gap-2">
          <button type="button" class="btn-secondary flex-1" (click)="resetOpen.set(false)">Cancelar</button>
          <button type="button" class="btn-primary flex-1"
                  [disabled]="resetSaving() || newPassword().length < 8"
                  (click)="saveReset()">
            {{ resetSaving() ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      } @else {
        <h3 class="font-medium text-lg mb-2">¡Listo!</h3>
        <p class="text-sm text-gray-600 mb-3">
          Comparte esta contraseña con {{ partnerName() }}. Cuando la use, debería cambiarla.
        </p>
        <div class="card bg-gray-50 border-gray-200 mb-3 break-all font-mono text-sm">
          {{ newPassword() }}
        </div>
        <button type="button" class="btn-secondary w-full mb-2" (click)="copyPassword()">Copiar</button>
        <a class="btn-primary w-full text-center mb-2"
           [href]="whatsappLink()" target="_blank" rel="noopener">Enviar por WhatsApp</a>
        <button type="button" class="btn-ghost w-full text-sm" (click)="resetOpen.set(false)">Cerrar</button>
      }
    </cg-bottom-sheet>

    <cg-confirm-modal
      [open]="confirmLeave()"
      [title]="'¿Salir del hogar?'"
      [message]="'Perderás acceso a las tareas y al histórico. Esta acción no se puede deshacer.'"
      [confirmLabel]="'Salir del hogar'"
      [danger]="true"
      (confirm)="leaveHousehold()"
      (cancel)="confirmLeave.set(false)"
    />
  `
})
export class ProfileComponent implements OnInit {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private householdStore = inject(HouseholdStore);
  private router = inject(Router);
  private toast = inject(ToastService);
  private push = inject(PushService);

  readonly toggleKeys: ('proposal' | 'reassignment' | 'reminders')[] = ['proposal', 'reassignment', 'reminders'];

  readonly user = this.auth.currentUser;
  readonly household = this.householdStore.household;
  readonly confirmLeave = signal(false);
  readonly pushEnabled = signal(false);

  readonly resetOpen = signal(false);
  readonly resetStep = signal<'edit' | 'done'>('edit');
  readonly resetSaving = signal(false);
  readonly newPassword = signal<string>('');
  readonly partnerName = computed(() => this.householdStore.partner()?.name ?? '');
  readonly whatsappLink = computed(() => {
    const pname = this.partnerName();
    const pw = this.newPassword();
    const text = `${pname}, te he reseteado la contraseña de Casa García. Es: ${pw}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  });
  readonly prefs = signal<{ proposal: boolean; reassignment: boolean; reminders: boolean }>({
    proposal: true, reassignment: true, reminders: true
  });

  readonly joinedLabel = computed(() => {
    const m = this.householdStore.meAsMember();
    if (!m?.joined_at) return '';
    return `desde ${format(parseISO(m.joined_at), "MMM yyyy", { locale: es })}`;
  });

  async ngOnInit(): Promise<void> {
    const perm = this.push.permission();
    this.pushEnabled.set(perm === 'granted');
    try {
      const s = await this.api.getSettings();
      this.prefs.set({
        proposal: s.notify_proposal,
        reassignment: s.notify_reassignment,
        reminders: s.notify_reminders
      });
    } catch { /* opcional */ }
  }

  toggleLabel(key: 'proposal' | 'reassignment' | 'reminders'): string {
    return key === 'proposal' ? 'Propuesta semanal'
      : key === 'reassignment' ? 'Reasignaciones'
      : 'Recordatorios';
  }

  async togglePush(): Promise<void> {
    if (this.pushEnabled()) {
      await this.push.disable();
      this.pushEnabled.set(false);
      this.toast.info('Notificaciones desactivadas');
    } else {
      const ok = await this.push.enable();
      this.pushEnabled.set(ok);
    }
  }

  async togglePref(key: 'proposal' | 'reassignment' | 'reminders'): Promise<void> {
    const next = { ...this.prefs(), [key]: !this.prefs()[key] };
    this.prefs.set(next);
    try {
      await this.api.patchSettings({
        notify_proposal: next.proposal,
        notify_reassignment: next.reassignment,
        notify_reminders: next.reminders
      });
    } catch { /* revierte si quieres */ }
  }

  goSettings(): void { void this.router.navigateByUrl('/settings'); }
  editSchedule(): void { void this.router.navigate(['/onboarding/schedule'], { queryParams: { edit: '1' } }); }

  openPartnerReset(): void {
    this.resetStep.set('edit');
    this.newPassword.set('');
    this.resetOpen.set(true);
  }

  onPasswordInput(e: Event): void {
    this.newPassword.set((e.target as HTMLInputElement).value);
  }

  generateRandom(): void {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let out = '';
    const arr = new Uint32Array(12);
    crypto.getRandomValues(arr);
    for (const n of arr) out += chars[n % chars.length];
    this.newPassword.set(out);
  }

  async saveReset(): Promise<void> {
    if (this.resetSaving() || this.newPassword().length < 8) return;
    this.resetSaving.set(true);
    try {
      await this.api.partnerResetPassword(this.newPassword());
      this.resetStep.set('done');
    } catch {
      this.toast.error('No se pudo resetear la contraseña.');
    } finally {
      this.resetSaving.set(false);
    }
  }

  async copyPassword(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.newPassword());
      this.toast.success('Copiada');
    } catch {
      this.toast.info(this.newPassword());
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }

  async leaveHousehold(): Promise<void> {
    this.confirmLeave.set(false);
    try {
      await this.api.deleteMe();
      this.toast.info('Has salido del hogar');
      await this.auth.logout();
    } catch { /* toast por interceptor */ }
  }
}
