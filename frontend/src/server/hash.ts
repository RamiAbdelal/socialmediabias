import { createHash } from 'crypto';

/** Compute a stable SHA-256 hash hex string for input. */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
