import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';
import { ApiError } from '../types/api.types';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';
import { ApiService } from '../services/api.service';
import { SocketService } from '../services/socket.service';

const SKIP_TOAST_URLS = ['/auth/login', '/auth/signup', '/auth/refresh'];

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);
  const toast = inject(ToastService);
  const router = inject(Router);
  const api = inject(ApiService);
  const socket = inject(SocketService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const body = (err.error ?? {}) as Partial<ApiError>;
      const code = body.error;

      if (err.status === 401 && code === 'TOKEN_EXPIRED' && !req.url.includes('/auth/refresh')) {
        const refresh = storage.getRefreshToken();
        if (!refresh) {
          handleHardLogout(storage, router, socket);
          return throwError(() => err);
        }
        return from(api.refresh({ refresh_token: refresh })).pipe(
          switchMap((res) => {
            storage.setAccessToken(res.access_token);
            storage.setRefreshToken(res.refresh_token);
            storage.setUser(res.user);
            socket.reconnectWithFreshToken();
            const retried: HttpRequest<unknown> = req.clone({
              setHeaders: { Authorization: `Bearer ${res.access_token}` }
            });
            return next(retried);
          }),
          catchError(() => {
            handleHardLogout(storage, router, socket);
            return throwError(() => err) as Observable<never>;
          })
        );
      }

      if (err.status === 401) {
        handleHardLogout(storage, router, socket);
        return throwError(() => err);
      }

      if (!SKIP_TOAST_URLS.some(s => req.url.includes(s))) {
        toast.errorCode(code, body.message);
      }
      return throwError(() => err);
    })
  );
};

function handleHardLogout(storage: StorageService, router: Router, socket: SocketService): void {
  storage.clearAuth();
  socket.disconnect();
  router.navigateByUrl('/login');
}
