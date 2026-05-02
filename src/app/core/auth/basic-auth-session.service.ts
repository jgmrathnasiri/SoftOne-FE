import { Injectable } from '@angular/core';

const USER_KEY = 'softone_basic_username';
const PASS_KEY = 'softone_basic_password';
const USER_ID_KEY = 'softone_user_id';

/**
 * Holds username/password after login so {@link basicAuthInterceptor} can call protected APIs (SoftOne-BE Basic auth).
 * Stored in {@link sessionStorage} only for the browser tab/session.
 */
@Injectable({ providedIn: 'root' })
export class BasicAuthSessionService {
  setCredentials(username: string, password: string, userId: string): void {
    sessionStorage.setItem(USER_KEY, username);
    sessionStorage.setItem(PASS_KEY, password);
    sessionStorage.setItem(USER_ID_KEY, userId);
  }

  clear(): void {
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(PASS_KEY);
    sessionStorage.removeItem(USER_ID_KEY);
  }

  getUserId(): string | null {
    return sessionStorage.getItem(USER_ID_KEY);
  }

  getCredentials(): { username: string; password: string } | null {
    const username = sessionStorage.getItem(USER_KEY);
    const password = sessionStorage.getItem(PASS_KEY);
    const userId = sessionStorage.getItem(USER_ID_KEY);
    if (username === null || password === null || userId === null) {
      return null;
    }
    return { username, password };
  }

  hasSession(): boolean {
    return this.getCredentials() !== null;
  }
}
