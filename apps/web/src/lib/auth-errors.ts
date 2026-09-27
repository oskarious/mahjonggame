// Better Auth error → short message. Unknown sign-in failures stay generic so they don't reveal which accounts exist.
export function authError(err: { code?: string; status?: number; message?: string } | null | undefined): string {
  if (!err) return '';
  if (err.status === 429) return 'Too many attempts. Try again in a minute.';
  switch (err.code) {
    case 'INVALID_USERNAME_OR_PASSWORD':
    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'CREDENTIAL_ACCOUNT_NOT_FOUND':
      return 'Invalid credentials';
    case 'INVALID_PASSWORD':
      return 'Wrong password';
    case 'USERNAME_IS_ALREADY_TAKEN':
    case 'USERNAME_IS_ALREADY_TAKEN_PLEASE_TRY_ANOTHER':
      return 'Username taken';
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return 'Email already in use';
    case 'PASSWORD_TOO_SHORT':
      return 'Password: at least 8 characters';
    case 'PASSWORD_TOO_LONG':
      return 'Password: at most 128 characters';
    case 'INVALID_EMAIL':
      return 'Invalid email';
    case 'INVALID_USERNAME':
    case 'USERNAME_TOO_SHORT':
    case 'USERNAME_TOO_LONG':
    case 'INVALID_DISPLAY_USERNAME':
      return 'Username: 3–20 letters, digits or _';
  }
  return err.message || 'Something went wrong';
}
