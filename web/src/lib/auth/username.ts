export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;

/**
 * Trader names are deliberately conservative: letters, numbers, spaces,
 * underscores, and hyphens. The first and last characters must be letters or
 * numbers so a name cannot look empty after trimming.
 */
export const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]*[A-Za-z0-9]$/;

export function normalizeUsername(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

export function validateUsername(value: unknown): string | null {
  const username = normalizeUsername(value);

  if (username.length < USERNAME_MIN_LENGTH) {
    return `Trader name must be at least ${USERNAME_MIN_LENGTH} characters.`;
  }

  if (username.length > USERNAME_MAX_LENGTH) {
    return `Trader name must be ${USERNAME_MAX_LENGTH} characters or fewer.`;
  }

  if (!USERNAME_PATTERN.test(username)) {
    return "Use letters, numbers, spaces, underscores, or hyphens. Start and end with a letter or number.";
  }

  return null;
}
