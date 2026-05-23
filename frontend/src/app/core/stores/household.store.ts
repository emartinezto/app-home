import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from '../services/api.service';
import { Household, HouseholdMember } from '../types/api.types';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class HouseholdStore {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private _household = signal<Household | null>(null);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  readonly household = this._household.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly members = computed<HouseholdMember[]>(() => this._household()?.members ?? []);
  readonly partner = computed<HouseholdMember | null>(() => {
    const me = this.auth.currentUser();
    if (!me) return null;
    return this.members().find(m => m.id !== me.id) ?? null;
  });
  readonly meAsMember = computed<HouseholdMember | null>(() => {
    const me = this.auth.currentUser();
    if (!me) return null;
    return this.members().find(m => m.id === me.id) ?? null;
  });

  async load(force = false): Promise<void> {
    if (!force && this._household()) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.getMyHousehold();
      this._household.set(res.household);
    } catch {
      this._error.set('No se pudo cargar el hogar.');
    } finally {
      this._loading.set(false);
    }
  }

  setHousehold(h: Household | null): void {
    this._household.set(h);
  }

  upsertMember(member: HouseholdMember): void {
    const h = this._household();
    if (!h) return;
    const existing = h.members.findIndex(m => m.id === member.id);
    const next = [...h.members];
    if (existing >= 0) next[existing] = { ...next[existing], ...member };
    else next.push(member);
    this._household.set({ ...h, members: next });
  }

  async regenerateInviteCode(): Promise<string | null> {
    try {
      const res = await this.api.regenerateInviteCode();
      const h = this._household();
      if (h) this._household.set({ ...h, invite_code: res.invite_code });
      return res.invite_code;
    } catch {
      return null;
    }
  }
}
