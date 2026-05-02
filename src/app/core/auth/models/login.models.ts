/** Matches SoftOne-BE POST /auth/login JSON body (`LoginRequest`). */
export interface LoginRequest {
  username: string;
  password: string;
}

/** Matches SoftOne-BE `LoginResponse`. */
export interface LoginResponse {
  isAuthenticated: boolean;
  message: string;
  userId?: string;
}

/** Subset of ASP.NET Core `ProblemDetails` for validation failures. */
export interface HttpValidationProblemDetails {
  title?: string;
  status?: number;
  errors?: Record<string, string[]>;
}
