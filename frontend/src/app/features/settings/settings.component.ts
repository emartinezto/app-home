import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { HouseholdStore } from '@core/stores/household.store';
import { Category, Task, Weight } from '@core/types/api.types';
import { AvatarComponent } from '@shared/components/avatar.component';
import { CategoryDotComponent } from '@shared/components/category-dot.component';
import { BottomSheetComponent } from '@shared/components/bottom-sheet.component';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'cg-settings',
  standalone: true,
  imports: [ReactiveFormsModule, AvatarComponent, CategoryDotComponent, BottomSheetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-4">
      <h1 class="text-2xl font-medium text-gray-900">Ajustes del hogar</h1>
    </header>

    @if (household(); as h) {
      <div class="card flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-xl">🏡</div>
        <div class="flex-1">
          <p class="font-medium">{{ h.name }}</p>
          @if (h.invite_code) {
            <p class="text-xs text-gray-500">Código: <span class="tracking-widest">{{ h.invite_code }}</span></p>
          }
        </div>
        <button class="text-sm text-primary" (click)="regenerate()">Regenerar</button>
      </div>

      <section class="mb-4">
        <h3 class="text-xs uppercase tracking-wide text-gray-500 mb-2">Miembros</h3>
        <div class="grid grid-cols-2 gap-2">
          @for (m of h.members; track m.id) {
            <div class="card flex items-center gap-2">
              <cg-avatar [name]="m.name" [color]="m.avatar_color" [size]="32" />
              <span class="text-sm font-medium truncate">{{ m.name }}</span>
            </div>
          }
        </div>
      </section>
    }

    <section class="mb-4">
      <h3 class="text-xs uppercase tracking-wide text-gray-500 mb-2">Catálogo de tareas</h3>

      @for (cat of categories; track cat) {
        <div class="mb-4">
          <div class="flex items-center gap-2 mb-2">
            <cg-category-dot [category]="cat" [size]="12" />
            <h4 class="text-xs uppercase tracking-wide text-gray-500">{{ catLabel(cat) }}</h4>
          </div>
          <div class="space-y-2">
            @for (t of byCategory()[cat]; track t.id) {
              <div class="card flex items-center gap-2">
                <cg-category-dot [category]="t.category" />
                <span class="flex-1 text-sm">{{ t.name }}</span>
                <div class="flex bg-gray-100 rounded-lg p-0.5 mr-2">
                  @for (w of [1,2,3]; track w) {
                    <button type="button"
                            class="w-7 h-7 rounded-md text-xs font-medium transition"
                            [class.bg-white]="t.weight === w"
                            [class.shadow-card]="t.weight === w"
                            [class.text-gray-500]="t.weight !== w"
                            (click)="setWeight(t, asWeight(w))">
                      {{ w }}
                    </button>
                  }
                </div>
                <button type="button"
                        class="relative inline-block w-10 h-5 rounded-full transition shrink-0"
                        [class.bg-primary]="t.is_active"
                        [class.bg-gray-300]="!t.is_active"
                        (click)="toggleActive(t)">
                  <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                        [class.translate-x-5]="t.is_active"></span>
                </button>
              </div>
            }
            <button type="button"
                    class="w-full py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500"
                    (click)="openCustomFor(cat)">
              + Nueva tarea
            </button>
          </div>
        </div>
      }
    </section>

    <p class="text-center text-xs text-gray-500 italic">
      Los cambios se aplican desde la siguiente semana.
    </p>

    <cg-bottom-sheet [open]="customOpen()" (close)="customOpen.set(false)">
      <h3 class="font-medium text-lg mb-3">Nueva tarea</h3>
      <form [formGroup]="customForm" (ngSubmit)="addCustom()" class="space-y-3">
        <div>
          <label class="label">Nombre</label>
          <input class="input" formControlName="name" placeholder="Ej. Limpiar cristales" />
        </div>
        <div>
          <label class="label">Peso</label>
          <select class="input" formControlName="weight">
            <option [value]="1">1 · Ligera</option>
            <option [value]="2">2 · Media</option>
            <option [value]="3">3 · Pesada</option>
          </select>
        </div>
        <div class="flex gap-2 pt-2">
          <button type="button" class="btn-secondary flex-1" (click)="customOpen.set(false)">Cancelar</button>
          <button type="submit" class="btn-primary flex-1" [disabled]="customForm.invalid">Añadir</button>
        </div>
      </form>
    </cg-bottom-sheet>
  `
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  private householdStore = inject(HouseholdStore);
  private toast = inject(ToastService);

  readonly categories: Category[] = ['hogar', 'cuidados', 'perro'];
  readonly tasks = signal<Task[]>([]);
  readonly customOpen = signal(false);
  private newCategory: Category = 'hogar';

  readonly customForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    weight: new FormControl<Weight>(2, { nonNullable: true })
  });

  readonly household = this.householdStore.household;

  readonly byCategory = computed<Record<Category, Task[]>>(() => {
    const out: Record<Category, Task[]> = { hogar: [], cuidados: [], perro: [] };
    for (const t of this.tasks()) out[t.category].push(t);
    return out;
  });

  async ngOnInit(): Promise<void> {
    await this.householdStore.load();
    const res = await this.api.getTasks();
    this.tasks.set(res.tasks);
  }

  catLabel(c: Category): string {
    return c === 'hogar' ? 'Hogar' : c === 'cuidados' ? 'Cuidados' : 'Perro';
  }
  asWeight(n: number): Weight { return n as Weight; }

  async toggleActive(t: Task): Promise<void> {
    const next = !t.is_active;
    this.tasks.update(list => list.map(x => x.id === t.id ? { ...x, is_active: next } : x));
    try {
      await this.api.patchTask(t.id, { is_active: next });
    } catch {
      this.tasks.update(list => list.map(x => x.id === t.id ? { ...x, is_active: !next } : x));
    }
  }

  async setWeight(t: Task, w: Weight): Promise<void> {
    if (t.weight === w) return;
    const prev = t.weight;
    this.tasks.update(list => list.map(x => x.id === t.id ? { ...x, weight: w } : x));
    try {
      await this.api.patchTask(t.id, { weight: w });
    } catch {
      this.tasks.update(list => list.map(x => x.id === t.id ? { ...x, weight: prev } : x));
    }
  }

  openCustomFor(cat: Category): void {
    this.newCategory = cat;
    this.customForm.reset({ name: '', weight: 2 });
    this.customOpen.set(true);
  }

  async addCustom(): Promise<void> {
    if (this.customForm.invalid) return;
    const v = this.customForm.getRawValue();
    try {
      const res = await this.api.createTask({
        name: v.name,
        category: this.newCategory,
        weight: v.weight,
        frequency: 'semanal',
        is_active: true,
        is_custom: true
      });
      this.tasks.update(list => [...list, res.task]);
      this.customOpen.set(false);
      this.toast.success('Tarea añadida');
    } catch { /* toast por interceptor */ }
  }

  async regenerate(): Promise<void> {
    const newCode = await this.householdStore.regenerateInviteCode();
    if (newCode) this.toast.success('Código regenerado');
  }
}
