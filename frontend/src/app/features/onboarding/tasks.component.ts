import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { Category, Task, TaskTemplate } from '@core/types/api.types';
import { ProgressBarComponent } from '@shared/components/progress-bar.component';
import { CategoryDotComponent } from '@shared/components/category-dot.component';
import { BottomSheetComponent } from '@shared/components/bottom-sheet.component';
import { ToastService } from '@core/services/toast.service';

interface CustomTaskForm {
  name: FormControl<string>;
  category: FormControl<Category>;
}

interface CategorySection {
  key: Category;
  label: string;
}

@Component({
  selector: 'cg-onboarding-tasks',
  standalone: true,
  imports: [ReactiveFormsModule, ProgressBarComponent, CategoryDotComponent, BottomSheetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white flex flex-col safe-top safe-bottom">
      <div class="container-page px-6 pt-6 pb-32 flex-1 flex flex-col">
        <cg-progress-bar [value]="80" />
        <p class="text-xs text-gray-500 mt-2">Paso 4 de 5</p>

        <h1 class="text-2xl font-medium text-gray-900 mt-4">Elige tus tareas</h1>
        <p class="text-sm text-gray-500 mb-6">Activa las que necesites en tu hogar.</p>

        @if (loading()) {
          <p class="text-sm text-gray-500 text-center py-8">Cargando catálogo…</p>
        } @else {
          @for (section of sections; track section.key) {
            <section class="mb-6">
              <div class="flex items-center gap-2 mb-2">
                <cg-category-dot [category]="section.key" [size]="12" />
                <h2 class="font-medium uppercase tracking-wide text-xs text-gray-500">{{ section.label }}</h2>
              </div>
              <div class="space-y-2">
                @for (t of templatesByCategory()[section.key]; track t.id) {
                  <button type="button"
                          class="card flex items-center w-full text-left"
                          (click)="toggleTemplate(t.id)">
                    <span class="flex-1 font-medium text-gray-900">{{ t.name }}</span>
                    <span class="relative inline-block w-11 h-6 rounded-full transition"
                          [class.bg-primary]="isActive(t.id)"
                          [class.bg-gray-300]="!isActive(t.id)">
                      <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                            [class.translate-x-5]="isActive(t.id)"></span>
                    </span>
                  </button>
                }
                @for (c of customsByCategory()[section.key]; track c.tempId) {
                  <div class="card flex items-center gap-3">
                    <span class="flex-1 font-medium text-gray-900">{{ c.name }}</span>
                    <button type="button" class="text-primary text-sm" (click)="openEditCustom(c.tempId)">Editar</button>
                    <button type="button" class="text-danger text-sm" (click)="removeCustom(c.tempId)">Borrar</button>
                  </div>
                }
                <button type="button"
                        class="w-full py-3 rounded-xl border border-dashed border-gray-300 text-sm text-gray-600"
                        (click)="openCustomFor(section.key)">
                  + Añadir tarea
                </button>
              </div>
            </section>
          }
        }
      </div>

      <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom">
        <div class="container-page px-6 py-3">
          <button class="btn-primary w-full" (click)="next()" [disabled]="totalActive() === 0">
            Siguiente ({{ totalActive() }} tareas)
          </button>
        </div>
      </div>
    </div>

    <cg-bottom-sheet [open]="customOpen()" (close)="customOpen.set(false)">
      <h3 class="font-medium text-lg mb-3">{{ editingTempId() ? 'Editar tarea' : 'Nueva tarea' }}</h3>
      <form [formGroup]="customForm" (ngSubmit)="addCustom()" class="space-y-3">
        <div>
          <label class="label">Nombre</label>
          <input class="input" formControlName="name" placeholder="Ej. Limpiar baño" />
        </div>
        <div>
          <label class="label">Categoría</label>
          <select class="input" formControlName="category">
            <option value="hogar">Hogar</option>
            <option value="cuidados">Cuidados</option>
            <option value="perro">Perro</option>
          </select>
        </div>
        <div class="flex gap-2 pt-2">
          <button type="button" class="btn-secondary flex-1" (click)="customOpen.set(false)">Cancelar</button>
          <button type="submit" class="btn-primary flex-1" [disabled]="customForm.invalid">
            {{ editingTempId() ? 'Guardar' : 'Añadir' }}
          </button>
        </div>
      </form>
    </cg-bottom-sheet>
  `
})
export class OnboardingTasksComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly loading = signal(true);
  readonly templates = signal<TaskTemplate[]>([]);
  readonly existingTasks = signal<Task[]>([]);
  readonly activeTemplateIds = signal<Set<number>>(new Set());
  readonly customs = signal<Array<{ tempId: number; name: string; category: Category }>>([]);
  private customCounter = 0;

  readonly customOpen = signal(false);
  readonly editingTempId = signal<number | null>(null);
  readonly customForm = new FormGroup<CustomTaskForm>({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    category: new FormControl<Category>('hogar', { nonNullable: true, validators: [Validators.required] })
  });

  readonly sections: CategorySection[] = [
    { key: 'hogar', label: 'Hogar' },
    { key: 'cuidados', label: 'Cuidados' },
    { key: 'perro', label: 'Perro' }
  ];

  readonly templatesByCategory = computed<Record<Category, TaskTemplate[]>>(() => {
    const out: Record<Category, TaskTemplate[]> = { hogar: [], cuidados: [], perro: [] };
    for (const t of this.templates()) out[t.category].push(t);
    return out;
  });

  readonly customsByCategory = computed<Record<Category, Array<{ tempId: number; name: string; category: Category }>>>(() => {
    const out: Record<Category, Array<{ tempId: number; name: string; category: Category }>> = { hogar: [], cuidados: [], perro: [] };
    for (const c of this.customs()) out[c.category].push(c);
    return out;
  });

  readonly totalActive = computed(() => this.activeTemplateIds().size + this.customs().length);

  async ngOnInit(): Promise<void> {
    try {
      const [tpl, tasks] = await Promise.all([
        this.api.getTaskTemplates(),
        this.api.getTasks()
      ]);
      this.templates.set(tpl.templates);
      this.existingTasks.set(tasks.tasks);
      const preActive = new Set<number>();
      for (const t of tasks.tasks) {
        if (t.template_id && t.is_active) preActive.add(t.template_id);
      }
      this.activeTemplateIds.set(preActive);
    } finally {
      this.loading.set(false);
    }
  }

  isActive(id: number): boolean { return this.activeTemplateIds().has(id); }

  toggleTemplate(id: number): void {
    const next = new Set(this.activeTemplateIds());
    if (next.has(id)) next.delete(id); else next.add(id);
    this.activeTemplateIds.set(next);
  }

  openCustomFor(cat: Category): void {
    this.editingTempId.set(null);
    this.customForm.reset({ name: '', category: cat });
    this.customOpen.set(true);
  }

  openEditCustom(tempId: number): void {
    const c = this.customs().find(x => x.tempId === tempId);
    if (!c) return;
    this.editingTempId.set(tempId);
    this.customForm.reset({ name: c.name, category: c.category });
    this.customOpen.set(true);
  }

  addCustom(): void {
    if (this.customForm.invalid) return;
    const v = this.customForm.getRawValue();
    const editingId = this.editingTempId();
    if (editingId !== null) {
      this.customs.update(list => list.map(c =>
        c.tempId === editingId ? { ...c, name: v.name, category: v.category } : c
      ));
    } else {
      this.customs.update(list => [...list, { tempId: ++this.customCounter, name: v.name, category: v.category }]);
    }
    this.customOpen.set(false);
    this.editingTempId.set(null);
  }

  removeCustom(tempId: number): void {
    this.customs.update(list => list.filter(c => c.tempId !== tempId));
  }

  async next(): Promise<void> {
    if (this.totalActive() === 0) return;
    try {
      const templateIds = Array.from(this.activeTemplateIds());
      if (templateIds.length > 0) {
        await this.api.bulkActivate({ template_ids: templateIds });
      }
      for (const c of this.customs()) {
        await this.api.createTask({
          name: c.name,
          category: c.category,
          weight: 2,
          frequency: 'semanal',
          time_slot: 'flexible',
          is_active: true
        });
      }
      void this.router.navigateByUrl('/onboarding/weights');
    } catch {
      this.toast.error('No se pudieron guardar las tareas.');
    }
  }
}
