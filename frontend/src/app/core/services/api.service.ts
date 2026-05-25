import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import {
  Assignment, AuthResponse, AvailabilityWeek, BulkActivatePayload,
  CreateHouseholdPayload, DayKey, Household, HouseholdSettings, JoinHouseholdPayload,
  LoadStats, LoginPayload, Proposal, PushSubscriptionPayload, ReassignmentRequest,
  ReassignmentRequestPayload, RefreshPayload, RejectReassignmentPayload,
  SetAvailabilityPayload, SignupPayload, Task, TaskTemplate, User, WeekDetail, WorkSchedule
} from '../types/api.types';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ── Auth ────────────────────────────────────────────────────────────────
  signup(payload: SignupPayload): Promise<AuthResponse> {
    return firstValueFrom(this.http.post<AuthResponse>(`${this.base}/auth/signup`, payload));
  }
  login(payload: LoginPayload): Promise<AuthResponse> {
    return firstValueFrom(this.http.post<AuthResponse>(`${this.base}/auth/login`, payload));
  }
  refresh(payload: RefreshPayload): Promise<AuthResponse> {
    return firstValueFrom(this.http.post<AuthResponse>(`${this.base}/auth/refresh`, payload));
  }
  logout(): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/auth/logout`, {}));
  }
  logoutAll(): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/auth/logout-all`, {}));
  }

  // ── Households ──────────────────────────────────────────────────────────
  createHousehold(payload: CreateHouseholdPayload): Promise<{ household: Household }> {
    return firstValueFrom(this.http.post<{ household: Household }>(`${this.base}/households`, payload));
  }
  joinHousehold(payload: JoinHouseholdPayload): Promise<{ household: Household }> {
    return firstValueFrom(this.http.post<{ household: Household }>(`${this.base}/households/join`, payload));
  }
  getMyHousehold(): Promise<{ household: Household }> {
    return firstValueFrom(this.http.get<{ household: Household }>(`${this.base}/households/me`));
  }
  regenerateInviteCode(): Promise<{ invite_code: string }> {
    return firstValueFrom(this.http.post<{ invite_code: string }>(`${this.base}/households/me/invite-code/regenerate`, {}));
  }

  partnerResetPassword(newPassword: string): Promise<{ partner_id: number; partner_name: string }> {
    return firstValueFrom(this.http.post<{ partner_id: number; partner_name: string }>(
      `${this.base}/users/me/partner-reset`,
      { new_password: newPassword }
    ));
  }

  // ── Users ───────────────────────────────────────────────────────────────
  getMe(): Promise<{ user: User }> {
    return firstValueFrom(this.http.get<{ user: User }>(`${this.base}/users/me`));
  }
  patchMe(patch: Partial<Pick<User, 'name' | 'avatar_color'>>): Promise<{ user: User }> {
    return firstValueFrom(this.http.patch<{ user: User }>(`${this.base}/users/me`, patch));
  }
  putWorkSchedule(schedule: WorkSchedule): Promise<{ work_schedule: WorkSchedule }> {
    return firstValueFrom(this.http.put<{ work_schedule: WorkSchedule }>(`${this.base}/users/me/work-schedule`, schedule));
  }
  addPushSubscription(payload: PushSubscriptionPayload): Promise<{ id: number }> {
    return firstValueFrom(this.http.post<{ id: number }>(`${this.base}/users/me/push-subscriptions`, payload));
  }
  removePushSubscription(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/users/me/push-subscriptions/${id}`));
  }
  deleteMe(): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/users/me`));
  }

  // ── Tasks ───────────────────────────────────────────────────────────────
  getTaskTemplates(): Promise<{ templates: TaskTemplate[] }> {
    return firstValueFrom(this.http.get<{ templates: TaskTemplate[] }>(`${this.base}/task-templates`));
  }
  getTasks(): Promise<{ tasks: Task[] }> {
    return firstValueFrom(this.http.get<{ tasks: Task[] }>(`${this.base}/tasks`));
  }
  createTask(task: Partial<Task>): Promise<{ task: Task }> {
    return firstValueFrom(this.http.post<{ task: Task }>(`${this.base}/tasks`, task));
  }
  patchTask(id: number, patch: Partial<Task>): Promise<{ task: Task }> {
    return firstValueFrom(this.http.patch<{ task: Task }>(`${this.base}/tasks/${id}`, patch));
  }
  deleteTask(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/tasks/${id}`));
  }
  bulkActivate(payload: BulkActivatePayload): Promise<{ tasks: Task[] }> {
    return firstValueFrom(this.http.post<{ tasks: Task[] }>(`${this.base}/tasks/bulk-activate`, payload));
  }

  // ── Weeks ───────────────────────────────────────────────────────────────
  async getAvailability(weekStart: string): Promise<AvailabilityWeek> {
    const raw = await firstValueFrom(this.http.get<{
      week_start: string;
      availability: Record<string, { office_days: string[]; confirmed: boolean; confirmed_at?: string | null }>;
    }>(`${this.base}/weeks/${weekStart}/availability`));
    const entries = Object.entries(raw.availability ?? {}).map(([uid, v]) => ({
      user_id: Number(uid),
      week_start: raw.week_start,
      office_days: (v.office_days ?? []) as DayKey[],
      confirmed: !!v.confirmed,
      confirmed_at: v.confirmed_at ?? null,
    }));
    return {
      week_start: raw.week_start,
      entries,
      both_confirmed: entries.length >= 2 && entries.every(e => e.confirmed),
    };
  }
  setMyAvailability(weekStart: string, payload: SetAvailabilityPayload) {
    return firstValueFrom(this.http.put<{ user_id: number; week_start: string; office_days: string[]; confirmed: boolean }>(
      `${this.base}/weeks/${weekStart}/availability/me`, payload
    ));
  }
  confirmMyAvailability(weekStart: string) {
    return firstValueFrom(this.http.post<{ confirmed: boolean }>(`${this.base}/weeks/${weekStart}/availability/me/confirm`, {}));
  }
  getWeek(weekStart: string): Promise<WeekDetail> {
    return firstValueFrom(this.http.get<WeekDetail>(`${this.base}/weeks/${weekStart}`));
  }
  generateProposal(weekStart: string): Promise<{ proposal: Proposal; assignments: Assignment[] }> {
    return firstValueFrom(this.http.post<{ proposal: Proposal; assignments: Assignment[] }>(
      `${this.base}/weeks/${weekStart}/proposal/generate`, {}
    ));
  }
  confirmProposal(weekStart: string): Promise<{ proposal: Proposal; both_confirmed: boolean }> {
    return firstValueFrom(this.http.post<{ proposal: Proposal; both_confirmed: boolean }>(
      `${this.base}/weeks/${weekStart}/proposal/confirm`, {}
    ));
  }
  getAssignments(weekStart: string): Promise<{ assignments: Assignment[] }> {
    return firstValueFrom(this.http.get<{ assignments: Assignment[] }>(`${this.base}/weeks/${weekStart}/assignments`));
  }
  createAssignment(weekStart: string, body: Partial<Assignment>): Promise<{ assignment: Assignment }> {
    return firstValueFrom(this.http.post<{ assignment: Assignment }>(`${this.base}/weeks/${weekStart}/assignments`, body));
  }

  // ── Assignments ─────────────────────────────────────────────────────────
  markDone(id: number) {
    return firstValueFrom(this.http.patch<{ id: number; is_done: boolean; done_at: string; done_by: number }>(
      `${this.base}/assignments/${id}/done`, {}
    ));
  }
  markUndone(id: number) {
    return firstValueFrom(this.http.patch<{ id: number; is_done: boolean }>(`${this.base}/assignments/${id}/undone`, {}));
  }
  requestReassignment(assignmentId: number, payload: ReassignmentRequestPayload): Promise<ReassignmentRequest> {
    return firstValueFrom(this.http.post<ReassignmentRequest>(
      `${this.base}/assignments/${assignmentId}/reassignment-requests`, payload
    ));
  }

  // ── Reassignment requests ───────────────────────────────────────────────
  listReassignmentRequests(): Promise<{ requests: ReassignmentRequest[] }> {
    return firstValueFrom(this.http.get<{ requests: ReassignmentRequest[] }>(`${this.base}/reassignment-requests`));
  }
  acceptReassignment(id: number): Promise<ReassignmentRequest> {
    return firstValueFrom(this.http.post<ReassignmentRequest>(`${this.base}/reassignment-requests/${id}/accept`, {}));
  }
  rejectReassignment(id: number, payload: RejectReassignmentPayload): Promise<ReassignmentRequest> {
    return firstValueFrom(this.http.post<ReassignmentRequest>(`${this.base}/reassignment-requests/${id}/reject`, payload));
  }
  cancelReassignment(id: number): Promise<ReassignmentRequest> {
    return firstValueFrom(this.http.post<ReassignmentRequest>(`${this.base}/reassignment-requests/${id}/cancel`, {}));
  }

  // ── Stats ───────────────────────────────────────────────────────────────
  getLoadStats(weeks = 4): Promise<LoadStats> {
    const params = new HttpParams().set('weeks', String(weeks));
    return firstValueFrom(this.http.get<LoadStats>(`${this.base}/stats/load`, { params }));
  }

  // ── Settings ────────────────────────────────────────────────────────────
  getSettings(): Promise<HouseholdSettings> {
    return firstValueFrom(this.http.get<HouseholdSettings>(`${this.base}/settings`));
  }
  patchSettings(patch: Partial<HouseholdSettings>): Promise<HouseholdSettings> {
    return firstValueFrom(this.http.patch<HouseholdSettings>(`${this.base}/settings`, patch));
  }
}
