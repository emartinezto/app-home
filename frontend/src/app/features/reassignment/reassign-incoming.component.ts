import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { HouseholdStore } from '@core/stores/household.store';
import { ReassignmentRequest } from '@core/types/api.types';
import { CategoryDotComponent } from '@shared/components/category-dot.component';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'cg-reassign-incoming',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CategoryDotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-4 flex items-center gap-3">
      <a routerLink="/" class="p-2 -ml-2 text-gray-700" aria-label="Volver">
        <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.7 14.7a1 1 0 01-1.4 0L6.6 10l4.7-4.7a1 1 0 011.4 1.4L9.4 10l3.3 3.3a1 1 0 010 1.4z" clip-rule="evenodd"/></svg>
      </a>
      <div>
        <h1 class="text-2xl font-medium text-gray-900">Solicitud recibida</h1>
        <p class="text-sm text-gray-500">{{ partnerName() }} te pide una tarea</p>
      </div>
    </header>

    @if (!request()) {
      <p class="text-center text-sm text-gray-500 py-8">Cargando…</p>
    } @else {
      <div class="card mb-4">
        <div class="flex items-center gap-2 mb-2">
          @if (request()!.category) {
            <cg-category-dot [category]="request()!.category!" />
          }
          <span class="font-medium">{{ request()!.task_name ?? 'Tarea' }}</span>
        </div>
        @if (request()!.reason) {
          <p class="text-sm text-gray-700 italic mt-2">"{{ request()!.reason }}"</p>
        }
      </div>

      <div class="card mb-4">
        <p class="text-xs uppercase tracking-wide text-gray-500 mb-2">Cómo quedaría tu tarde</p>
        <p class="text-sm text-gray-700">
          Asumirías esta tarea adicional. Verás los detalles actualizados en la vista semanal una vez aceptes.
        </p>
      </div>

      @if (rejecting()) {
        <form [formGroup]="rejectForm" class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <label class="label">Motivo del rechazo</label>
          <textarea rows="3" class="input"
                    formControlName="rejection_reason"
                    placeholder="Cuéntale por qué no puedes asumirla"></textarea>
        </form>
      }

      <div class="grid grid-cols-2 gap-2">
        <button class="btn"
                [class.bg-success]="!rejecting()"
                [class.text-white]="!rejecting()"
                [class.opacity-50]="rejecting()"
                [disabled]="responding() || rejecting()"
                (click)="accept()">
          Aceptar
        </button>
        <button class="btn-outline"
                [disabled]="responding()"
                (click)="onRejectClick()">
          {{ rejecting() ? 'Confirmar rechazo' : 'Rechazar' }}
        </button>
      </div>
    }
  `
})
export class ReassignIncomingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private household = inject(HouseholdStore);
  private toast = inject(ToastService);

  readonly request = signal<ReassignmentRequest | null>(null);
  readonly responding = signal(false);
  readonly rejecting = signal(false);

  readonly rejectForm = new FormGroup({
    rejection_reason: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] })
  });

  readonly partnerName = computed(() => this.household.partner()?.name ?? 'Tu pareja');

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('requestId'));
    if (!id) { void this.router.navigateByUrl('/'); return; }
    try {
      const res = await this.api.listReassignmentRequests();
      const req = res.requests.find(r => r.id === id);
      if (!req) {
        this.toast.error('No se encontró la solicitud.');
        void this.router.navigateByUrl('/notifications');
        return;
      }
      this.request.set(req);
    } catch { /* toast por interceptor */ }
  }

  async accept(): Promise<void> {
    const r = this.request();
    if (!r || this.responding()) return;
    this.responding.set(true);
    try {
      await this.api.acceptReassignment(r.id);
      this.toast.success('Tarea reasignada');
      void this.router.navigateByUrl('/');
    } finally {
      this.responding.set(false);
    }
  }

  onRejectClick(): void {
    if (!this.rejecting()) {
      this.rejecting.set(true);
      return;
    }
    void this.confirmReject();
  }

  async confirmReject(): Promise<void> {
    const r = this.request();
    if (!r || this.responding()) return;
    if (this.rejectForm.invalid) {
      this.toast.error('Indica un motivo para rechazar.');
      return;
    }
    this.responding.set(true);
    try {
      await this.api.rejectReassignment(r.id, {
        rejection_reason: this.rejectForm.controls.rejection_reason.value
      });
      this.toast.info('Solicitud rechazada');
      void this.router.navigateByUrl('/');
    } finally {
      this.responding.set(false);
    }
  }
}
