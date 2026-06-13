const DEFAULT_SLUG_LENGTH = 10;
const SLUG_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const DEFAULT_MAX_ATTEMPTS = 10;

export interface SlugRepository {
  hasSlug(slug: string): Promise<boolean>;
}

export interface UniqueSlugOptions {
  generateSlug?: () => string;
  maxAttempts?: number;
}

export function generateActionSlug(length = DEFAULT_SLUG_LENGTH): string {
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues, (value) => {
    return SLUG_ALPHABET[value % SLUG_ALPHABET.length];
  }).join("");
}

export async function createUniqueActionSlug(
  repository: SlugRepository,
  options: UniqueSlugOptions = {},
): Promise<string> {
  const generateSlug = options.generateSlug ?? generateActionSlug;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const slug = generateSlug();
    if (!(await repository.hasSlug(slug))) {
      return slug;
    }
  }

  throw new Error(
    `Unable to generate a unique Action slug after ${maxAttempts} attempts`,
  );
}

export const ACTION_SLUG_LENGTH = DEFAULT_SLUG_LENGTH;
export const ACTION_SLUG_PATTERN = /^[A-Za-z0-9]+$/;
