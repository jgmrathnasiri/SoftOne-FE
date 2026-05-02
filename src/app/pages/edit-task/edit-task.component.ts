import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import type { TaskResponse } from '../../core/tasks/models/task.model';
import type { UpdateTaskRequest } from '../../core/tasks/models/update-task-request.model';
import { TaskEditDraftService } from '../../core/tasks/task-edit-draft.service';
import { TasksService } from '../../core/tasks/services/tasks.service';
import {
  dueDateNotBeforeToday,
  todayIsoDateLocal
} from '../../core/tasks/validators/due-date-not-before-today.validator';
import { AuthService } from '../../core/auth/services/auth.service';
import { ToastService } from '../../core/ui/toast.service';

/** SoftOne-BE `TaskStatus.Completed`. */
const TASK_COMPLETED = 2;

function toDateInputValue(isoLike: string | null): string {
  if (!isoLike?.trim()) {
    return '';
  }
  const m = isoLike.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? '';
}

@Component({
  selector: 'app-edit-task',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './edit-task.component.html',
  styleUrl: './edit-task.component.scss'
})
export class EditTaskComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly tasksService = inject(TasksService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly draftService = inject(TaskEditDraftService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private taskId!: string;
  private taskRow!: TaskResponse;

  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);

  get minDueDateIso(): string {
    return todayIsoDateLocal();
  }

  readonly statusOptions = [
    { value: 0, label: 'Pending' },
    { value: 1, label: 'In progress' },
    { value: 2, label: 'Completed' }
  ] as const;

  readonly priorityOptions = [
    { value: 0, label: 'Low' },
    { value: 1, label: 'Medium' },
    { value: 2, label: 'High' }
  ] as const;

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    status: [0 as number],
    priority: [0 as number],
    dueDate: ['', [Validators.required, dueDateNotBeforeToday()]]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.toast.show('Missing task.');
      void this.router.navigate(['/home']);
      return;
    }

    const draft = this.draftService.consumeDraftForTaskId(id);
    if (!draft) {
      this.toast.show('Open edit from your task list.');
      void this.router.navigate(['/home']);
      return;
    }

    if (draft.status === TASK_COMPLETED) {
      this.toast.show('Completed tasks cannot be edited.');
      void this.router.navigate(['/home']);
      return;
    }

    this.taskId = id;
    this.taskRow = draft;

    this.form.patchValue({
      title: draft.title,
      description: draft.description ?? '',
      status: draft.status,
      priority: draft.priority,
      dueDate: toDateInputValue(draft.dueDate)
    });
  }

  onSubmit(): void {
    this.formError.set(null);
    this.form.controls.title.markAsTouched();
    this.form.controls.dueDate.markAsTouched();

    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();
    const payload: UpdateTaskRequest = {
      title: raw.title.trim(),
      description: raw.description.trim() ? raw.description.trim() : null,
      status: Number(raw.status),
      priority: Number(raw.priority),
      dueDate: raw.dueDate.trim(),
      userId: this.taskRow.userId
    };

    // PUT `/tasks/{id}` → SoftOne-BE UpdateTaskAsync.
    this.submitting.set(true);
    this.tasksService
      .update(this.taskId, payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false))
      )
      .subscribe({
        next: () => {
          this.toast.show(`"${payload.title.trim()}" was updated.`);
          void this.router.navigate(['/home']);
        },
        error: (err: unknown) => {
          this.formError.set(this.describeUpdateError(err));
        }
      });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  private describeUpdateError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Unable to reach the API.';
      }
      if (error.status === 404) {
        return 'That task could not be found.';
      }
    }
    return 'Could not save changes. Try again.';
  }
}
