import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const noAuthGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.currentUser()) auth.bootstrap();
  if (!auth.isAuthenticated()) return true;
  router.navigateByUrl(auth.hasHousehold() ? '/' : '/onboarding/home');
  return false;
};
