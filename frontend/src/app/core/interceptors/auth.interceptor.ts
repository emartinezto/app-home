import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { StorageService } from '../services/storage.service';

const SKIP_AUTH_URLS = ['/auth/login', '/auth/signup', '/auth/refresh'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);
  if (SKIP_AUTH_URLS.some(s => req.url.includes(s))) {
    return next(req);
  }
  const token = storage.getAccessToken();
  if (!token) return next(req);
  const cloned = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
  return next(cloned);
};
