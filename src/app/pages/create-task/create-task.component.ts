import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { BasicAuthSessionService } from '../../core/auth/basic-auth-session.service';
import { AuthService } from '../../core/auth/services/auth.service';
import type { CreateTaskRequest } from '../../core/tasks/models/create-task-request.model';
import { TasksService } from '../../core/tasks/services/tasks.service';
import { ToastService } from '../../core/ui/toast.service';
import {
  dueDateNotBeforeToday,
  todayIsoDateLocal
} from '../../core/tasks/validators/due-date-not-before-today.validator';


const PENDING_TASK_STATUS = 0;

@Component({
  selector: 'app-create-task',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-task.component.html',
  styleUrl: './create-task.component.scss'
})
export class CreateTaskComponent {
  private readonly fb = inject(FormBuilder);
  private readonly tasksService = inject(TasksService);
  private readonly session = inject(BasicAuthSessionService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);


  get minDueDateIso(): string {
    return todayIsoDateLocal();
  }

  readonly priorityOptions = [
    { value: 0, label: 'Low' },
    { value: 1, label: 'Medium' },
    { value: 2, label: 'High' }
  ] as const;

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    priority: [0 as number],
    dueDate: ['', [Validators.required, dueDateNotBeforeToday()]]
  });

  onSubmit(): void {
    this.formError.set(null);
    this.form.controls.title.markAsTouched();
    this.form.controls.dueDate.markAsTouched();
    if (this.form.invalid) {
      return;
    }

    const userId = this.session.getUserId();
    if (!userId) {
      void this.router.navigate(['/login']);
      return;
    }

    const raw = this.form.getRawValue();
    const due = raw.dueDate.trim();
    const payload: CreateTaskRequest = {
      title: raw.title.trim(),
      description: raw.description.trim() ? raw.description.trim() : null,
      status: PENDING_TASK_STATUS,
      priority: Number(raw.priority),
      dueDate: due,
      userId
    };

    this.submitting.set(true);
    // POST /tasks maps to SoftOne-BE CreateTaskAsync.
    this.tasksService
      .create(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false))
      )
      .subscribe({
        next: (created) => {
          const label = created.title?.trim() || 'Task';
          this.toast.show(`${label} was created successfully.`);
          void this.router.navigate(['/home']);
        },
        error: (err: unknown) => {
          this.formError.set(this.describeCreateError(err));
        }
      });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  private describeCreateError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Unable to reach the API.';
      }
      if (error.status === 404) {
        return 'Unable to create task — user reference was rejected.';
      }
      if (
        typeof error.error === 'object' &&
        error.error &&
        'errors' in error.error
      ) {
        const errs = (error.error as { errors?: Record<string, string[]> }).errors;
        if (errs) {
          const first = Object.values(errs).flat()[0];
          if (first) {
            return first;
          }
        }
      }
    }
    return 'Could not create the task. Check the form and try again.';
  }
}
