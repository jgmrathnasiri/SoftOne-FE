import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { environment } from '../environments/environment';
import {
  basicAuthInterceptor,
  unauthorizedLogoutInterceptor
} from './core/auth/basic-auth.interceptor';
import { API_BASE_URL } from './core/auth/tokens';
import { routes } from './app.routes';

function normalizeApiBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([basicAuthInterceptor, unauthorizedLogoutInterceptor])
    ),
    { provide: API_BASE_URL, useValue: normalizeApiBaseUrl(environment.apiBaseUrl) }
  ]
};