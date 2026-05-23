import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { Assignment } from '@core/types/api.types';
import { BottomSheetComponent } from './bottom-sheet.component';
import { CategoryDotComponent } from './category-dot.component';
import { AvatarComponent } from './avatar.component';
import { HouseholdStore } from '@core/stores/household.store';

@Component({
  selector: 'cg-task-sheet',
  standalone: true,
  imports: [BottomSheetComponent, CategoryDotComponent, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cg-bottom-sheet [open]="open()" (close)="close.emit()">
      @if (assignment(); as a) {
        <div class="flex items-start gap-3 mb-4">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
               [style.background-color]="bgColor()">
            <cg-category-dot [category]="a.task.category" [size]="16" />
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="font-medium text-lg leading-snug">{{ a.task.name }}</h2>
            <p class="text-sm text-gray-500 capitalize">{{ categoryLabel() }}</p>
          </div>
        </div>

        <div class="flex gap-2 mb-4">
          <span class="chip bg-gray-100 text-gray-700">{{ frequencyLabel() }}</span>
          <span class="chip text-white" [style.background-color]="dotColor()">{{ categoryLabel() }}</span>
        </div>

        <div class="card mb-4">
          <div class="text-xs uppercase tracking-wide text-gray-500 mb-2">Peso</div>
          <div class="flex items-end gap-1.5 h-8">
            @for (level of [1,2,3]; track level) {
              <div
                class="w-3 rounded-sm"
                [style.height.%]="level === 1 ? 40 : level === 2 ? 70 : 100"
                [class.bg-primary]="level <= a.task.weight"
                [class.bg-gray-200]="level > a.task.weight"
              ></div>
            }
            <span class="ml-2 text-sm text-gray-700">{{ weightLabel() }}</span>
          </div>
        </div>

        <div class="card mb-4 flex items-center gap-3">
          <div class="text-xs uppercase tracking-wide text-gray-500">Asignada a</div>
          @if (assignedMember(); as m) {
            <div class="flex items-center gap-2 ml-auto">
              <cg-avatar [name]="m.name" [color]="m.avatar_color" [size]="28" />
              <span class="text-sm font-medium">{{ m.name }}</span>
            </div>
          }
        </div>

        <div class="space-y-2">
          @if (!a.is_done) {
            <button class="btn-primary w-full" (click)="markDone.emit(a)">Marcar como hecha</button>
          } @else {
            <button class="btn-outline w-full" (click)="markUndone.emit(a)">Marcar como pendiente</button>
          }
          <button class="btn-outline w-full" (click)="goReassign(a)">↔ Reasignar</button>
          <button class="btn-ghost w-full" (click)="close.emit()">Cerrar</button>
        </div>
      }
    </cg-bottom-sheet>
  `
})
export class TaskSheetComponent {
  private household = inject(HouseholdStore);
  private router = inject(Router);

  readonly open = input.required<boolean>();
  readonly assignment = input<Assignment | null>(null);
  readonly close = output<void>();
  readonly markDone = output<Assignment>();
  readonly markUndone = output<Assignment>();

  readonly bgColor = computed(() => {
    const cat = this.assignment()?.task.category;
    if (cat === 'hogar') return '#DBEAFE';
    if (cat === 'cuidados') return '#D1FAE5';
    if (cat === 'perro') return '#FEF3C7';
    return '#F3F4F6';
  });

  readonly dotColor = computed(() => {
    const cat = this.assignment()?.task.category;
    if (cat === 'hogar') return '#378ADD';
    if (cat === 'cuidados') return '#1D9E75';
    if (cat === 'perro') return '#BA7517';
    return '#6B7280';
  });

  readonly categoryLabel = computed(() => {
    switch (this.assignment()?.task.category) {
      case 'hogar': return 'Hogar';
      case 'cuidados': return 'Cuidados';
      case 'perro': return 'Perro';
      default: return '';
    }
  });

  readonly frequencyLabel = computed(() => {
    switch (this.assignment()?.task.frequency) {
      case 'diaria': return 'Diaria';
      case 'semanal': return 'Semanal';
      case 'quincenal': return 'Quincenal';
      case 'mensual': return 'Mensual';
      case 'puntual': return 'Puntual';
      default: return '';
    }
  });

  readonly weightLabel = computed(() => {
    const w = this.assignment()?.task.weight;
    return w === 1 ? 'Ligera' : w === 2 ? 'Media' : w === 3 ? 'Pesada' : '';
  });

  readonly assignedMember = computed(() => {
    const a = this.assignment();
    if (!a) return null;
    return this.household.members().find(m => m.id === a.assigned_to) ?? null;
  });

  goReassign(a: Assignment): void {
    this.close.emit();
    void this.router.navigate(['/reassign', a.id]);
  }
}
