import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { BasicAuthSessionService } from './basic-auth-session.service';

export const authGuard: CanActivateFn = () => {
  const session = inject(BasicAuthSessionService);
  const router = inject(Router);
  if (session.hasSession()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const session = inject(BasicAuthSessionService);
  const router = inject(Router);
  if (!session.hasSession()) {
    return true;
  }
  return router.createUrlTree(['/home']);
};
