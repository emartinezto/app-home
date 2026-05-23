import { Injectable } from '@angular/core';

const ACCESS_KEY = 'cg.access_token';
const REFRESH_KEY = 'cg.refresh_token';
const USER_KEY = 'cg.user';

@Injectable({ providedIn: 'root' })
export class StorageService {
  getAccessToken(): string | null {
    return this.get(ACCESS_KEY);
  }
  setAccessToken(token: string): void {
    this.set(ACCESS_KEY, token);
  }
  getRefreshToken(): string | null {
    return this.get(REFRESH_KEY);
  }
  setRefreshToken(token: string): void {
    this.set(REFRESH_KEY, token);
  }
  getUser<T>(): T | null {
    const raw = this.get(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  }
  setUser<T>(user: T): void {
    this.set(USER_KEY, JSON.stringify(user));
  }
  clearAuth(): void {
    this.remove(ACCESS_KEY);
    this.remove(REFRESH_KEY);
    this.remove(USER_KEY);
  }

  private get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  private set(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* private mode */ }
  }
  private remove(key: string): void {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  }
}
