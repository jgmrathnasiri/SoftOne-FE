import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import type { TaskResponse } from '../../core/tasks/models/task.model';
import type { UpdateTaskRequest } from '../../core/tasks/models/update-task-request.model';
import { TasksService } from '../../core/tasks/services/tasks.service';
import { TaskEditDraftService } from '../../core/tasks/task-edit-draft.service';
import { ToastService } from '../../core/ui/toast.service';

/** SoftOne-BE `TaskStatus.Completed`. */
const TASK_COMPLETED = 2;

/** Local-calendar start/end of `yyyy-MM-dd` for filtering `createdAt`. */
function localDayStartMs(yyyyMmDd: string): number {
  const parts = yyyyMmDd.split('-').map((p) => Number(p));
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return Number.NaN;
  }
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function localDayEndMs(yyyyMmDd: string): number {
  const parts = yyyyMmDd.split('-').map((p) => Number(p));
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return Number.NaN;
  }
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

function createdAtMs(isoLike: string): number {
  return new Date(isoLike).getTime();
}

/** Local midnight for the calendar day of an API due date (ISO or date-only). */
function dueDateLocalStartMs(dueDate: string): number | null {
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
}

function todayLocalStartMs(): number {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0, 0).getTime();
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly tasksService = inject(TasksService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly editDraft = inject(TaskEditDraftService);
  private readonly toast = inject(ToastService);
  private loadSubscription?: Subscription;

  readonly tasks = signal<TaskResponse[] | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly loading = signal(false);
  /** Exposed for template comparison with `task.status`. */
  readonly taskCompletedStatus = TASK_COMPLETED;

  private readonly mutatingTaskIds = signal<ReadonlySet<string>>(new Set());

  readonly filterStatusSel = signal<string>('all');
  readonly filterPrioritySel = signal<string>('all');
  readonly filterCreatedFrom = signal<string>('');
  readonly filterCreatedTo = signal<string>('');

  readonly filtersActive = computed(
    () =>
      this.filterStatusSel() !== 'all' ||
      this.filterPrioritySel() !== 'all' ||
      this.filterCreatedFrom().trim() !== '' ||
      this.filterCreatedTo().trim() !== ''
  );

  readonly filteredTasks = computed(() => {
    const list = this.tasks();
    if (!list?.length) {
      return [];
    }

    let out = [...list];
    const st = this.filterStatusSel();
    if (st !== 'all') {
      const n = Number(st);
      out = out.filter((t) => t.status === n);
    }

    const pr = this.filterPrioritySel();
    if (pr !== 'all') {
      const n = Number(pr);
      out = out.filter((t) => t.priority === n);
    }

    const fromStr = this.filterCreatedFrom().trim();
    const toStr = this.filterCreatedTo().trim();

    if (fromStr) {
      const fromMs = localDayStartMs(fromStr);
      out = Number.isFinite(fromMs)
        ? out.filter((t) => {
            const c = createdAtMs(t.createdAt);
            return !Number.isNaN(c) && c >= fromMs;
          })
        : out;
    }

    if (toStr) {
      const toMs = localDayEndMs(toStr);
      out = Number.isFinite(toMs)
        ? out.filter((t) => {
            const c = createdAtMs(t.createdAt);
            return !Number.isNaN(c) && c <= toMs;
          })
        : out;
    }

    return out;
  });

  readonly deleteDialogTask = signal<TaskResponse | null>(null);
  readonly deleteDialogSubmitting = signal(false);

  @HostListener('document:keydown.escape')
  onEscapeCloseDeleteDialog(): void {
    if (this.deleteDialogTask() && !this.deleteDialogSubmitting()) {
      this.cancelDeleteDialog();
    }
  }

  /** Maps to SoftOne-BE Domain `TaskStatus` enum (int-backed). */
  statusText(code: number): string {
    switch (code) {
      case 0:
        return 'Pending';
      case 1:
        return 'In progress';
      case 2:
        return 'Completed';
      default:
        return 'Unknown';
    }
  }

  statusChipClass(code: number): string {
    switch (code) {
      case 0:
        return 'chip chip-status-pending';
      case 1:
        return 'chip chip-status-progress';
      case 2:
        return 'chip chip-status-completed';
      default:
        return 'chip chip-status-unknown';
    }
  }

  /** Maps to SoftOne-BE Domain `TaskPriority` enum (int-backed). */
  priorityText(code: number): string {
    switch (code) {
      case 0:
        return 'Low';
      case 1:
        return 'Medium';
      case 2:
        return 'High';
      default:
        return 'Unknown';
    }
  }

  priorityChipClass(code: number): string {
    switch (code) {
      case 0:
        return 'chip chip-priority-low';
      case 1:
        return 'chip chip-priority-medium';
      case 2:
        return 'chip chip-priority-high';
      default:
        return 'chip chip-priority-unknown';
    }
  }

  taskCount(): number {
    return this.tasks()?.length ?? 0;
  }

  setStatusFilter(event: Event): void {
    this.filterStatusSel.set((event.target as HTMLSelectElement).value);
  }

  setPriorityFilter(event: Event): void {
    this.filterPrioritySel.set((event.target as HTMLSelectElement).value);
  }

  setCreatedFrom(event: Event): void {
    this.filterCreatedFrom.set((event.target as HTMLInputElement).value);
  }

  setCreatedTo(event: Event): void {
    this.filterCreatedTo.set((event.target as HTMLInputElement).value);
  }

  clearFilters(): void {
    this.filterStatusSel.set('all');
    this.filterPrioritySel.set('all');
    this.filterCreatedFrom.set('');
    this.filterCreatedTo.set('');
  }

  isTaskMutating(taskId: string): boolean {
    return this.mutatingTaskIds().has(taskId);
  }

  editTooltip(task: TaskResponse): string {
    return task.status === TASK_COMPLETED
      ? 'Completed tasks cannot be edited'
      : 'Edit task';
  }

  deleteTooltip(task: TaskResponse): string {
    return task.status === TASK_COMPLETED
      ? 'Completed tasks cannot be deleted'
      : 'Delete task';
  }

  /** True when incomplete and the due calendar day (local) is before today. */
  isTaskOverdue(task: TaskResponse): boolean {
    if (task.status === TASK_COMPLETED) {
      return false;
    }
    if (!task.dueDate?.trim()) {
      return false;
    }
    const dueMs = dueDateLocalStartMs(task.dueDate);
    if (dueMs === null) {
      return false;
    }
    return dueMs < todayLocalStartMs();
  }

  openEdit(task: TaskResponse): void {
    if (task.status === TASK_COMPLETED) {
      return;
    }
    this.editDraft.setEditDraft(task);
    void this.router.navigate(['/tasks', task.id, 'edit']);
  }

  onCompleteToggle(task: TaskResponse): void {
    if (task.status === TASK_COMPLETED) {
      return;
    }

    const nextStatus = TASK_COMPLETED;

    const previous = { ...task };
    const optimistic: TaskResponse = { ...task, status: nextStatus };
    this.replaceTaskInList(optimistic);
    const titleLabel = task.title.trim() || 'Task';
    this.toast.show(`"${titleLabel}" marked complete.`);

    const payload: UpdateTaskRequest = {
      title: task.title,
      description: task.description ?? null,
      status: nextStatus,
      priority: task.priority,
      dueDate: task.dueDate,
      userId: task.userId
    };

    this.beginMutation(task.id);
    this.tasksService
      .update(task.id, payload)
      .pipe(finalize(() => this.endMutation(task.id)))
      .subscribe({
        next: (updated) => this.replaceTaskInList(updated),
        error: () => {
          this.replaceTaskInList(previous);
          this.toast.show('Could not update completion. Try again.');
        }
      });
  }

  openDeleteDialog(task: TaskResponse): void {
    if (task.status === TASK_COMPLETED) {
      return;
    }
    this.deleteDialogTask.set(task);
  }

  cancelDeleteDialog(): void {
    if (this.deleteDialogSubmitting()) {
      return;
    }
    this.deleteDialogTask.set(null);
  }

  confirmDeleteFromDialog(): void {
    const task = this.deleteDialogTask();
    if (!task || this.deleteDialogSubmitting()) {
      return;
    }

    this.deleteDialogSubmitting.set(true);
    this.beginMutation(task.id);
    this.tasksService
      .delete(task.id)
      .pipe(
        finalize(() => {
          this.endMutation(task.id);
          this.deleteDialogSubmitting.set(false);
        })
      )
      .subscribe({
        next: () => {
          this.deleteDialogTask.set(null);
          this.removeTaskFromList(task.id);
          this.toast.show('Task deleted.');
        },
        error: () => {
          this.toast.show('Could not delete the task.');
        }
      });
  }

  private beginMutation(taskId: string): void {
    this.mutatingTaskIds.update((prev) => new Set([...prev, taskId]));
  }

  private endMutation(taskId: string): void {
    this.mutatingTaskIds.update((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  }

  private replaceTaskInList(updated: TaskResponse): void {
    this.tasks.update((list) => {
      if (!list) {
        return list;
      }
      return list.map((t) => (t.id === updated.id ? updated : t));
    });
  }

  private removeTaskFromList(taskId: string): void {
    this.tasks.update((list) => {
      if (!list) {
        return list;
      }
      return list.filter((t) => t.id !== taskId);
    });
  }

  ngOnInit(): void {
    this.reload();
  }

  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
  }

  reload(): void {
    this.loadSubscription?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(null);
    this.loadSubscription = this.tasksService
      .loadMine()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (list) => this.tasks.set(list),
        error: (err: unknown) => {
          this.loadError.set(this.describeLoadFailure(err));
        }
      });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  private describeLoadFailure(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Unable to reach the API. Confirm the backend is running, base URL matches, and HTTPS/proxy setup is correct.';
      }
      return error.message || `Request failed (${error.status}).`;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unable to load tasks.';
  }
}
