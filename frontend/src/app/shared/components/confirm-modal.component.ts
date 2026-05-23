import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'cg-confirm-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[55] flex items-center justify-center px-4">
        <div class="absolute inset-0 bg-black/40 animate-fade-in" (click)="cancel.emit()"></div>
        <div class="relative bg-white rounded-2xl shadow-card w-full max-w-sm p-5 animate-fade-in">
          <h3 class="font-medium text-lg mb-1">{{ title() }}</h3>
          @if (message()) {
            <p class="text-sm text-gray-600 mb-4">{{ message() }}</p>
          }
          <div class="flex gap-2 mt-4">
            <button class="btn-secondary flex-1" (click)="cancel.emit()">{{ cancelLabel() }}</button>
            <button
              class="flex-1"
              [class.btn-primary]="!danger()"
              [class.btn-danger-outline]="danger()"
              (click)="confirm.emit()"
            >{{ confirmLabel() }}</button>
          </div>
        </div>
      </div>
    }
  `
})
export class ConfirmModalComponent {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly confirmLabel = input<string>('Confirmar');
  readonly cancelLabel = input<string>('Cancelar');
  readonly danger = input<boolean>(false);
  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
