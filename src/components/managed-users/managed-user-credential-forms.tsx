import { type FormEvent, useState } from "react";

import { MaterialIcon } from "../icons/material-icon";

const MINIMUM_PASSWORD_LENGTH = 12;
const MAXIMUM_PASSWORD_LENGTH = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

type ManagedUserCreateFormProps = {
  disabled: boolean;
  roleLabel: string;
  onCreate: (input: { email: string; password: string }) => Promise<void>;
};

type ManagedUserPasswordResetFormProps = {
  disabled: boolean;
  targetLabel: string;
  onCancel: () => void;
  onReset: (password: string) => Promise<void>;
};

function validatePassword(
  password: string,
  confirmation: string,
): string | null {
  if (
    password.length < MINIMUM_PASSWORD_LENGTH ||
    password.length > MAXIMUM_PASSWORD_LENGTH
  ) {
    return `Use a password with ${String(MINIMUM_PASSWORD_LENGTH)} to ${String(
      MAXIMUM_PASSWORD_LENGTH,
    )} characters.`;
  }

  if (password !== confirmation) {
    return "Password confirmation does not match.";
  }

  return null;
}

export function ManagedUserCreateForm({
  disabled,
  roleLabel,
  onCreate,
}: ManagedUserCreateFormProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("passwordConfirmation") ?? "");

    if (!EMAIL_PATTERN.test(email)) {
      setError(`Enter a valid ${roleLabel} email address.`);
      return;
    }

    const passwordError = validatePassword(password, confirmation);

    if (passwordError !== null) {
      setError(passwordError);
      return;
    }

    try {
      await onCreate({ email, password });
      form.reset();
    } catch {
      return;
    }
  }

  return (
    <form
      className="control-form manager-invite-form"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <label>
        <span>{roleLabel} email</span>
        <input
          autoComplete="email"
          disabled={disabled}
          name="email"
          placeholder={`${roleLabel.toLowerCase().replaceAll(" ", ".")}@example.com`}
          required
          type="email"
        />
      </label>

      <label>
        <span>Initial password</span>
        <input
          autoComplete="new-password"
          disabled={disabled}
          maxLength={MAXIMUM_PASSWORD_LENGTH}
          minLength={MINIMUM_PASSWORD_LENGTH}
          name="password"
          required
          type="password"
        />
      </label>

      <label>
        <span>Confirm password</span>
        <input
          autoComplete="new-password"
          disabled={disabled}
          maxLength={MAXIMUM_PASSWORD_LENGTH}
          minLength={MINIMUM_PASSWORD_LENGTH}
          name="passwordConfirmation"
          required
          type="password"
        />
      </label>

      {error !== null && (
        <div className="form-error" role="alert">
          <MaterialIcon name="error" />
          <span>{error}</span>
        </div>
      )}

      <button
        className="primary-gradient-button primary-gradient-button--compact"
        disabled={disabled}
        type="submit"
      >
        <MaterialIcon name="person_add" />
        Create {roleLabel}
      </button>
    </form>
  );
}

export function ManagedUserPasswordResetForm({
  disabled,
  targetLabel,
  onCancel,
  onReset,
}: ManagedUserPasswordResetFormProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("passwordConfirmation") ?? "");
    const passwordError = validatePassword(password, confirmation);

    if (passwordError !== null) {
      setError(passwordError);
      return;
    }

    try {
      await onReset(password);
      form.reset();
    } catch {
      return;
    }
  }

  return (
    <form
      className="control-form account-form"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <p>
        Set a new password for <strong>{targetLabel}</strong>. The current
        password is never readable and the new password is not stored in
        application data.
      </p>

      <label>
        <span>New password</span>
        <input
          autoComplete="new-password"
          disabled={disabled}
          maxLength={MAXIMUM_PASSWORD_LENGTH}
          minLength={MINIMUM_PASSWORD_LENGTH}
          name="password"
          required
          type="password"
        />
      </label>

      <label>
        <span>Confirm password</span>
        <input
          autoComplete="new-password"
          disabled={disabled}
          maxLength={MAXIMUM_PASSWORD_LENGTH}
          minLength={MINIMUM_PASSWORD_LENGTH}
          name="passwordConfirmation"
          required
          type="password"
        />
      </label>

      {error !== null && (
        <div className="form-error" role="alert">
          <MaterialIcon name="error" />
          <span>{error}</span>
        </div>
      )}

      <div className="manager-row-actions">
        <button
          className="primary-gradient-button primary-gradient-button--compact"
          disabled={disabled}
          type="submit"
        >
          <MaterialIcon name="password" />
          Reset password
        </button>
        <button
          className="control-secondary-button"
          disabled={disabled}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
