import { ChangeDetectionStrategy, Component, output, input } from '@angular/core';

@Component({
  selector: 'cg-bottom-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex flex-col justify-end">
        <div class="absolute inset-0 bg-black/40 animate-fade-in" (click)="onBackdrop()"></div>
        <div class="relative w-full max-w-md mx-auto bg-white rounded-t-2xl shadow-sheet animate-slide-up safe-bottom max-h-[90vh] overflow-y-auto">
          <div class="flex justify-center pt-3 pb-1">
            <span class="block w-10 h-1 rounded-full bg-gray-300"></span>
          </div>
          <div class="px-4 pb-4">
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    }
  `
})
export class BottomSheetComponent {
  readonly open = input.required<boolean>();
  readonly dismissable = input<boolean>(true);
  readonly close = output<void>();

  onBackdrop(): void {
    if (this.dismissable()) this.close.emit();
  }
}
