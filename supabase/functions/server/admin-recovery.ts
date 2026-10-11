export interface AdminActor {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
}

export interface RecoveryAccount {
  userId: string;
  username: string;
  email: string;
  createdAt: string | null;
}

export function isCineTrackAdmin(user: AdminActor | null): boolean {
  return user?.app_metadata?.cinetrack_admin === true;
}

export class AdminRecoveryError extends Error {
  status: 400 | 401 | 403 | 404 | 409;
  constructor(message: string, status: 400 | 401 | 403 | 404 | 409) { super(message); this.status = status; }
}

interface Dependencies {
  getActor: (token: string) => Promise<AdminActor | null>;
  findAccount: (username: string) => Promise<RecoveryAccount | null>;
  verifyPassword: (actor: AdminActor, password: string) => Promise<boolean>;
  audit: (adminId: string, targetId: string) => Promise<void>;
  issue: (username: string, userId: string) => Promise<string>;
}

export function createAdminRecoveryService(deps: Dependencies) {
  async function authorize(token?: string) {
    const actor = token ? await deps.getActor(token) : null;
    if (!actor) throw new AdminRecoveryError('La sesión expiró. Vuelve a iniciar sesión.', 401);
    if (!isCineTrackAdmin(actor)) throw new AdminRecoveryError('Esta cuenta no tiene permiso de administrador.', 403);
    return actor;
  }
  function validateUsername(value: unknown) {
    if (typeof value !== 'string' || !value.trim() || value.length > 200 || /[@\s]/.test(value.trim())) {
      throw new AdminRecoveryError('Introduce el nombre de usuario, sin correo ni espacios.', 400);
    }
    return value.trim().toLowerCase();
  }
  return {
    authorize,
    async lookup(token: string | undefined, username: unknown) {
      await authorize(token);
      const account = await deps.findAccount(validateUsername(username));
      if (!account) throw new AdminRecoveryError('No se encontró esa cuenta.', 404);
      return account;
    },
    async issue(token: string | undefined, input: { username?: unknown; userId?: unknown; password?: unknown; confirmed?: unknown }) {
      const actor = await authorize(token);
      const username = validateUsername(input.username);
      if (input.confirmed !== true || typeof input.password !== 'string' || !input.password || input.password.length > 128) {
        throw new AdminRecoveryError('Verifica al titular e introduce tu contraseña de administrador.', 400);
      }
      if (!await deps.verifyPassword(actor, input.password)) throw new AdminRecoveryError('La contraseña de administrador no es correcta.', 403);
      const account = await deps.findAccount(username);
      if (!account) throw new AdminRecoveryError('No se encontró esa cuenta.', 404);
      if (input.userId !== account.userId) throw new AdminRecoveryError('La cuenta cambió. Búscala otra vez antes de generar el código.', 409);
      // Audit contains only IDs and time; never store or log the code/password.
      await deps.audit(actor.id, account.userId);
      const code = await deps.issue(username, account.userId);
      return { account, code };
    },
  };
}
