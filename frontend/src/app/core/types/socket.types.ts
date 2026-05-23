import { Category, DayOfWeek, ReassignmentStatus } from './api.types';

export interface SocketEventMap {
  'task:done': TaskDoneEvent;
  'task:undone': TaskUndoneEvent;
  'task:reassign-request': ReassignRequestEvent;
  'task:reassign-response': ReassignResponseEvent;
  'weekly:availability-set': WeeklyAvailabilitySetEvent;
  'weekly:availability-confirmed': WeeklyAvailabilityConfirmedEvent;
  'weekly:proposal-ready': WeeklyProposalReadyEvent;
  'weekly:proposal-confirmed': WeeklyProposalConfirmedEvent;
  'household:member-joined': HouseholdMemberJoinedEvent;
  'presence:online': PresenceOnlineEvent;
  'presence:offline': PresenceOfflineEvent;
}

export interface TaskDoneEvent {
  assignment_id: number;
  task_id: number;
  done_by: number;
  done_at: string;
  day_of_week: DayOfWeek;
  week_start: string;
}

export interface TaskUndoneEvent {
  assignment_id: number;
  week_start: string;
}

export interface ReassignRequestEvent {
  request_id: number;
  assignment_id: number;
  requested_by: number;
  requested_to: number;
  reason: string | null;
  task_name: string;
  category?: Category;
  day_of_week: DayOfWeek;
}

export interface ReassignResponseEvent {
  request_id: number;
  assignment_id: number;
  status: ReassignmentStatus;
  rejection_reason?: string | null;
  new_assigned_to?: number | null;
}

export interface WeeklyAvailabilitySetEvent {
  user_id: number;
  week_start: string;
  office_days: string[];
  confirmed: false;
}

export interface WeeklyAvailabilityConfirmedEvent {
  user_id: number;
  week_start: string;
  both_confirmed: boolean;
}

export interface WeeklyProposalReadyEvent {
  proposal_id: number;
  week_start: string;
  user1_load_score: number;
  user2_load_score: number;
  soft_violations_count: number;
}

export interface WeeklyProposalConfirmedEvent {
  proposal_id: number;
  week_start: string;
  user_id: number;
  both_confirmed: boolean;
  status: string;
}

export interface HouseholdMemberJoinedEvent {
  user_id: number;
  name: string;
  avatar_color: string;
}

export interface PresenceOnlineEvent { user_id: number; }
export interface PresenceOfflineEvent { user_id: number; last_seen_at: string; }

// Cliente → Servidor
export interface PresencePingPayload {}
export interface WeeklyViewingPayload { week_start: string; }
