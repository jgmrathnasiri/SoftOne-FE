/** Aligns with SoftOne-BE `UpdateTaskRequest` JSON (camelCase). */
export interface UpdateTaskRequest {
  title: string;
  description: string | null;
  status: number;
  priority: number;
  dueDate: string | null;
  userId: string;
}
