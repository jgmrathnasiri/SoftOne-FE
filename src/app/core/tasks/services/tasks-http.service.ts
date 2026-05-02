import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { CreateTaskRequest } from '../models/create-task-request.model';
import type { TaskResponse } from '../models/task.model';
import type { UpdateTaskRequest } from '../models/update-task-request.model';
import { API_BASE_URL } from '../../auth/tokens';

/**
 * Thin HTTP client for `/tasks`. Uses Basic auth header from interceptors once session exists.
 */
@Injectable({ providedIn: 'root' })
export class TasksHttpService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getTasksForCurrentUser(): Observable<TaskResponse[]> {
    const url = `${this.apiBaseUrl}/tasks`;
    return this.http.get<TaskResponse[]>(url);
  }

  createTask(request: CreateTaskRequest): Observable<TaskResponse> {
    const url = `${this.apiBaseUrl}/tasks`;
    return this.http.post<TaskResponse>(url, request);
  }

  updateTask(taskId: string, request: UpdateTaskRequest): Observable<TaskResponse> {
    const url = `${this.apiBaseUrl}/tasks/${encodeURIComponent(taskId)}`;
    return this.http.put<TaskResponse>(url, request);
  }

  deleteTask(taskId: string): Observable<void> {
    const url = `${this.apiBaseUrl}/tasks/${encodeURIComponent(taskId)}`;
    return this.http.delete<void>(url);
  }
}
