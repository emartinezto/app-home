import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Category } from '@core/types/api.types';

const COLORS: Record<Category, string> = {
  hogar: '#378ADD',
  cuidados: '#1D9E75',
  perro: '#BA7517'
};

@Component({
  selector: 'cg-category-dot',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-block rounded-full shrink-0"
      [style.background-color]="color()"
      [style.width.px]="size()"
      [style.height.px]="size()"
    ></span>
  `
})
export class CategoryDotComponent {
  readonly category = input.required<Category>();
  readonly size = input<number>(10);
  readonly color = computed(() => COLORS[this.category()]);
}
