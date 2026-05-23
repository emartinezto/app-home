import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { HouseholdStore } from '@core/stores/household.store';
import { WeekStore } from '@core/stores/week.store';
import { Router } from '@angular/router';
import { LoadBarComponent } from '@shared/components/load-bar.component';
import { CategoryDotComponent } from '@shared/components/category-dot.component';
import { AvatarComponent } from '@shared/components/avatar.component';
import { SkeletonComponent } from '@shared/components/skeleton.component';
import { ToastService } from '@core/services/toast.service';
import { addWeeks, formatRange, isoWeekStart } from '@core/utils/date.util';

@Component({
  selector: 'cg-proposal',
  standalone: true,
  imports: [LoadBarComponent, CategoryDotComponent, AvatarComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-medium text-gray-900">Propuesta semanal</h1>
        <p class="text-sm text-gray-500">{{ rangeLabel() }}</p>
      </div>
      <div class="flex gap-1">
        <button class="text-sm text-primary px-2" (click)="changeWeek(-1)">←</button>
        <button class="text-sm text-primary px-2" (click)="changeWeek(1)">→</button>
      </div>
    </header>

    <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
      Revisa el reparto y confirma cuando estés conforme.
    </div>

    @if (loading()) {
      <cg-skeleton height="120px" />
    } @else if (!proposal()) {
      <div class="card text-center py-8">
        <p class="text-sm text-gray-500 mb-4">No hay propuesta para esta semana.</p>
        <button class="btn-primary" (click)="goAvailability()">Configurar disponibilidad</button>
      </div>
    } @else {
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="card">
          <div class="flex items-center gap-2 mb-2">
            <cg-avatar [name]="myName()" [color]="myColor()" [size]="28" />
            <span class="text-xs text-gray-500">Tú</span>
          </div>
          <p class="text-3xl font-medium" [style.color]="myColor()">{{ myPct() }}%</p>
        </div>
        <div class="card">
          <div class="flex items-center gap-2 mb-2">
            <cg-avatar [name]="partnerName()" [color]="partnerColor()" [size]="28" />
            <span class="text-xs text-gray-500">{{ partnerName() }}</span>
          </div>
          <p class="text-3xl font-medium" [style.color]="partnerColor()">{{ partnerPct() }}%</p>
        </div>
      </div>

      <div class="card mb-4">
        <cg-load-bar
          [leftValue]="myLoad()"
          [rightValue]="partnerLoad()"
          [rightLabel]="partnerName()"
          [leftColor]="myColor()"
          [rightColor]="partnerColor()"
          [showLabels]="false"
        />
        @if ((proposal()?.soft_violations_count ?? 0) > 0) {
          <p class="text-xs text-amber-700 mt-2">
            ⚠ {{ proposal()?.soft_violations_count }} conflictos blandos detectados
          </p>
        }
      </div>

      <div class="space-y-3 mb-6">
        @for (d of days(); track d.day_of_week) {
          <div class="card">
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium">{{ longDay(d.day_of_week) }}</span>
              <span class="text-xs text-gray-400">{{ d.assignments.length }} tareas</span>
            </div>
            <div class="space-y-1.5">
              @for (a of d.assignments; track a.id) {
                <div class="flex items-center gap-2 py-1">
                  <cg-avatar [name]="memberName(a.assigned_to)" [color]="memberColor(a.assigned_to)" [size]="22" />
                  <cg-category-dot [category]="a.task.category" />
                  <span class="text-sm flex-1">{{ a.task.name }}</span>
                  @if (a.soft_violation) { <span class="chip bg-amber-50 text-amber-700">⚠</span> }
                </div>
              }
              @if (d.assignments.length === 0) {
                <p class="text-xs text-gray-400 italic">Sin tareas</p>
              }
            </div>
          </div>
        }
      </div>

      <div class="flex items-center gap-3 mb-4">
        <span class="chip" [class.bg-green-50]="myConfirmed()" [class.text-green-700]="myConfirmed()"
              [class.bg-gray-100]="!myConfirmed()" [class.text-gray-600]="!myConfirmed()">
          Tú: {{ myConfirmed() ? 'Confirmada' : 'Pendiente' }}
        </span>
        <span class="chip" [class.bg-green-50]="partnerConfirmed()" [class.text-green-700]="partnerConfirmed()"
              [class.bg-gray-100]="!partnerConfirmed()" [class.text-gray-600]="!partnerConfirmed()">
          {{ partnerName() }}: {{ partnerConfirmed() ? 'Confirmada' : 'Pendiente' }}
        </span>
      </div>

      <button class="btn-primary w-full" (click)="confirm()" [disabled]="confirming() || myConfirmed()">
        {{ confirming() ? 'Confirmando…' : myConfirmed() ? '✓ Confirmada' : 'Confirmar mi semana' }}
      </button>
    }
  `
})
export class ProposalComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private household = inject(HouseholdStore);
  private weekStore = inject(WeekStore);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly confirming = signal(false);

  readonly loading = computed(() => this.weekStore.loading());
  readonly proposal = computed(() => this.weekStore.proposal());
  readonly days = computed(() => this.weekStore.days());
  readonly weekStart = computed(() => this.weekStore.weekStart());
  readonly rangeLabel = computed(() => formatRange(this.weekStart()));

  readonly myName = computed(() => this.auth.currentUser()?.name ?? '');
  readonly myColor = computed(() => this.auth.currentUser()?.avatar_color ?? '#4A6FA5');
  readonly partnerName = computed(() => this.household.partner()?.name ?? 'Pareja');
  readonly partnerColor = computed(() => this.household.partner()?.avatar_color ?? '#1D9E75');

  readonly myLoad = computed(() => {
    const p = this.proposal(), me = this.auth.currentUser();
    if (!p || !me) return 0;
    return p.user1_id === me.id ? p.user1_load_score : p.user2_load_score;
  });
  readonly partnerLoad = computed(() => {
    const p = this.proposal(), me = this.auth.currentUser();
    if (!p || !me) return 0;
    return p.user1_id === me.id ? p.user2_load_score : p.user1_load_score;
  });
  readonly total = computed(() => Math.max(this.myLoad() + this.partnerLoad(), 0.0001));
  readonly myPct = computed(() => Math.round((this.myLoad() / this.total()) * 100));
  readonly partnerPct = computed(() => 100 - this.myPct());

  readonly myConfirmed = computed(() => {
    const p = this.proposal(), me = this.auth.currentUser();
    if (!p || !me) return false;
    return p.user1_id === me.id ? !!p.user1_confirmed_at : !!p.user2_confirmed_at;
  });
  readonly partnerConfirmed = computed(() => {
    const p = this.proposal(), me = this.auth.currentUser();
    if (!p || !me) return false;
    return p.user1_id === me.id ? !!p.user2_confirmed_at : !!p.user1_confirmed_at;
  });

  async ngOnInit(): Promise<void> {
    await this.weekStore.load(this.weekStart() ?? isoWeekStart(new Date()));
  }

  longDay(dow: number): string {
    return ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'][dow - 1] ?? '';
  }
  memberName(id: number): string { return this.household.members().find(m => m.id === id)?.name ?? '?'; }
  memberColor(id: number): string { return this.household.members().find(m => m.id === id)?.avatar_color ?? '#9CA3AF'; }

  goAvailability(): void { void this.router.navigateByUrl('/availability'); }

  async changeWeek(delta: number): Promise<void> { await this.weekStore.load(addWeeks(this.weekStart(), delta), true); }

  async confirm(): Promise<void> {
    if (this.confirming() || this.myConfirmed()) return;
    this.confirming.set(true);
    try {
      const res = await this.api.confirmProposal(this.weekStart());
      this.weekStore.setProposal(res.proposal);
      this.toast.success(res.both_confirmed ? '¡Semana lista!' : 'Confirmada. Esperando a tu pareja.');
      if (res.both_confirmed) void this.router.navigateByUrl('/');
    } finally {
      this.confirming.set(false);
    }
  }
}
