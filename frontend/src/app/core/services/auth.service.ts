import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { SocketService } from './socket.service';
import { AuthResponse, LoginPayload, SignupPayload, User } from '../types/api.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private storage = inject(StorageService);
  private router = inject(Router);
  private socket = inject(SocketService);

  private _accessToken = signal<string | null>(null);
  private _refreshToken = signal<string | null>(null);
  private _currentUser = signal<User | null>(null);

  readonly accessToken = this._accessToken.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this._accessToken() && !!this._currentUser());
  readonly hasHousehold = computed(() => {
    const u = this._currentUser();
    return !!u && u.household_id !== null;
  });

  /** Carga tokens y usuario desde localStorage al arrancar la app. */
  bootstrap(): void {
    const access = this.storage.getAccessToken();
    const refresh = this.storage.getRefreshToken();
    const user = this.storage.getUser<User>();
    if (access) this._accessToken.set(access);
    if (refresh) this._refreshToken.set(refresh);
    if (user) this._currentUser.set(user);
  }

  async login(payload: LoginPayload): Promise<User> {
    const res = await this.api.login(payload);
    this.persist(res);
    this.socket.connect();
    return res.user;
  }

  async signup(payload: SignupPayload): Promise<User> {
    const res = await this.api.signup(payload);
    this.persist(res);
    this.socket.connect();
    return res.user;
  }

  async refresh(): Promise<string | null> {
    const rt = this._refreshToken() ?? this.storage.getRefreshToken();
    if (!rt) return null;
    try {
      const res = await this.api.refresh({ refresh_token: rt });
      this.persist(res);
      return res.access_token;
    } catch {
      this.clearAndRedirect();
      return null;
    }
  }

  async logout(): Promise<void> {
    try { await this.api.logout(); } catch { /* ignore */ }
    this.clearAndRedirect();
  }

  /** Limpieza local (sin llamar al backend). Útil ante 401 incurable. */
  clearAndRedirect(): void {
    this._accessToken.set(null);
    this._refreshToken.set(null);
    this._currentUser.set(null);
    this.storage.clearAuth();
    this.socket.disconnect();
    this.router.navigateByUrl('/login');
  }

  setUser(user: User): void {
    this._currentUser.set(user);
    this.storage.setUser(user);
  }

  private persist(res: AuthResponse): void {
    this._accessToken.set(res.access_token);
    this._refreshToken.set(res.refresh_token);
    this._currentUser.set(res.user);
    this.storage.setAccessToken(res.access_token);
    this.storage.setRefreshToken(res.refresh_token);
    this.storage.setUser(res.user);
  }
}
