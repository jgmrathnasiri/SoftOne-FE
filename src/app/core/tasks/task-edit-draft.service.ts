import { Injectable, signal } from '@angular/core';
import type { TaskResponse } from './models/task.model';

/**
 * Passes selected task rows into `/tasks/:id/edit` route (SPA-only; survives refresh intentionally not).
 */
@Injectable({ providedIn: 'root' })
export class TaskEditDraftService {
  private readonly draft = signal<TaskResponse | null>(null);

  setEditDraft(task: TaskResponse): void {
    this.draft.set(task);
  }

  /**
   * Returns the drafted task once if its id matches the route segment; clears the stash.
   */
  consumeDraftForTaskId(routeTaskId: string): TaskResponse | null {
    const t = this.draft();
    this.draft.set(null);
    if (t?.id !== routeTaskId) {
      return null;
    }
    return t;
  }
}
