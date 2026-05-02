import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';

export function todayIsoDateLocal(reference = new Date()): string {
  const y = reference.getFullYear();
  const m = String(reference.getMonth() + 1).padStart(2, '0');
  const d = String(reference.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Due date calendar string must not be strictly before today's local calendar day. */
export function dueDateNotBeforeToday(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined) {
      return null;
    }
    const trimmed = String(raw).trim();
    if (trimmed === '') {
      return null;
    }

    const today = todayIsoDateLocal();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) && trimmed < today) {
      return { dueBeforeToday: true };
    }
    return null;
  };
}
