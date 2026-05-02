import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { BasicAuthSessionService } from '../basic-auth-session.service';
import type { LoginRequest, LoginResponse } from '../models/login.models';
import { AuthHttpService } from './auth-http.service';

/**
 * Authentication use cases (credentials shaping, delegation to HTTP layer).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authHttp = inject(AuthHttpService);
  private readonly session = inject(BasicAuthSessionService);

  login(username: string, password: string): Observable<LoginResponse> {
    const trimmed = username.trim();
    const payload: LoginRequest = {
      username: trimmed,
      password
    };

    return this.authHttp.login(payload).pipe(
      tap((res) => {
        if (res.isAuthenticated && res.userId) {
          this.session.setCredentials(trimmed, password, res.userId);
        }
      })
    );
  }

  logout(): void {
    this.session.clear();
  }
}
