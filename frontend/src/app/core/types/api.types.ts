export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7; // ISO: 1=Mon, 7=Sun
export type Category = 'hogar' | 'cuidados' | 'perro';
export type Weight = 1 | 2 | 3;
export type Frequency = 'diaria' | 'semanal' | 'quincenal' | 'mensual' | 'puntual';
export type TimeSlot = 'manana' | 'tarde' | 'flexible';

export interface User {
  id: number;
  email: string;
  name: string;
  household_id: number | null;
  avatar_color: string;
  work_schedule?: WorkSchedule | null;
  created_at?: string;
  last_seen_at?: string | null;
}

export type WorkLocation = 'office' | 'home' | 'off';
export interface WorkScheduleDay {
  location: WorkLocation;
  start?: string | null;
  end?: string | null;
}
export type WorkSchedule = Record<DayKey, WorkScheduleDay>;

export interface HouseholdMember {
  id: number;
  name: string;
  avatar_color: string;
  email?: string;
  joined_at?: string;
  last_seen_at?: string | null;
}

export interface Household {
  id: number;
  name: string;
  invite_code?: string;
  members: HouseholdMember[];
  created_at?: string;
}

export interface TaskTemplate {
  id: number;
  name: string;
  category: Category;
  default_weight: Weight;
  default_frequency: Frequency;
  default_time_slot?: TimeSlot;
  icon?: string;
}

export interface Task {
  id: number;
  household_id: number;
  template_id?: number | null;
  name: string;
  category: Category;
  weight: Weight;
  frequency: Frequency;
  time_slot: TimeSlot;
  is_active: boolean;
  is_custom: boolean;
  preferred_days?: DayKey[] | null;
  created_at?: string;
}

export interface Assignment {
  id: number;
  task_id: number;
  task: Task;
  week_start: string;
  day_of_week: DayOfWeek;
  date: string;
  assigned_to: number;
  is_done: boolean;
  done_at: string | null;
  done_by: number | null;
  soft_violation: boolean;
  time_slot: TimeSlot;
}

export interface AvailabilityEntry {
  user_id: number;
  week_start: string;
  office_days: DayKey[];
  confirmed: boolean;
  confirmed_at?: string | null;
}

export interface AvailabilityWeek {
  week_start: string;
  entries: AvailabilityEntry[];
  both_confirmed: boolean;
}

export type ProposalStatus = 'pending_confirmation' | 'confirmed' | 'active' | 'archived';

export interface Proposal {
  id: number;
  week_start: string;
  status: ProposalStatus;
  user1_id: number;
  user2_id: number;
  user1_load_score: number;
  user2_load_score: number;
  load_delta_pct: number;
  soft_violations_count: number;
  generated_at: string;
  user1_confirmed_at?: string | null;
  user2_confirmed_at?: string | null;
}

export interface DayWithAssignments {
  day_of_week: DayOfWeek;
  date: string;
  assignments: Assignment[];
}

export interface WeekDetail {
  week_start: string;
  proposal: Proposal | null;
  availability: AvailabilityWeek;
  days: DayWithAssignments[];
}

export type ReassignmentStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';

export interface ReassignmentRequest {
  id: number;
  assignment_id: number;
  task_name?: string;
  category?: Category;
  day_of_week?: DayOfWeek;
  date?: string;
  requested_by: number;
  requested_to: number;
  reason: string | null;
  rejection_reason: string | null;
  status: ReassignmentStatus;
  created_at: string;
  responded_at?: string | null;
}

export interface LoadStats {
  weeks: Array<{
    week_start: string;
    user1_id: number;
    user2_id: number;
    user1_load: number;
    user2_load: number;
    user1_done: number;
    user2_done: number;
    user1_total: number;
    user2_total: number;
  }>;
  by_category?: Array<{
    category: Category;
    user1_load: number;
    user2_load: number;
  }>;
}

export interface HouseholdSettings {
  household_id: number;
  notify_proposal: boolean;
  notify_reassignment: boolean;
  notify_reminders: boolean;
  reminder_time?: string;
  week_lock_at?: string;
}

// ─── Auth payloads ──────────────────────────────────────────────────────────
export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface LoginPayload { email: string; password: string; }
export interface SignupPayload { email: string; password: string; name: string; }
export interface RefreshPayload { refresh_token: string; }

export interface CreateHouseholdPayload { name: string; }
export interface JoinHouseholdPayload { invite_code: string; }

export interface BulkActivatePayload {
  template_ids: number[];
}

export interface SetAvailabilityPayload {
  office_days: DayKey[];
}

export interface ReassignmentRequestPayload {
  reason?: string;
}

export interface RejectReassignmentPayload {
  rejection_reason: string;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// ─── Errores estandarizados ─────────────────────────────────────────────────
export type ApiErrorCode =
  | 'VALIDATION'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'NO_AUTH'
  | 'NOT_YOUR_HOUSEHOLD'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'HOUSEHOLD_FULL'
  | 'PROPOSAL_ALREADY_ACTIVE'
  | 'AVAILABILITY_NOT_CONFIRMED'
  | 'ALREADY_DONE'
  | 'WEEK_ALREADY_LOCKED'
  | 'PENDING_REQUEST_EXISTS'
  | 'TOO_MANY_ATTEMPTS'
  | 'UNKNOWN';

export interface ApiError {
  error: ApiErrorCode;
  message?: string;
  details?: Record<string, unknown>;
}
