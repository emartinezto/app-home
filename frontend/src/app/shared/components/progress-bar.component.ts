import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'cg-progress-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div class="h-full bg-primary transition-all duration-300" [style.width.%]="value()"></div>
    </div>
  `
})
export class ProgressBarComponent {
  readonly value = input.required<number>();
}
