import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { BasicAuthSessionService } from './basic-auth-session.service';

/** UTF-8–safe-ish Basic token for typical ASCII passwords (matches browser `btoa` expectations). */
function basicToken(username: string, password: string): string {
  return btoa(`${username}:${password}`);
}

/** Adds `Authorization: Basic` for SoftOne APIs once a tab session exists. Skips `/auth/login`. */
export const basicAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/auth/login')) {
    return next(req);
  }

  const session = inject(BasicAuthSessionService).getCredentials();
  if (!session) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Basic ${basicToken(session.username, session.password)}`
    }
  });

  return next(authReq);
};

/** Clears stale sessions when the API returns 401 from a protected call. */
export const unauthorizedLogoutInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const session = inject(BasicAuthSessionService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.includes('/auth/login')
      ) {
        session.clear();
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
