import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { HouseholdStore } from '@core/stores/household.store';
import { WeekStore } from '@core/stores/week.store';
import { Assignment, ApiError } from '@core/types/api.types';
import { CategoryDotComponent } from '@shared/components/category-dot.component';
import { LoadBarComponent } from '@shared/components/load-bar.component';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'cg-reassign-outgoing',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CategoryDotComponent, LoadBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-4 flex items-center gap-3">
      <a routerLink="/" class="p-2 -ml-2 text-gray-700" aria-label="Volver">
        <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.7 14.7a1 1 0 01-1.4 0L6.6 10l4.7-4.7a1 1 0 011.4 1.4L9.4 10l3.3 3.3a1 1 0 010 1.4z" clip-rule="evenodd"/></svg>
      </a>
      <div>
        <h1 class="text-2xl font-medium text-gray-900">Reasignar tarea</h1>
        <p class="text-sm text-gray-500">¿Qué necesitas pasar a {{ partnerName() }}?</p>
      </div>
    </header>

    @if (!assignment()) {
      <p class="text-center text-sm text-gray-500 py-8">Cargando…</p>
    } @else {
      <div class="card mb-4">
        <div class="flex items-center gap-3">
          <input type="radio" [checked]="true" readonly class="w-4 h-4 accent-primary" />
          <cg-category-dot [category]="assignment()!.task.category" />
          <div class="flex-1">
            <p class="font-medium">{{ assignment()!.task.name }}</p>
            <p class="text-xs text-gray-500">{{ longDay(assignment()!.day_of_week) }} · {{ weightLabel() }}</p>
          </div>
        </div>
      </div>

      <form [formGroup]="form" class="mb-4">
        <label class="label" for="reason">Motivo (opcional)</label>
        <textarea id="reason" rows="3" class="input" formControlName="reason"
                  placeholder="Ej. Tengo cita médica esa tarde"></textarea>
      </form>

      <div class="card mb-6">
        <p class="text-xs uppercase tracking-wide text-gray-500 mb-2">Si {{ partnerName() }} acepta →</p>
        <cg-load-bar
          [leftValue]="myLoadAfter()"
          [rightValue]="partnerLoadAfter()"
          [rightLabel]="partnerName()"
          [leftColor]="myColor()"
          [rightColor]="partnerColor()"
        />
      </div>

      <button class="btn-primary w-full" (click)="send()" [disabled]="sending()">
        {{ sending() ? 'Enviando…' : 'Enviar solicitud' }}
      </button>
    }
  `
})
export class ReassignOutgoingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private household = inject(HouseholdStore);
  private weekStore = inject(WeekStore);
  private toast = inject(ToastService);

  readonly sending = signal(false);
  readonly assignment = signal<Assignment | null>(null);

  readonly form = new FormGroup({
    reason: new FormControl('', { nonNullable: true })
  });

  readonly partnerName = computed(() => this.household.partner()?.name ?? 'tu pareja');
  readonly myColor = computed(() => this.auth.currentUser()?.avatar_color ?? '#4A6FA5');
  readonly partnerColor = computed(() => this.household.partner()?.avatar_color ?? '#1D9E75');

  readonly weightLabel = computed(() => {
    const w = this.assignment()?.task.weight;
    return w === 1 ? 'Ligera' : w === 2 ? 'Media' : 'Pesada';
  });

  readonly myLoadAfter = computed(() => {
    const p = this.weekStore.proposal(), me = this.auth.currentUser(), a = this.assignment();
    if (!p || !me || !a) return 0;
    const myCurrent = p.user1_id === me.id ? p.user1_load_score : p.user2_load_score;
    return Math.max(0, myCurrent - a.task.weight);
  });
  readonly partnerLoadAfter = computed(() => {
    const p = this.weekStore.proposal(), me = this.auth.currentUser(), a = this.assignment();
    if (!p || !me || !a) return 0;
    const partnerCurrent = p.user1_id === me.id ? p.user2_load_score : p.user1_load_score;
    return partnerCurrent + a.task.weight;
  });

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('assignmentId'));
    if (!id) { void this.router.navigateByUrl('/'); return; }

    if (!this.weekStore.detail()) {
      await this.weekStore.load();
    }
    const found = this.weekStore.allAssignments().find(a => a.id === id);
    if (found) this.assignment.set(found);
    else this.toast.error('No se encontró la tarea.');
  }

  longDay(dow: number): string {
    return ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'][dow - 1] ?? '';
  }

  async send(): Promise<void> {
    const a = this.assignment();
    if (!a || this.sending()) return;
    this.sending.set(true);
    try {
      await this.api.requestReassignment(a.id, { reason: this.form.controls.reason.value || undefined });
      this.toast.success('Solicitud enviada');
      void this.router.navigateByUrl('/');
    } catch (e) {
      const code = (e as HttpErrorResponse).error as ApiError | undefined;
      if (code?.error === 'PENDING_REQUEST_EXISTS') {
        this.toast.error('Ya hay una solicitud pendiente para esa tarea.');
      }
    } finally {
      this.sending.set(false);
    }
  }
}
