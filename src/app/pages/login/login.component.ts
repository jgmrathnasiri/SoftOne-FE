import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { resolveLoginErrorMessage } from '../../core/auth/resolve-login-error-message';
import { AuthService } from '../../core/auth/services/auth.service';

function trimmedRequired(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = typeof control.value === 'string' ? control.value.trim() : '';
    return v.length > 0 ? null : { required: true };
  };
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly busy = signal(false);
  readonly bannerError = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    username: ['', [trimmedRequired(), Validators.maxLength(256)]],
    password: ['', [Validators.required, Validators.maxLength(1024)]]
  });

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.bannerError.set(null);
    const { username, password } = this.form.getRawValue();
    this.busy.set(true);

    this.authService
      .login(username, password)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isAuthenticated && res.userId) {
            void this.router.navigate(['/home']);
          } else if (res.isAuthenticated) {
            this.bannerError.set(
              'The server authenticated you but did not return a user id. Restart the SoftOne-BE API and sign in again.'
            );
          } else {
            this.bannerError.set(res.message || 'Sign-in was not accepted.');
          }
        },
        error: (err: unknown) => {
          this.bannerError.set(resolveLoginErrorMessage(err));
        }
      });
  }
}
