import { useState } from 'react';
import { AuthSession } from './AuthScreen';
import { projectId } from '/utils/supabase/info';
import * as Dialog from '@radix-ui/react-dialog';

export function RecoveryCodeModal({ session, onClose, onRefreshSession }: { session: AuthSession; onClose: () => void; onRefreshSession: () => Promise<AuthSession | null> }) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const requestCode = (token: string) => fetch(`https://${projectId}.supabase.co/functions/v1/make-server-da14cc3d/auth/recovery-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });
      let response = await requestCode(session.accessToken);
      if (response.status === 401) {
        const refreshed = await onRefreshSession();
        if (refreshed) response = await requestCode(refreshed.accessToken);
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo generar el código.');
      setCode(data.code);
      setPassword('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Error de conexión.');
    } finally { setBusy(false); }
  };

  const canClose = !busy && (!code || saved);
  return <Dialog.Root open onOpenChange={open => { if (!open && canClose) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
      <Dialog.Content aria-describedby={undefined} onEscapeKeyDown={event => { if (!canClose) event.preventDefault(); }} onPointerDownOutside={event => event.preventDefault()} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-xl text-gray-900">
      <Dialog.Title className="text-xl font-bold mb-3">Protege tu cuenta</Dialog.Title>
      {code ? <>
        <p className="text-sm text-gray-600 mb-4">Guarda este código en un lugar privado junto a tu usuario ({session.username}). Permite cambiar tu contraseña una sola vez. El código anterior ya no funciona y este no se volverá a mostrar.</p>
        <label className="text-sm font-semibold">Tu código de recuperación
          <textarea readOnly autoFocus value={code} onFocus={e => e.target.select()} rows={3} className="w-full my-3 p-3 border rounded-xl font-mono text-sm" />
        </label>
        <label className="flex gap-2 text-sm mb-4"><input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} />He guardado el código en un lugar seguro.</label>
        <button onClick={onClose} disabled={!saved} className="w-full rounded-xl bg-violet-600 disabled:opacity-40 text-white p-3">Listo</button>
      </> : <form onSubmit={generate} className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">Genera un código para recuperar tu cuenta si olvidas la contraseña. Si ya tenías uno, será reemplazado. Confirma tu contraseña actual para continuar.</p>
        <label className="text-sm font-semibold">Contraseña actual
          <input autoFocus required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-2 p-3 border rounded-xl" />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={busy || !password} className="rounded-xl bg-violet-600 disabled:opacity-40 text-white p-3">{busy ? 'Generando…' : 'Generar código de recuperación'}</button>
        <button type="button" disabled={busy} onClick={onClose} className="text-sm text-gray-600">Cancelar</button>
      </form>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
