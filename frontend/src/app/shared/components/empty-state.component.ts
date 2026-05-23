import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'cg-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div class="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 text-3xl">
        {{ icon() }}
      </div>
      <h3 class="font-medium text-gray-900 mb-1">{{ title() }}</h3>
      @if (description()) {
        <p class="text-sm text-gray-500 max-w-xs">{{ description() }}</p>
      }
    </div>
  `
})
export class EmptyStateComponent {
  readonly icon = input<string>('📭');
  readonly title = input.required<string>();
  readonly description = input<string>('');
}
