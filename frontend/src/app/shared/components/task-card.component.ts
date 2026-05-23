import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Assignment } from '@core/types/api.types';
import { CategoryDotComponent } from './category-dot.component';
import { AvatarComponent } from './avatar.component';

@Component({
  selector: 'cg-task-card',
  standalone: true,
  imports: [CategoryDotComponent, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="w-full text-left card flex items-center gap-3 transition"
      [class.opacity-60]="assignment().is_done"
      (click)="open.emit(assignment())"
    >
      <button
        type="button"
        class="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition"
        [class.bg-success]="assignment().is_done"
        [class.border-success]="assignment().is_done"
        [class.border-gray-300]="!assignment().is_done"
        (click)="onToggle($event)"
        [attr.aria-label]="assignment().is_done ? 'Marcar pendiente' : 'Marcar hecha'"
      >
        @if (assignment().is_done) {
          <svg class="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
          </svg>
        }
      </button>

      <cg-category-dot [category]="assignment().task.category" />

      <div class="flex-1 min-w-0">
        <div class="font-medium text-gray-900 truncate" [class.line-through]="assignment().is_done">
          {{ assignment().task.name }}
        </div>
        <div class="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
          <span>{{ weightLabel() }}</span>
          @if (assignment().soft_violation) {
            <span class="chip bg-amber-50 text-amber-700">⚠ Conflicto</span>
          }
        </div>
      </div>

      @if (showAvatar() && avatarName()) {
        <cg-avatar [name]="avatarName()!" [color]="avatarColor() ?? '#4A6FA5'" [size]="28" />
      }
    </button>
  `
})
export class TaskCardComponent {
  readonly assignment = input.required<Assignment>();
  readonly showAvatar = input<boolean>(false);
  readonly avatarName = input<string | null>(null);
  readonly avatarColor = input<string | null>(null);

  readonly toggle = output<Assignment>();
  readonly open = output<Assignment>();

  readonly weightLabel = computed(() => {
    const w = this.assignment().task.weight;
    return w === 1 ? 'Ligera' : w === 2 ? 'Media' : 'Pesada';
  });

  onToggle(ev: MouseEvent): void {
    ev.stopPropagation();
    this.toggle.emit(this.assignment());
  }
}
