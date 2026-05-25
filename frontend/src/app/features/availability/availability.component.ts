import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { HouseholdStore } from '@core/stores/household.store';
import { AvailabilityWeek, DayKey } from '@core/types/api.types';
import { addWeeks, dayKeysWeekdays, dayShort, formatRange, isoWeekStart } from '@core/utils/date.util';
import { ToastService } from '@core/services/toast.service';
import { Router } from '@angular/router';
import { SocketService } from '@core/services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'cg-availability',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-medium text-gray-900">Disponibilidad</h1>
        <p class="text-sm text-gray-500">Semana del {{ rangeLabel() }}</p>
      </div>
      <div class="flex gap-1">
        <button class="text-sm text-primary px-2" (click)="changeWeek(-1)">←</button>
        <button class="text-sm text-primary px-2" (click)="changeWeek(1)">→</button>
      </div>
    </header>

    <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
      <p class="font-medium mb-1">Disponibilidad semanal</p>
      <p>Marca los días que esta semana irás a la oficina. Tendrás que repetirlo cada semana antes de generar el reparto de tareas.</p>
    </div>

    @if (loading()) {
      <p class="text-sm text-gray-500 text-center py-8">Cargando…</p>
    } @else {
      <!-- TU SECCIÓN: editable, marco grueso con tu color -->
      <section class="card mb-4 border-2" [style.border-color]="myColor()">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full" [style.background-color]="myColor()"></span>
            <h2 class="font-medium">Tus días — {{ userName() }}</h2>
          </div>
          @if (myConfirmed()) {
            <span class="chip bg-green-50 text-green-700">✓ Enviada</span>
          } @else {
            <span class="chip bg-amber-50 text-amber-700">⏳ Te toca enviar</span>
          }
        </div>
        @if (prefilled() && !myConfirmed()) {
          <p class="text-xs text-gray-500 mb-2">Pre-rellenado con tu horario laboral. Ajusta lo que cambie esta semana.</p>
        }
        <div class="flex gap-2 flex-wrap mb-2">
          @for (d of weekdays; track d) {
            <button
              type="button"
              class="px-3 py-1.5 rounded-full text-xs font-medium transition border"
              [style.background-color]="myOfficeDays().has(d) ? myColor() : 'transparent'"
              [style.border-color]="myOfficeDays().has(d) ? myColor() : '#D1D5DB'"
              [style.color]="myOfficeDays().has(d) ? 'white' : '#374151'"
              [disabled]="myConfirmed()"
              (click)="toggleMyDay(d)">
              {{ shortLabel(d) }}
            </button>
          }
        </div>
        <p class="text-xs text-gray-500">{{ myOfficeDays().size }} días en oficina · {{ myRemoteHours() }}h teletrabajo aprox.</p>
      </section>

      <!-- PAREJA: read-only, fondo grisáceo, chips con su color y tachados si no van -->
      <section class="card mb-4 bg-gray-50 border-gray-200">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full" [style.background-color]="partnerColor()"></span>
            <h2 class="font-medium text-gray-800">Días de {{ partnerName() }}</h2>
          </div>
          @if (partnerConfirmed()) {
            <span class="chip bg-green-50 text-green-700">✓ Enviada</span>
          } @else {
            <span class="chip bg-gray-100 text-gray-500">⏳ Aún no envía</span>
          }
        </div>
        <p class="text-xs text-gray-500 mb-2 italic">Solo informativo — esto lo edita {{ partnerName() }} desde su móvil.</p>
        @if (partnerConfirmed()) {
          <div class="flex gap-2 flex-wrap">
            @for (d of weekdays; track d) {
              <span
                class="px-3 py-1.5 rounded-full text-xs font-medium border"
                [style.background-color]="partnerOfficeDays().has(d) ? partnerColor() : 'transparent'"
                [style.border-color]="partnerOfficeDays().has(d) ? partnerColor() : '#E5E7EB'"
                [style.color]="partnerOfficeDays().has(d) ? 'white' : '#9CA3AF'">
                {{ shortLabel(d) }}
              </span>
            }
          </div>
        } @else {
          <p class="text-sm text-gray-500">Aún no ha enviado su disponibilidad.</p>
        }
      </section>

      <p class="text-center text-xs text-gray-500 mb-4">
        Generaremos la propuesta cuando ambos hayáis enviado.
      </p>

      <button class="btn-primary w-full" (click)="save()" [disabled]="saving() || myConfirmed()">
        {{ saving() ? 'Enviando…' : myConfirmed() ? '✓ Ya has enviado la tuya' : 'Enviar mi disponibilidad' }}
      </button>

      @if (bothConfirmed() && !proposalGenerating()) {
        <button class="btn-secondary w-full mt-2" (click)="generate()">
          Generar propuesta ahora
        </button>
      }
      @if (proposalGenerating()) {
        <p class="text-center text-sm text-gray-500 mt-3">Generando propuesta…</p>
      }
    }
  `
})
export class AvailabilityComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private household = inject(HouseholdStore);
  private toast = inject(ToastService);
  private router = inject(Router);
  private socket = inject(SocketService);

  private subs: Subscription[] = [];

  readonly weekdays: DayKey[] = dayKeysWeekdays();
  readonly weekStart = signal<string>(isoWeekStart(new Date()));
  readonly availability = signal<AvailabilityWeek | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly proposalGenerating = signal(false);

  readonly myOfficeDays = signal<Set<DayKey>>(new Set());
  readonly prefilled = signal(false);

  readonly rangeLabel = computed(() => formatRange(this.weekStart()));
  readonly userName = computed(() => this.auth.currentUser()?.name ?? '');
  readonly myColor = computed(() => this.auth.currentUser()?.avatar_color ?? '#4A6FA5');
  readonly partnerName = computed(() => this.household.partner()?.name ?? 'Pareja');
  readonly partnerColor = computed(() => this.household.partner()?.avatar_color ?? '#9CA3AF');

  readonly myEntry = computed(() => {
    const me = this.auth.currentUser();
    return this.availability()?.entries.find(e => e.user_id === me?.id) ?? null;
  });
  readonly partnerEntry = computed(() => {
    const me = this.auth.currentUser();
    return this.availability()?.entries.find(e => e.user_id !== me?.id) ?? null;
  });
  readonly myConfirmed = computed(() => this.myEntry()?.confirmed ?? false);
  readonly partnerConfirmed = computed(() => this.partnerEntry()?.confirmed ?? false);
  readonly bothConfirmed = computed(() => this.myConfirmed() && this.partnerConfirmed());
  readonly partnerOfficeDays = computed<Set<DayKey>>(() => new Set((this.partnerEntry()?.office_days ?? []) as DayKey[]));

  readonly myRemoteHours = computed(() => (5 - this.myOfficeDays().size) * 8);

  async ngOnInit(): Promise<void> {
    await this.load();

    this.subs.push(
      this.socket.availabilitySet$.subscribe(() => this.load()),
      this.socket.availabilityConfirmed$.subscribe(() => this.load()),
      this.socket.proposalReady$.subscribe(() => {
        this.proposalGenerating.set(false);
        this.toast.success('Propuesta lista');
        void this.router.navigateByUrl('/proposal');
      })
    );
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const av = await this.api.getAvailability(this.weekStart());
      this.availability.set(av);
      const mine = this.myEntry();
      if (mine) {
        this.myOfficeDays.set(new Set((mine.office_days ?? []) as DayKey[]));
        this.prefilled.set(false);
      } else {
        // Sin entrada para esta semana → pre-rellenamos con el horario laboral
        // (los días que el usuario marcó como NO teletrabajo en el onboarding).
        const schedule = this.auth.currentUser()?.work_schedule ?? null;
        const defaults: DayKey[] = [];
        for (const d of this.weekdays) {
          const day = schedule?.[d];
          if (day && day.location === 'office') defaults.push(d);
        }
        this.myOfficeDays.set(new Set(defaults));
        this.prefilled.set(defaults.length > 0);
      }
    } finally {
      this.loading.set(false);
    }
  }

  shortLabel(d: DayKey): string { return dayShort(d); }

  toggleMyDay(d: DayKey): void {
    if (this.myConfirmed()) return;
    const next = new Set(this.myOfficeDays());
    if (next.has(d)) next.delete(d); else next.add(d);
    this.myOfficeDays.set(next);
  }

  async changeWeek(delta: number): Promise<void> {
    this.weekStart.set(addWeeks(this.weekStart(), delta));
    await this.load();
  }

  async save(): Promise<void> {
    if (this.saving() || this.myConfirmed()) return;
    this.saving.set(true);
    try {
      await this.api.setMyAvailability(this.weekStart(), {
        office_days: Array.from(this.myOfficeDays())
      });
      await this.api.confirmMyAvailability(this.weekStart());
      this.toast.success('Disponibilidad enviada');
      await this.load();
      if (this.bothConfirmed()) {
        this.proposalGenerating.set(true);
        try {
          await this.api.generateProposal(this.weekStart());
        } catch {
          this.proposalGenerating.set(false);
        }
      }
    } finally {
      this.saving.set(false);
    }
  }

  async generate(): Promise<void> {
    if (this.proposalGenerating()) return;
    this.proposalGenerating.set(true);
    try {
      await this.api.generateProposal(this.weekStart());
    } catch {
      this.proposalGenerating.set(false);
    }
  }
}
