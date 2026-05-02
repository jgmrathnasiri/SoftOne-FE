import { InjectionToken } from '@angular/core';

/** API origin only (scheme + host + optional port); no trailing slash. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
