/** Aligns with SoftOne-BE `TaskResponse` contract (camelCase JSON). */
export interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  status: number;
  priority: number;
  dueDate: string | null;
  createdAt: string;
  userId: string;
}
