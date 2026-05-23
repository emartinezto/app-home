import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'cg-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center justify-center font-medium text-white shrink-0"
      [class]="shapeClass()"
      [style.background-color]="color()"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.font-size.px]="fontSize()"
    >{{ initial() }}</span>
  `
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly color = input<string>('#4A6FA5');
  readonly size = input<number>(32);
  readonly square = input<boolean>(false);

  readonly initial = computed(() => (this.name() ?? '?').trim().charAt(0).toUpperCase() || '?');
  readonly fontSize = computed(() => Math.max(12, Math.round(this.size() * 0.42)));
  readonly shapeClass = computed(() => this.square() ? 'rounded-2xl' : 'rounded-full');
}
