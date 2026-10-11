import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Check, Copy, KeyRound, Loader2, Search, ShieldCheck, X } from 'lucide-react';
import type { AccountProfile } from './ProfileModal';

interface Account { userId: string; username: string; email: string; createdAt: string | null }
interface Props {
  loadProfile: () => Promise<AccountProfile>;
  request: (path: string, body: Record<string, unknown>) => Promise<any>;
  onClose: () => void;
  embedded?: boolean;
  onSafeToLeaveChange?: (safe: boolean) => void;
}

export function AdminRecoveryPanel({ loadProfile, request, onClose, embedded = false, onSafeToLeaveChange }: Props) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [account, setAccount] = useState<Account | null>(null);
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [code, setCode] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    loadProfile().then(profile => {
      if (active) {
        setAuthorized(profile.isAdmin === true);
        if (profile.isAdmin !== true) setError('Esta cuenta no tiene permiso de administrador.');
      }
    }).catch(() => { if (active) { setAuthorized(false); setError('No se pudo verificar tu permiso. Cierra el panel y vuelve a intentarlo.'); } });
    return () => { active = false; };
  }, [loadProfile]);

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setAccount(null); setPassword(''); setConfirmed(false);
    try {
      const result = await request('/admin/accounts/lookup', { username: username.trim() });
      setAccount(result.account);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo buscar la cuenta.'); }
    finally { setBusy(false); }
  };

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!account || !confirmed || !password) return;
    setBusy(true); setError('');
    try {
      const result = await request('/admin/recovery-code', { username: account.email.slice(0, -'@cinetrack.local'.length), userId: account.userId, password, confirmed });
      setCode(result.code); setSaved(false); setCopied(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo generar el código.'); }
    finally { setPassword(''); setBusy(false); }
  };

  const canClose = !busy && (!code || saved);
  useEffect(() => { onSafeToLeaveChange?.(canClose); }, [canClose, onSafeToLeaveChange]);
  const content = <>
        {!embedded && <button onClick={onClose} disabled={!canClose} aria-label="Cerrar panel de administrador" className="absolute right-4 top-4 p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"><X size={18} /></button>}
        <div className="flex gap-3 items-center mb-5 pr-8">
          <div className="rounded-2xl bg-violet-50 dark:bg-violet-950 p-3 text-violet-600"><ShieldCheck size={24} /></div>
          <div>{embedded ? <><h2 className="text-xl font-bold">Recuperar una cuenta</h2><p className="text-sm text-gray-500 mt-1">Busca al usuario y genera su código de acceso.</p></> : <><Dialog.Title className="text-xl font-bold">Administración</Dialog.Title><Dialog.Description id="admin-description" className="text-sm text-gray-500 mt-1">Recuperación de cuentas de CineTrack</Dialog.Description></>}</div>
        </div>
        {authorized === null && <p role="status" className="flex gap-2 text-sm text-gray-500"><Loader2 className="animate-spin" size={16} />Verificando acceso…</p>}
        {error && <p role="alert" className="my-4 rounded-xl bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        {authorized && (code && account ? <div className="space-y-4">
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950 p-4 text-emerald-800 dark:text-emerald-200"><p className="font-bold flex items-center gap-2"><Check size={16} />Código generado para {account.username}</p><p className="text-sm mt-1 break-all">{account.email}</p></div>
          <label className="block text-sm font-semibold">Código de un solo uso
            <textarea autoFocus readOnly rows={3} value={code} onFocus={event => event.target.select()} className="w-full mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 font-mono text-sm" />
          </label>
          <button onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); } catch { setError('No se pudo copiar. Selecciona el código y cópialo manualmente.'); } }} className="flex items-center gap-2 text-violet-600 text-sm font-semibold"><Copy size={16} />{copied ? 'Copiado' : 'Copiar código'}</button>
          <p className="text-sm text-gray-500">Entrégalo solo al titular. Debe entrar en «¿Olvidaste tu contraseña?», escribir su usuario, este código y una contraseña nueva. El código anterior dejó de funcionar.</p>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)} className="mt-1" />He guardado el código o lo entregué al titular por un canal privado.</label>
          <div className="flex gap-3"><button disabled={!saved} onClick={() => { setCode(''); setAccount(null); setUsername(''); setConfirmed(false); setError(''); }} className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-sm font-semibold disabled:opacity-40">Recuperar otra cuenta</button><button disabled={!saved} onClick={onClose} className="flex-1 rounded-xl bg-violet-600 p-3 text-sm font-semibold text-white disabled:opacity-40">Listo</button></div>
        </div> : <div className="space-y-5">
          <form onSubmit={search} className="space-y-2">
            <label htmlFor="admin-username" className="text-sm font-semibold">Nombre de usuario a recuperar</label>
            <div className="flex gap-2"><input id="admin-username" autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={200} value={username} onChange={event => { setUsername(event.target.value); setAccount(null); setConfirmed(false); setPassword(''); }} disabled={busy} placeholder="Por ejemplo, Eli" className="min-w-0 flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 text-sm" /><button disabled={busy || !username.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 p-3 text-white text-sm font-semibold disabled:opacity-40">{busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}Buscar</button></div>
          </form>
          {account ? <form onSubmit={generate} className="space-y-4">
            <div className="rounded-2xl border border-violet-100 dark:border-violet-900 bg-violet-50 dark:bg-violet-950 p-4"><p className="font-bold break-words">{account.username}</p><p className="text-sm text-gray-500 break-all mt-1">{account.email}</p><p className="text-xs text-gray-500 break-all mt-3">ID: {account.userId}</p></div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" required disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-1" />Verifiqué la identidad del titular y confirmo que esta es la cuenta correcta.</label>
            <label className="block text-sm font-semibold">Tu contraseña de administrador<input required type="password" autoComplete="current-password" maxLength={128} disabled={busy} value={password} onChange={event => setPassword(event.target.value)} className="w-full mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3" /></label>
            <p className="text-xs text-gray-500">Generar un código reemplaza el anterior. Conserva la cuenta y sus listas.</p>
            <button disabled={busy || !confirmed || !password} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 p-3 text-sm font-semibold text-white disabled:opacity-40">{busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}{busy ? 'Generando…' : 'Generar código de recuperación'}</button>
          </form> : <p className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 text-sm text-gray-500">Busca la cuenta por su nombre de usuario. Podrás confirmar sus datos antes de emitir el código.</p>}
        </div>)}
  </>;
  if (embedded) return <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-7 shadow-sm text-gray-900 dark:text-gray-100">{content}</section>;
  return <Dialog.Root open onOpenChange={open => { if (!open && canClose) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
      <Dialog.Content aria-describedby="admin-description" onEscapeKeyDown={event => { if (!canClose) event.preventDefault(); }} onPointerDownOutside={event => event.preventDefault()} className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-100 bg-white dark:bg-gray-900 p-6 shadow-xl text-gray-900 dark:text-gray-100" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{content}</Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
