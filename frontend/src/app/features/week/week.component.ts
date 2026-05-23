import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { HouseholdStore } from '@core/stores/household.store';
import { WeekStore } from '@core/stores/week.store';
import { Assignment, DayWithAssignments } from '@core/types/api.types';
import { addWeeks, formatRange } from '@core/utils/date.util';
import { LoadBarComponent } from '@shared/components/load-bar.component';
import { CategoryDotComponent } from '@shared/components/category-dot.component';
import { AvatarComponent } from '@shared/components/avatar.component';
import { SkeletonComponent } from '@shared/components/skeleton.component';
import { TaskSheetComponent } from '@shared/components/task-sheet.component';

@Component({
  selector: 'cg-week',
  standalone: true,
  imports: [LoadBarComponent, CategoryDotComponent, AvatarComponent, SkeletonComponent, TaskSheetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-medium text-gray-900">Semana</h1>
        <p class="text-sm text-gray-500">{{ rangeLabel() }}</p>
      </div>
      <div class="flex items-center gap-1">
        <button class="p-2 rounded-full hover:bg-gray-100" (click)="prevWeek()" aria-label="Semana anterior">
          <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.7 14.7a1 1 0 01-1.4 0L6.6 10l4.7-4.7a1 1 0 011.4 1.4L9.4 10l3.3 3.3a1 1 0 010 1.4z" clip-rule="evenodd"/></svg>
        </button>
        <button class="p-2 rounded-full hover:bg-gray-100" (click)="nextWeek()" aria-label="Semana siguiente">
          <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.3 5.3a1 1 0 011.4 0L13.4 10l-4.7 4.7a1 1 0 01-1.4-1.4L10.6 10 7.3 6.7a1 1 0 010-1.4z" clip-rule="evenodd"/></svg>
        </button>
      </div>
    </header>

    @if (proposal()) {
      <div class="card mb-4">
        <cg-load-bar
          [leftValue]="myLoad()"
          [rightValue]="partnerLoad()"
          [rightLabel]="partnerName()"
          [leftColor]="myColor()"
          [rightColor]="partnerColor()"
        />
      </div>
    }

    <div class="flex bg-gray-100 rounded-xl p-1 mb-4">
      <button class="flex-1 py-2 rounded-lg text-sm font-medium transition"
              [class.bg-white]="view() === 'mine'" [class.shadow-card]="view() === 'mine'"
              [class.text-gray-500]="view() !== 'mine'"
              (click)="setView('mine')">Mis tareas</button>
      <button class="flex-1 py-2 rounded-lg text-sm font-medium transition"
              [class.bg-white]="view() === 'all'" [class.shadow-card]="view() === 'all'"
              [class.text-gray-500]="view() !== 'all'"
              (click)="setView('all')">Todas</button>
    </div>

    @if (view() === 'all') {
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-800">
        Toca cualquier tarea para ver detalles
      </div>
    }

    @if (loading()) {
      <div class="space-y-3">
        <cg-skeleton height="120px" />
        <cg-skeleton height="120px" />
        <cg-skeleton height="120px" />
      </div>
    } @else {
      <div class="space-y-3">
        @for (d of days(); track d.day_of_week) {
          <div class="card">
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium">{{ longDay(d.day_of_week) }}</span>
              <span class="text-xs text-gray-500">
                {{ doneCount(d) }}/{{ visibleAssignments(d).length }}
              </span>
            </div>
            <div class="h-1 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div class="h-full bg-success transition-all"
                   [style.width.%]="progressPct(d)"></div>
            </div>
            <div class="space-y-1.5">
              @for (a of visibleAssignments(d); track a.id) {
                <button type="button" class="flex items-center gap-2 w-full text-left py-1"
                        (click)="select(a)"
                        [class.opacity-50]="a.is_done">
                  @if (view() === 'all') {
                    <cg-avatar [name]="memberName(a.assigned_to)" [color]="memberColor(a.assigned_to)" [size]="22" />
                  }
                  <cg-category-dot [category]="a.task.category" />
                  <span class="text-sm flex-1" [class.line-through]="a.is_done">{{ a.task.name }}</span>
                  @if (a.soft_violation) { <span class="chip bg-amber-50 text-amber-700">⚠</span> }
                </button>
              }
              @if (visibleAssignments(d).length === 0) {
                <p class="text-xs text-gray-400 italic">Sin tareas</p>
              }
            </div>
          </div>
        }
      </div>
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
export class WeekComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private household = inject(HouseholdStore);
  private weekStore = inject(WeekStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly view = signal<'mine' | 'all'>('mine');
  readonly sheetOpen = signal(false);
  readonly selected = signal<Assignment | null>(null);

  readonly loading = computed(() => this.weekStore.loading());
  readonly days = computed(() => this.weekStore.days());
  readonly proposal = computed(() => this.weekStore.proposal());
  readonly weekStart = computed(() => this.weekStore.weekStart());
  readonly rangeLabel = computed(() => formatRange(this.weekStart()));

  readonly partnerName = computed(() => this.household.partner()?.name ?? 'Pareja');
  readonly myColor = computed(() => this.auth.currentUser()?.avatar_color ?? '#4A6FA5');
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

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.subscribe(qp => {
      const v = qp.get('view');
      this.view.set(v === 'all' ? 'all' : 'mine');
    });
    await this.weekStore.load(this.weekStart());
  }

  setView(v: 'mine' | 'all'): void {
    this.view.set(v);
    void this.router.navigate([], { queryParams: { view: v }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  async prevWeek(): Promise<void> { await this.weekStore.load(addWeeks(this.weekStart(), -1)); }
  async nextWeek(): Promise<void> { await this.weekStore.load(addWeeks(this.weekStart(), 1)); }

  longDay(dow: number): string {
    return ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'][dow - 1] ?? '';
  }

  visibleAssignments(d: DayWithAssignments): Assignment[] {
    if (this.view() === 'all') return d.assignments;
    const me = this.auth.currentUser();
    if (!me) return [];
    return d.assignments.filter(a => a.assigned_to === me.id);
  }

  doneCount(d: DayWithAssignments): number {
    return this.visibleAssignments(d).filter(a => a.is_done).length;
  }

  progressPct(d: DayWithAssignments): number {
    const list = this.visibleAssignments(d);
    if (list.length === 0) return 0;
    return Math.round((this.doneCount(d) / list.length) * 100);
  }

  memberName(id: number): string {
    return this.household.members().find(m => m.id === id)?.name ?? '?';
  }
  memberColor(id: number): string {
    return this.household.members().find(m => m.id === id)?.avatar_color ?? '#9CA3AF';
  }

  select(a: Assignment): void {
    this.selected.set(a);
    this.sheetOpen.set(true);
  }

  async toggle(a: Assignment): Promise<void> {
    const prev = a.is_done;
    this.weekStore.patchAssignment(a.id, { is_done: !prev });
    try {
      if (prev) await this.api.markUndone(a.id);
      else await this.api.markDone(a.id);
    } catch {
      this.weekStore.patchAssignment(a.id, { is_done: prev });
    }
    this.sheetOpen.set(false);
  }
}
