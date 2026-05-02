import { HttpErrorResponse } from '@angular/common/http';
import type { HttpValidationProblemDetails } from './models/login.models';

export function resolveLoginErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Something went wrong. Please try again.';
  }

  if (error.status === 401) {
    return 'Invalid username or password.';
  }

  if (error.status === 400 && error.error && typeof error.error === 'object') {
    const body = error.error as HttpValidationProblemDetails;
    if (body.errors && typeof body.errors === 'object') {
      const messages = Object.values(body.errors).flat();
      if (messages.length > 0) {
        return messages[0];
      }
    }
    if (typeof body.title === 'string') {
      return body.title;
    }
  }

  if (error.status === 0) {
    return 'Unable to reach the server. Confirm the API is running and that CORS is configured.';
  }

  return error.message || 'Something went wrong. Please try again.';
}
