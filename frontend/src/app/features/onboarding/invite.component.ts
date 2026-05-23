import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HouseholdStore } from '@core/stores/household.store';
import { ProgressBarComponent } from '@shared/components/progress-bar.component';
import { SocketService } from '@core/services/socket.service';
import { ToastService } from '@core/services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'cg-onboarding-invite',
  standalone: true,
  imports: [ProgressBarComponent, SlicePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white flex flex-col safe-top safe-bottom">
      <div class="container-page px-6 pt-6 pb-12 flex-1 flex flex-col">
        @if (!standalone()) {
          <cg-progress-bar [value]="40" />
          <p class="text-xs text-gray-500 mt-2">Paso 2 de 5</p>
        }

        <div class="flex-1 flex flex-col justify-center">
          <div class="text-center mb-8">
            <h1 class="text-2xl font-medium text-gray-900">Invita a tu pareja</h1>
            <p class="text-sm text-gray-500 mt-2">Comparte este código para que se una al hogar</p>
          </div>

          @if (inviteCode(); as code) {
            <div class="card text-center py-8 mb-4">
              <p class="text-xs text-gray-500 mb-3 uppercase tracking-wide">Código de invitación</p>
              <p class="text-4xl font-medium text-primary tracking-[0.4em]">
                {{ code | slice:0:3 }} {{ code | slice:3:6 }}
              </p>
            </div>
          } @else {
            <div class="card text-center py-8 mb-4">
              <p class="text-sm text-gray-500">Cargando código…</p>
            </div>
          }

          @if (partnerJoined()) {
            <div class="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-center">
              <p class="text-sm text-green-800 font-medium">✓ {{ partnerName() }} se ha unido</p>
            </div>
          } @else {
            <p class="text-center text-sm text-gray-500 mb-4">
              Esperando a que tu pareja se una…
            </p>
          }

          <div class="space-y-2">
            <button class="btn-secondary w-full" (click)="share()">Compartir enlace</button>
            @if (standalone()) {
              <button class="btn-ghost w-full text-sm" (click)="back()">Volver</button>
            } @else if (partnerJoined()) {
              <button class="btn-primary w-full" (click)="next()">Siguiente</button>
            } @else {
              <button class="btn-ghost w-full text-sm" (click)="next()">Continuar sin esperar</button>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class OnboardingInviteComponent implements OnInit, OnDestroy {
  private household = inject(HouseholdStore);
  private socket = inject(SocketService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly standalone = computed(() => this.route.snapshot.queryParamMap.get('standalone') === '1');

  private subs: Subscription[] = [];

  readonly inviteCode = signal<string | null>(null);
  readonly partnerJoined = signal(false);
  readonly partnerName = signal<string>('');

  async ngOnInit(): Promise<void> {
    await this.household.load();
    const h = this.household.household();
    if (h?.invite_code) this.inviteCode.set(h.invite_code);
    if ((h?.members.length ?? 0) >= 2) this.partnerJoined.set(true);

    this.subs.push(
      this.socket.memberJoined$.subscribe(e => {
        this.partnerJoined.set(true);
        this.partnerName.set(e.name);
        this.toast.success(`${e.name} se ha unido`);
      })
    );
  }

  async share(): Promise<void> {
    const code = this.inviteCode();
    if (!code) return;
    const url = `${window.location.origin}/join?code=${encodeURIComponent(code)}`;
    const text = `Únete a mi hogar en Casa García: ${url}`;
    const data: ShareData = { title: 'Casa García', text, url };

    const canUseShare =
      typeof navigator.share === 'function' &&
      (typeof navigator.canShare !== 'function' || navigator.canShare(data));

    if (canUseShare) {
      try {
        await navigator.share(data);
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      this.toast.success('Enlace copiado al portapapeles');
    } catch {
      this.toast.info(url);
    }
  }

  next(): void { void this.router.navigateByUrl('/onboarding/schedule'); }
  back(): void { void this.router.navigateByUrl('/'); }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}
