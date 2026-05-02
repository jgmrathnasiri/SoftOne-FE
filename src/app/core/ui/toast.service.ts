import { Injectable, signal } from '@angular/core';

/**
 * Lightweight app-wide toast; host lives in {@link AppComponent} so messages survive router navigations.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  /** Current toast text; `null` when hidden. */
  readonly message = signal<string | null>(null);

  show(text: string, durationMs = 4000): void {
    if (this.dismissTimer !== null) {
      clearTimeout(this.dismissTimer);
    }
    this.message.set(text);
    this.dismissTimer = setTimeout(() => {
      this.message.set(null);
      this.dismissTimer = null;
    }, durationMs);
  }

  dismiss(): void {
    if (this.dismissTimer !== null) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    this.message.set(null);
  }
}
