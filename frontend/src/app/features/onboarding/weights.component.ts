import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { HouseholdStore } from '@core/stores/household.store';
import { Task, Weight } from '@core/types/api.types';
import { ProgressBarComponent } from '@shared/components/progress-bar.component';
import { CategoryDotComponent } from '@shared/components/category-dot.component';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'cg-onboarding-weights',
  standalone: true,
  imports: [ProgressBarComponent, CategoryDotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white flex flex-col safe-top safe-bottom">
      <div class="container-page px-6 pt-6 pb-32 flex-1 flex flex-col">
        <cg-progress-bar [value]="100" />
        <p class="text-xs text-gray-500 mt-2">Paso 5 de 5</p>

        <h1 class="text-2xl font-medium text-gray-900 mt-4">Ajusta el peso</h1>
        <p class="text-sm text-gray-500 mb-6">Cuánto esfuerzo supone cada tarea.</p>

        @if (loading()) {
          <p class="text-sm text-gray-500 text-center py-8">Cargando…</p>
        } @else {
          <div class="space-y-2">
            @for (t of activeTasks(); track t.id) {
              <div class="card">
                <div class="flex items-center gap-2 mb-3">
                  <cg-category-dot [category]="t.category" />
                  <span class="font-medium">{{ t.name }}</span>
                </div>
                <div class="flex gap-2">
                  @for (w of [1,2,3]; track w) {
                    <button type="button"
                            class="flex-1 py-2 rounded-xl text-xs font-medium transition border"
                            [class.bg-primary]="weightOf(t.id) === w"
                            [class.text-white]="weightOf(t.id) === w"
                            [class.border-primary]="weightOf(t.id) === w"
                            [class.border-gray-200]="weightOf(t.id) !== w"
                            [class.text-gray-700]="weightOf(t.id) !== w"
                            (click)="setWeight(t.id, asWeight(w))">
                      {{ w }} {{ w === 1 ? 'Ligera' : w === 2 ? 'Media' : 'Pesada' }}
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>

      <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom">
        <div class="container-page px-6 py-3">
          <button class="btn-primary w-full" (click)="finish()" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : '¡Empezar!' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class OnboardingWeightsComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private household = inject(HouseholdStore);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly tasks = signal<Task[]>([]);
  readonly weightOverrides = signal<Map<number, Weight>>(new Map());

  readonly activeTasks = computed(() => this.tasks().filter(t => t.is_active));

  async ngOnInit(): Promise<void> {
    try {
      const res = await this.api.getTasks();
      this.tasks.set(res.tasks);
      const map = new Map<number, Weight>();
      for (const t of res.tasks) map.set(t.id, t.weight);
      this.weightOverrides.set(map);
    } finally {
      this.loading.set(false);
    }
  }

  asWeight(n: number): Weight { return n as Weight; }
  weightOf(id: number): Weight { return this.weightOverrides().get(id) ?? 2; }

  setWeight(taskId: number, w: Weight): void {
    const next = new Map(this.weightOverrides());
    next.set(taskId, w);
    this.weightOverrides.set(next);
  }

  async finish(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const updates: Promise<unknown>[] = [];
      for (const t of this.activeTasks()) {
        const w = this.weightOf(t.id);
        if (w !== t.weight) {
          updates.push(this.api.patchTask(t.id, { weight: w }));
        }
      }
      await Promise.all(updates);
      const me = await this.api.getMe();
      this.auth.setUser(me.user);
      await this.household.load(true);
      this.toast.success('¡Listo! Vamos allá');
      void this.router.navigateByUrl('/');
    } catch {
      this.toast.error('No se pudieron guardar los pesos.');
    } finally {
      this.saving.set(false);
    }
  }
}
