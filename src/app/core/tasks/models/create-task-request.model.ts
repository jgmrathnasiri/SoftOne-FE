/** Aligns with SoftOne-BE `CreateTaskRequest` JSON (camelCase). */
export interface CreateTaskRequest {
  title: string;
  description: string | null;
  status: number;
  priority: number;
  dueDate: string | null;
  userId: string;
}
