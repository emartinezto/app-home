import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'cg-toast-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed top-3 left-0 right-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none safe-top">
      @for (t of toasts(); track t.id) {
        <div
          class="pointer-events-auto max-w-sm w-full rounded-xl px-4 py-3 shadow-card text-sm text-white animate-fade-in"
          [class.bg-success]="t.kind === 'success'"
          [class.bg-danger]="t.kind === 'error'"
          [class.bg-gray-800]="t.kind === 'info'"
          (click)="toastSvc.dismiss(t.id)"
        >
          {{ t.message }}
        </div>
      }
    </div>
  `
})
export class ToastHostComponent {
  protected toastSvc = inject(ToastService);
  readonly toasts = this.toastSvc.toasts;
}
