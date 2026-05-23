import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { Assignment, AvailabilityWeek, DayWithAssignments, Proposal, WeekDetail } from '../types/api.types';
import { isoWeekStart } from '../utils/date.util';

@Injectable({ providedIn: 'root' })
export class WeekStore {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private _weekStart = signal<string>(isoWeekStart(new Date()));
  private _detail = signal<WeekDetail | null>(null);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  readonly weekStart = this._weekStart.asReadonly();
  readonly detail = this._detail.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly proposal = computed<Proposal | null>(() => this._detail()?.proposal ?? null);
  readonly availability = computed<AvailabilityWeek | null>(() => this._detail()?.availability ?? null);
  readonly days = computed<DayWithAssignments[]>(() => this._detail()?.days ?? []);

  readonly myAssignments = computed<Assignment[]>(() => {
    const me = this.auth.currentUser();
    if (!me) return [];
    return this.days().flatMap(d => d.assignments).filter(a => a.assigned_to === me.id);
  });

  readonly allAssignments = computed<Assignment[]>(() =>
    this.days().flatMap(d => d.assignments)
  );

  setWeekStart(weekStart: string): void {
    if (this._weekStart() === weekStart) return;
    this._weekStart.set(weekStart);
    this._detail.set(null);
  }

  async load(weekStart?: string, force = false): Promise<void> {
    const ws = weekStart ?? this._weekStart();
    if (weekStart && weekStart !== this._weekStart()) {
      this._weekStart.set(ws);
      this._detail.set(null);
    }
    if (!force && this._detail() && this._weekStart() === ws) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      const detail = await this.api.getWeek(ws);
      this._detail.set(detail);
    } catch {
      this._error.set('No se pudo cargar la semana.');
    } finally {
      this._loading.set(false);
    }
  }

  /** Actualiza optimistamente una asignación (done/undone). */
  patchAssignment(id: number, patch: Partial<Assignment>): void {
    const d = this._detail();
    if (!d) return;
    const days = d.days.map(day => ({
      ...day,
      assignments: day.assignments.map(a => a.id === id ? { ...a, ...patch } : a)
    }));
    this._detail.set({ ...d, days });
  }

  setProposal(proposal: Proposal): void {
    const d = this._detail();
    if (!d) return;
    this._detail.set({ ...d, proposal });
  }

  setAvailability(av: AvailabilityWeek): void {
    const d = this._detail();
    if (!d) return;
    this._detail.set({ ...d, availability: av });
  }
}
