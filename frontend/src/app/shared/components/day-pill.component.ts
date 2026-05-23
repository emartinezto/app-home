import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'cg-day-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="px-4 py-2 rounded-full text-sm font-medium transition"
      [class.bg-primary]="active()"
      [class.text-white]="active()"
      [class.border]="!active()"
      [class.border-gray-300]="!active()"
      [class.text-gray-700]="!active()"
      (click)="toggle.emit()"
    >
      {{ label() }}
    </button>
  `
})
export class DayPillComponent {
  readonly label = input.required<string>();
  readonly active = input<boolean>(false);
  readonly toggle = output<void>();
}
