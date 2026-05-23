import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'cg-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="animate-pulse bg-gray-200 rounded-xl"
      [style.height]="height()"
      [style.width]="width()"
    ></div>
  `
})
export class SkeletonComponent {
  readonly width = input<string>('100%');
  readonly height = input<string>('40px');
}
