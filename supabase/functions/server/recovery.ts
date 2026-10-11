// Recovery codes contain 256 random bits. Store only their SHA-256 digest.
export function normalizeCode(code: string): string {
  return code.replace(/[\s-]/g, '').toLowerCase();
}

export async function hashCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizeCode(code)));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').match(/.{8}/g)!.join('-');
}

export const recoveryKey = (username: string) => `auth:recovery:${username.trim().toLowerCase()}`;

export interface RecoveryRecord {
  userId: string;
  hash: string;
}

interface RecoveryDependencies {
  save: (key: string, record: RecoveryRecord) => Promise<void>;
  // Must atomically delete AND return the matching record (single use).
  consume: (key: string, hash: string) => Promise<RecoveryRecord | null>;
  updatePassword: (userId: string, password: string) => Promise<boolean>;
}

export function createRecoveryService(deps: RecoveryDependencies) {
  return {
    async issue(username: string, userId: string) {
      const code = generateCode();
      await deps.save(recoveryKey(username), { userId, hash: await hashCode(code) });
      return code;
    },
    async reset(username: unknown, code: unknown, password: unknown) {
      if (typeof username !== 'string' || !username.trim() || username.length > 200 ||
          typeof code !== 'string' || code.length > 100 || !/^[a-f0-9]{64}$/.test(normalizeCode(code)) ||
          typeof password !== 'string' || password.length < 8 || password.length > 128) {
        return false;
      }
      const record = await deps.consume(recoveryKey(username), await hashCode(code));
      if (!record) return false;
      // Fail closed: an Auth outage consumes the code too. Never restore a used code.
      return deps.updatePassword(record.userId, password);
    },
  };
}
