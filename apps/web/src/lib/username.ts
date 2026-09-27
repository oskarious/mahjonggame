// Shared by the auth config (server) and the sign-up form (client).
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;

// Names that would be confusing at a table next to bots or staff.
const RESERVED = /^(admin|administrator|mod|moderator|staff|support|system|root|guest|anonymous|you|bot.*)$/i;

export function isValidUsername(name: string): boolean {
  return (
    name.length >= USERNAME_MIN && name.length <= USERNAME_MAX && USERNAME_PATTERN.test(name) && !RESERVED.test(name)
  );
}
