import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { LoginRequest, LoginResponse } from '../models/login.models';
import { API_BASE_URL } from '../tokens';

/**
 * Thin HTTP client for SoftOne authentication endpoints.
 * Prefer {@link AuthService} from UI / orchestration layers.
 */
@Injectable({ providedIn: 'root' })
export class AuthHttpService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  login(request: LoginRequest): Observable<LoginResponse> {
    const url = `${this.apiBaseUrl}/auth/login`;
    return this.http.post<LoginResponse>(url, request);
  }
}
