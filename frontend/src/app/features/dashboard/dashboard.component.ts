import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { HouseholdStore } from '@core/stores/household.store';
import { WeekStore } from '@core/stores/week.store';
import { isoWeekStart } from '@core/utils/date.util';
import { Assignment, AvailabilityWeek, DayWithAssignments } from '@core/types/api.types';
import { TaskCardComponent } from '@shared/components/task-card.component';
import { LoadBarComponent } from '@shared/components/load-bar.component';
import { TaskSheetComponent } from '@shared/components/task-sheet.component';
import { SkeletonComponent } from '@shared/components/skeleton.component';
import { EmptyStateComponent } from '@shared/components/empty-state.component';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'cg-dashboard',
  standalone: true,
  imports: [TaskCardComponent, LoadBarComponent, TaskSheetComponent, SkeletonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-4">
      <h1 class="text-2xl font-medium text-gray-900">{{ greeting() }}, {{ userName() }} 👋</h1>
      <p class="text-sm text-gray-500 capitalize">{{ todayLabel() }}</p>
    </header>

    @if (loading()) {
      <cg-skeleton height="56px" />
      <div class="space-y-2 mt-4">
        <cg-skeleton height="64px" />
        <cg-skeleton height="64px" />
        <cg-skeleton height="64px" />
      </div>
    } @else if (!hasProposal()) {
      @if (!hasPartner()) {
        <cg-empty-state
          icon="👥"
          title="Invita a tu pareja"
          description="Necesitas que tu pareja se una para generar el reparto de la semana."
        />
        <button class="btn-primary w-full" (click)="goInvite()">Compartir invitación</button>
      } @else if (myConfirmed() && !partnerConfirmed()) {
        <cg-empty-state
          icon="⏳"
          title="Esperando a {{ partnerName() }}"
          description="Ya enviaste tu disponibilidad. En cuanto tu pareja confirme la suya, generaremos el reparto."
        />
      } @else if (!myConfirmed()) {
        <cg-empty-state
          icon="📅"
          title="Aún no hay propuesta para esta semana"
          description="Configura tu disponibilidad para generarla."
        />
        <button class="btn-primary w-full" (click)="goAvailability()">Ir a disponibilidad</button>
      } @else {
        <cg-empty-state
          icon="✨"
          title="Generando propuesta…"
          description="En unos segundos verás el reparto."
        />
      }
    } @else {
      <div class="card mb-4">
        <p class="text-xs text-gray-500 mb-1">Balance de la semana</p>
        <cg-load-bar
          [leftValue]="myLoad()"
          [rightValue]="partnerLoad()"
          [leftLabel]="'Tú'"
          [rightLabel]="partnerName()"
          [leftColor]="myColor()"
          [rightColor]="partnerColor()"
        />
      </div>

      @if (morning().length > 0) {
        <h2 class="text-xs uppercase tracking-wide text-gray-500 mb-2 mt-4">Mañana</h2>
        <div class="space-y-2">
          @for (a of morning(); track a.id) {
            <cg-task-card [assignment]="a" (toggle)="toggle(a)" (open)="select(a)" />
          }
        </div>
      }
      @if (afternoon().length > 0) {
        <h2 class="text-xs uppercase tracking-wide text-gray-500 mb-2 mt-6">Tarde</h2>
        <div class="space-y-2">
          @for (a of afternoon(); track a.id) {
            <cg-task-card [assignment]="a" (toggle)="toggle(a)" (open)="select(a)" />
          }
        </div>
      }
      @if (todayAssignments().length === 0) {
        <cg-empty-state icon="🎉" title="Hoy estás libre" description="No tienes tareas asignadas." />
      }

      <div class="flex gap-2 overflow-x-auto scrollbar-none mt-6 -mx-1 px-1">
        @for (d of days(); track d.day_of_week) {
          <button class="flex-1 min-w-[44px] flex flex-col items-center gap-1 py-2 rounded-xl border transition"
                  [class.bg-primary]="d.day_of_week === todayDow()"
                  [class.text-white]="d.day_of_week === todayDow()"
                  [class.border-primary]="d.day_of_week === todayDow()"
                  [class.border-gray-200]="d.day_of_week !== todayDow()">
            <span class="text-xs font-medium">{{ shortDay(d.day_of_week) }}</span>
            <span class="text-[10px]" [class.opacity-80]="d.day_of_week === todayDow()" [class.text-gray-500]="d.day_of_week !== todayDow()">
              {{ countDone(d) }}/{{ d.assignments.length }}
            </span>
          </button>
        }
      </div>

      <button class="btn-primary w-full mt-6" (click)="reassignFirst()" [disabled]="todayAssignments().length === 0">
        ↔ Reasignar tarea
      </button>
    }

    <cg-task-sheet
      [open]="sheetOpen()"
      [assignment]="selected()"
      (close)="sheetOpen.set(false)"
      (markDone)="toggle($event)"
      (markUndone)="toggle($event)"
    />
  `
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private household = inject(HouseholdStore);
  private weekStore = inject(WeekStore);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly loading = computed(() => this.weekStore.loading());
  readonly hasProposal = computed(() => !!this.weekStore.proposal());
  readonly proposal = computed(() => this.weekStore.proposal());
  readonly days = computed(() => this.weekStore.days());

  readonly availability = signal<AvailabilityWeek | null>(null);
  readonly hasPartner = computed(() => !!this.household.partner());
  readonly myConfirmed = computed(() => {
    const me = this.auth.currentUser();
    return !!this.availability()?.entries.find(e => e.user_id === me?.id)?.confirmed;
  });
  readonly partnerConfirmed = computed(() => {
    const me = this.auth.currentUser();
    return !!this.availability()?.entries.find(e => e.user_id !== me?.id)?.confirmed;
  });

  readonly sheetOpen = signal(false);
  readonly selected = signal<Assignment | null>(null);

  readonly todayIso = signal<string>(format(new Date(), 'yyyy-MM-dd'));
  readonly todayDow = computed<number>(() => {
    const d = new Date();
    const day = d.getDay();
    return day === 0 ? 7 : day;
  });

  readonly userName = computed(() => this.auth.currentUser()?.name ?? '');
  readonly partnerName = computed(() => this.household.partner()?.name ?? 'Pareja');

  readonly myColor = computed(() => this.auth.currentUser()?.avatar_color ?? '#4A6FA5');
  readonly partnerColor = computed(() => this.household.partner()?.avatar_color ?? '#1D9E75');

  readonly myLoad = computed(() => {
    const p = this.proposal();
    const me = this.auth.currentUser();
    if (!p || !me) return 0;
    return p.user1_id === me.id ? p.user1_load_score : p.user2_load_score;
  });
  readonly partnerLoad = computed(() => {
    const p = this.proposal();
    const me = this.auth.currentUser();
    if (!p || !me) return 0;
    return p.user1_id === me.id ? p.user2_load_score : p.user1_load_score;
  });

  readonly todayAssignments = computed<Assignment[]>(() => {
    const me = this.auth.currentUser();
    if (!me) return [];
    const today = this.days().find(d => d.date === this.todayIso());
    return (today?.assignments ?? []).filter(a => a.assigned_to === me.id);
  });

  readonly morning = computed(() =>
    this.todayAssignments().filter(a => a.time_slot === 'manana' || a.time_slot === 'flexible')
  );
  readonly afternoon = computed(() =>
    this.todayAssignments().filter(a => a.time_slot === 'tarde')
  );

  async ngOnInit(): Promise<void> {
    const ws = isoWeekStart(new Date());
    await Promise.all([
      this.weekStore.load(ws),
      this.household.load(),
      this.loadAvailability(ws),
    ]);
  }

  private async loadAvailability(weekStart: string): Promise<void> {
    try {
      this.availability.set(await this.api.getAvailability(weekStart));
    } catch {
      this.availability.set(null);
    }
  }

  greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }

  todayLabel(): string {
    return format(parseISO(this.todayIso()), "EEEE d 'de' MMMM", { locale: es });
  }

  shortDay(dow: number): string {
    return ['L', 'M', 'X', 'J', 'V', 'S', 'D'][dow - 1] ?? '';
  }

  countDone(d: DayWithAssignments): number {
    return d.assignments.filter(a => a.is_done).length;
  }

  select(a: Assignment): void {
    this.selected.set(a);
    this.sheetOpen.set(true);
  }

  async toggle(a: Assignment): Promise<void> {
    const prev = a.is_done;
    this.weekStore.patchAssignment(a.id, {
      is_done: !prev,
      done_at: !prev ? new Date().toISOString() : null,
      done_by: !prev ? (this.auth.currentUser()?.id ?? null) : null
    });
    try {
      if (prev) await this.api.markUndone(a.id);
      else await this.api.markDone(a.id);
    } catch {
      this.weekStore.patchAssignment(a.id, {
        is_done: prev,
        done_at: prev ? a.done_at : null,
        done_by: prev ? a.done_by : null
      });
    }
    this.sheetOpen.set(false);
  }

  goAvailability(): void { void this.router.navigateByUrl('/availability'); }
  goInvite(): void { void this.router.navigate(['/onboarding/invite'], { queryParams: { standalone: '1' } }); }

  reassignFirst(): void {
    const first = this.todayAssignments().find(a => !a.is_done);
    if (!first) {
      this.toast.info('No hay tareas pendientes hoy.');
      return;
    }
    void this.router.navigate(['/reassign', first.id]);
  }
}
