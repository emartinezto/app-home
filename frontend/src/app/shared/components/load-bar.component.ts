import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'cg-load-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full">
      @if (showLabels()) {
        <div class="flex justify-between text-xs text-gray-600 mb-1.5">
          <span class="flex items-center gap-1.5">
            <span class="inline-block w-2 h-2 rounded-full" [style.background-color]="leftColor()"></span>
            {{ leftLabel() }} {{ leftPct() }}%
          </span>
          <span class="flex items-center gap-1.5">
            {{ rightLabel() }} {{ rightPct() }}%
            <span class="inline-block w-2 h-2 rounded-full" [style.background-color]="rightColor()"></span>
          </span>
        </div>
      }
      <div class="flex h-2 rounded-full overflow-hidden bg-gray-100">
        <div [style.width.%]="leftPct()" [style.background-color]="leftColor()"></div>
        <div [style.width.%]="rightPct()" [style.background-color]="rightColor()"></div>
      </div>
    </div>
  `
})
export class LoadBarComponent {
  readonly leftValue = input.required<number>();
  readonly rightValue = input.required<number>();
  readonly leftLabel = input<string>('Tú');
  readonly rightLabel = input<string>('Pareja');
  readonly leftColor = input<string>('#4A6FA5');
  readonly rightColor = input<string>('#1D9E75');
  readonly showLabels = input<boolean>(true);

  readonly total = computed(() => Math.max(this.leftValue() + this.rightValue(), 0.0001));
  readonly leftPct = computed(() => Math.round((this.leftValue() / this.total()) * 100));
  readonly rightPct = computed(() => 100 - this.leftPct());
}
