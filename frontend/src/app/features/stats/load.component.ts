import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { HouseholdStore } from '@core/stores/household.store';
import { Category, LoadStats } from '@core/types/api.types';
import { LoadBarComponent } from '@shared/components/load-bar.component';
import { SkeletonComponent } from '@shared/components/skeleton.component';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const CATEGORY_LABEL: Record<Category, string> = { hogar: 'Hogar', cuidados: 'Cuidados', perro: 'Perro' };
const CATEGORY_COLOR: Record<Category, string> = { hogar: '#378ADD', cuidados: '#1D9E75', perro: '#BA7517' };

@Component({
  selector: 'cg-load',
  standalone: true,
  imports: [LoadBarComponent, SkeletonComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-4">
      <h1 class="text-2xl font-medium text-gray-900">Carga semanal</h1>
      <p class="text-sm text-gray-500">Reparto entre tú y {{ partnerName() }}</p>
    </header>

    @if (loading()) {
      <cg-skeleton height="120px" />
      <div class="mt-3 space-y-2">
        <cg-skeleton height="48px" />
        <cg-skeleton height="48px" />
        <cg-skeleton height="48px" />
      </div>
    } @else if (!stats() || stats()!.weeks.length === 0) {
      <p class="text-sm text-gray-500 text-center py-8">Aún no hay datos suficientes.</p>
    } @else {
      <div class="card mb-4">
        <div class="flex items-end justify-between mb-3">
          <div>
            <p class="text-xs text-gray-500">Tú</p>
            <p class="text-3xl font-medium" [style.color]="myColor()">{{ myPct() }}%</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-500">{{ partnerName() }}</p>
            <p class="text-3xl font-medium" [style.color]="partnerColor()">{{ partnerPct() }}%</p>
          </div>
        </div>
        <cg-load-bar
          [leftValue]="myCurrent()"
          [rightValue]="partnerCurrent()"
          [rightLabel]="partnerName()"
          [leftColor]="myColor()"
          [rightColor]="partnerColor()"
          [showLabels]="false"
        />
      </div>

      @if ((stats()?.by_category ?? []).length > 0) {
        <section class="card mb-4">
          <h2 class="text-xs uppercase tracking-wide text-gray-500 mb-3">Por categoría</h2>
          <div class="space-y-3">
            @for (c of stats()?.by_category ?? []; track c.category) {
              <div>
                <div class="flex items-center justify-between text-xs mb-1">
                  <span class="font-medium" [style.color]="catColor(c.category)">{{ catLabel(c.category) }}</span>
                  <span class="text-gray-500">{{ c.user1_load + c.user2_load | number:'1.0-1' }} pts</span>
                </div>
                <cg-load-bar
                  [leftValue]="leftFor(c)"
                  [rightValue]="rightFor(c)"
                  [showLabels]="false"
                  [leftColor]="myColor()"
                  [rightColor]="partnerColor()"
                />
              </div>
            }
          </div>
        </section>
      }

      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="card text-center">
          <p class="text-xs text-gray-500 mb-1">Hechas tú</p>
          <p class="text-2xl font-medium" [style.color]="myColor()">{{ myDoneTotal() }}</p>
        </div>
        <div class="card text-center">
          <p class="text-xs text-gray-500 mb-1">Hechas {{ partnerName() }}</p>
          <p class="text-2xl font-medium" [style.color]="partnerColor()">{{ partnerDoneTotal() }}</p>
        </div>
      </div>

      <section class="card">
        <h2 class="text-xs uppercase tracking-wide text-gray-500 mb-3">Histórico (4 semanas)</h2>
        <div class="space-y-3">
          @for (w of stats()!.weeks; track w.week_start; let i = $index) {
            <div>
              <p class="text-xs text-gray-500 mb-1">{{ weekLabel(w.week_start, i) }}</p>
              <div class="flex gap-1 items-end h-12">
                <div class="flex-1 rounded-t-md" [style.background-color]="myColor()"
                     [style.height.%]="histPct(myFor(w), maxLoad())">
                </div>
                <div class="flex-1 rounded-t-md" [style.background-color]="partnerColor()"
                     [style.height.%]="histPct(partnerFor(w), maxLoad())">
                </div>
              </div>
              <div class="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>{{ myFor(w) | number:'1.0-1' }}</span>
                <span>{{ partnerFor(w) | number:'1.0-1' }}</span>
              </div>
            </div>
          }
        </div>
      </section>
    }
  `
})
export class LoadComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private household = inject(HouseholdStore);

  readonly loading = signal(true);
  readonly stats = signal<LoadStats | null>(null);

  readonly myColor = computed(() => this.auth.currentUser()?.avatar_color ?? '#4A6FA5');
  readonly partnerColor = computed(() => this.household.partner()?.avatar_color ?? '#1D9E75');
  readonly partnerName = computed(() => this.household.partner()?.name ?? 'Pareja');

  readonly current = computed(() => {
    const w = this.stats()?.weeks ?? [];
    return w[w.length - 1] ?? null;
  });
  readonly myCurrent = computed(() => {
    const c = this.current(), me = this.auth.currentUser();
    if (!c || !me) return 0;
    return c.user1_id === me.id ? c.user1_load : c.user2_load;
  });
  readonly partnerCurrent = computed(() => {
    const c = this.current(), me = this.auth.currentUser();
    if (!c || !me) return 0;
    return c.user1_id === me.id ? c.user2_load : c.user1_load;
  });
  readonly total = computed(() => Math.max(this.myCurrent() + this.partnerCurrent(), 0.0001));
  readonly myPct = computed(() => Math.round((this.myCurrent() / this.total()) * 100));
  readonly partnerPct = computed(() => 100 - this.myPct());

  readonly myDoneTotal = computed(() => {
    const me = this.auth.currentUser();
    if (!me) return 0;
    return (this.stats()?.weeks ?? []).reduce((acc, w) => acc + (w.user1_id === me.id ? w.user1_done : w.user2_done), 0);
  });
  readonly partnerDoneTotal = computed(() => {
    const me = this.auth.currentUser();
    if (!me) return 0;
    return (this.stats()?.weeks ?? []).reduce((acc, w) => acc + (w.user1_id === me.id ? w.user2_done : w.user1_done), 0);
  });

  readonly maxLoad = computed(() => {
    const w = this.stats()?.weeks ?? [];
    return w.reduce((m, x) => Math.max(m, x.user1_load, x.user2_load), 1);
  });

  async ngOnInit(): Promise<void> {
    try {
      this.stats.set(await this.api.getLoadStats(4));
    } finally {
      this.loading.set(false);
    }
  }

  catLabel(c: Category): string { return CATEGORY_LABEL[c]; }
  catColor(c: Category): string { return CATEGORY_COLOR[c]; }

  myFor(w: LoadStats['weeks'][number]): number {
    const me = this.auth.currentUser();
    if (!me) return 0;
    return w.user1_id === me.id ? w.user1_load : w.user2_load;
  }
  partnerFor(w: LoadStats['weeks'][number]): number {
    const me = this.auth.currentUser();
    if (!me) return 0;
    return w.user1_id === me.id ? w.user2_load : w.user1_load;
  }
  leftFor(c: { user1_load: number; user2_load: number }): number {
    const cur = this.current(), me = this.auth.currentUser();
    if (!cur || !me) return c.user1_load;
    return cur.user1_id === me.id ? c.user1_load : c.user2_load;
  }
  rightFor(c: { user1_load: number; user2_load: number }): number {
    const cur = this.current(), me = this.auth.currentUser();
    if (!cur || !me) return c.user2_load;
    return cur.user1_id === me.id ? c.user2_load : c.user1_load;
  }

  histPct(v: number, max: number): number {
    if (max <= 0) return 0;
    return Math.max(6, Math.round((v / max) * 100));
  }

  weekLabel(weekStart: string, index: number): string {
    const last = (this.stats()?.weeks.length ?? 1) - 1;
    if (index === last) return 'Esta semana';
    const back = last - index;
    const date = parseISO(weekStart);
    return `S-${back} · ${format(date, "d MMM", { locale: es })}`;
  }
}
