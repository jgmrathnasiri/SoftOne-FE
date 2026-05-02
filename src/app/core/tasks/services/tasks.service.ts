import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { CreateTaskRequest } from '../models/create-task-request.model';
import type { TaskResponse } from '../models/task.model';
import type { UpdateTaskRequest } from '../models/update-task-request.model';
import { TasksHttpService } from './tasks-http.service';

/** Task use cases orchestrated from the UI. */
@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly tasksHttp = inject(TasksHttpService);

  /** Maps to SoftOne-BE GET `/tasks` (GetTasksForCurrentUserAsync). */
  loadMine(): Observable<TaskResponse[]> {
    return this.tasksHttp.getTasksForCurrentUser();
  }

  create(request: CreateTaskRequest): Observable<TaskResponse> {
    return this.tasksHttp.createTask(request);
  }

  /** SoftOne-BE `UpdateTaskAsync` via PUT `/tasks/{id}`. */
  update(taskId: string, request: UpdateTaskRequest): Observable<TaskResponse> {
    return this.tasksHttp.updateTask(taskId, request);
  }

  /** SoftOne-BE `DeleteTaskAsync` via DELETE `/tasks/{id}` (soft delete server-side). */
  delete(taskId: string): Observable<void> {
    return this.tasksHttp.deleteTask(taskId);
  }
}
