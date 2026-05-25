import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { HouseholdStore } from '@core/stores/household.store';
import { DayKey, WorkSchedule } from '@core/types/api.types';
import { ProgressBarComponent } from '@shared/components/progress-bar.component';
import { dayKeysWeekdays, dayLong } from '@core/utils/date.util';
import { ToastService } from '@core/services/toast.service';

interface DayForm {
  is_remote: FormControl<boolean>;
  start_time: FormControl<string>;
  end_time: FormControl<string>;
}
type ScheduleForm = Record<DayKey, FormGroup<DayForm>>;

@Component({
  selector: 'cg-onboarding-schedule',
  standalone: true,
  imports: [ReactiveFormsModule, ProgressBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white flex flex-col safe-top safe-bottom">
      <div class="container-page px-4 pt-6 pb-12 flex-1 flex flex-col">
        @if (joining()) {
          <p class="text-xs text-gray-500">Último paso para unirte al hogar</p>
        } @else {
          <cg-progress-bar [value]="60" />
          <p class="text-xs text-gray-500 mt-2">Paso 3 de 5</p>
        }

        <h1 class="text-2xl font-medium text-gray-900 mt-4">Tu horario laboral</h1>
        <p class="text-sm text-gray-500 mb-6">Indica tus horas habituales para los días de oficina.</p>

        <form [formGroup]="form" class="space-y-3 flex-1">
          @for (day of weekdays; track day) {
            <div class="card" [formGroupName]="day">
              <div class="flex items-center justify-between mb-3">
                <span class="font-medium">{{ longLabel(day) }}</span>
                <label class="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" formControlName="is_remote" class="w-4 h-4" />
                  Teletrabajo
                </label>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div class="min-w-0">
                  <label class="text-xs text-gray-500" [for]="day + '-start'">Entrada</label>
                  <input [id]="day + '-start'" type="time" class="input mt-0.5 px-2 text-center"
                         formControlName="start_time" />
                </div>
                <div class="min-w-0">
                  <label class="text-xs text-gray-500" [for]="day + '-end'">Salida</label>
                  <input [id]="day + '-end'" type="time" class="input mt-0.5 px-2 text-center"
                         formControlName="end_time" />
                </div>
              </div>
            </div>
          }
        </form>

        <button class="btn-primary w-full mt-6" (click)="submit()" [disabled]="loading()">
          {{ loading() ? 'Guardando…' : 'Siguiente' }}
        </button>
      </div>
    </div>
  `
})
export class OnboardingScheduleComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private household = inject(HouseholdStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly loading = signal(false);
  readonly weekdays: DayKey[] = dayKeysWeekdays();
  readonly joining = signal(this.route.snapshot.queryParamMap.get('joining') === '1');

  readonly form: FormGroup<ScheduleForm>;

  constructor() {
    const controls: Partial<ScheduleForm> = {};
    for (const d of this.weekdays) {
      controls[d] = new FormGroup<DayForm>({
        is_remote: new FormControl(false, { nonNullable: true }),
        start_time: new FormControl('09:00', { nonNullable: true }),
        end_time: new FormControl('18:00', { nonNullable: true })
      });
    }
    this.form = new FormGroup(controls as ScheduleForm);
  }

  async ngOnInit(): Promise<void> {
    await this.household.load();
  }

  longLabel(d: DayKey): string { return dayLong(d); }

  async submit(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    try {
      const value = this.form.getRawValue();
      const toDay = (d: { is_remote: boolean; start_time: string; end_time: string }): WorkSchedule[DayKey] => ({
        location: d.is_remote ? 'home' : 'office',
        start: d.start_time,
        end: d.end_time,
      });
      const schedule: WorkSchedule = {
        mon: toDay(value.mon), tue: toDay(value.tue), wed: toDay(value.wed),
        thu: toDay(value.thu), fri: toDay(value.fri),
        sat: { location: 'off', start: null, end: null },
        sun: { location: 'off', start: null, end: null }
      };
      const res = await this.api.putWorkSchedule(schedule);
      const me = this.auth.currentUser();
      if (me) this.auth.setUser({ ...me, work_schedule: res.work_schedule });
      this.toast.success('Horario guardado');
      void this.router.navigateByUrl(this.joining() ? '/' : '/onboarding/tasks');
    } finally {
      this.loading.set(false);
    }
  }
}
