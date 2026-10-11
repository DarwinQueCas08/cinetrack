import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CalendarDays, KeyRound, Loader2, Mail, User, X, ShieldCheck } from 'lucide-react';

export interface AccountProfile {
  userId: string;
  username: string;
  email?: string | null;
  createdAt?: string | null;
  lastSignInAt?: string | null;
  isAdmin?: boolean;
}

interface ProfileModalProps {
  username: string;
  loadProfile: () => Promise<AccountProfile>;
  onClose: () => void;
  onRecovery: () => void;
  onAdmin: () => void;
}

function formatDate(value?: string | null) {
  if (!value) return 'No disponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No disponible' : date.toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function ProfileModal({ username, loadProfile, onClose, onRecovery, onAdmin }: ProfileModalProps) {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    loadProfile().then(data => { if (active) setProfile(data); }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'No se pudieron cargar tus datos.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadProfile, attempt]);

  const displayName = profile?.username || username;
  const internalEmail = profile?.email?.toLowerCase().endsWith('@cinetrack.local');

  return <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
      <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-100 bg-white p-6 shadow-xl text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <Dialog.Close aria-label="Cerrar perfil" className="absolute right-4 top-4 rounded-xl p-2 text-gray-400 hover:bg-gray-100 focus-visible:outline-violet-500"><X size={18} /></Dialog.Close>
        <div className="mb-5 flex items-center gap-3 pr-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><User size={24} /></div>
          <div className="min-w-0">
            <Dialog.Title className="text-xl font-bold">Mi perfil</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-gray-500">Los datos de tu cuenta de CineTrack.</Dialog.Description>
          </div>
        </div>

        <dl className="space-y-4 text-sm">
          <div className="rounded-2xl bg-violet-50 p-4">
            <dt className="mb-1 flex items-center gap-2 text-xs font-semibold text-violet-600"><User size={14} />Nombre de usuario</dt>
            <dd className="break-words font-semibold text-gray-900">{displayName}</dd>
          </div>
          {loading ? <div role="status" className="flex items-center gap-2 py-4 text-gray-500"><Loader2 size={16} className="animate-spin" />Cargando datos de la cuenta…</div> : error ? <div role="alert" className="rounded-2xl bg-red-50 p-4 text-red-700">
            <p>{error}</p>
            <button onClick={() => setAttempt(value => value + 1)} className="mt-2 font-semibold underline">Reintentar</button>
          </div> : profile && <>
            <div className="rounded-2xl border border-gray-100 p-4">
              <dt className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-500"><Mail size={14} />{internalEmail ? 'Correo interno de la cuenta' : 'Correo electrónico'}</dt>
              <dd className="break-all text-gray-900">{profile.email === undefined ? 'No disponible' : profile.email || 'No registrado'}</dd>
              {internalEmail && <p className="mt-2 text-xs leading-relaxed text-gray-500">Este correo se genera a partir de tu usuario y no recibe mensajes. Tu cuenta se registró con nombre de usuario.</p>}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><dt className="mb-1 flex items-center gap-2 text-xs text-gray-500"><CalendarDays size={14} />Cuenta creada</dt><dd>{formatDate(profile.createdAt)}</dd></div>
              <div><dt className="mb-1 text-xs text-gray-500">Último inicio de sesión</dt><dd>{formatDate(profile.lastSignInAt)}</dd></div>
            </div>
            <div className="border-t border-gray-100 pt-4"><dt className="mb-1 text-xs text-gray-500">ID de cuenta</dt><dd className="break-all font-mono text-xs text-gray-600">{profile.userId}</dd></div>
          </>}
        </dl>

        <button onClick={onRecovery} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 p-3 text-sm font-semibold text-white hover:bg-violet-700"><KeyRound size={16} />Código de recuperación</button>
        {!loading && !error && profile?.isAdmin === true && <button onClick={onAdmin} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 p-3 text-sm font-semibold text-violet-700 hover:bg-violet-100"><ShieldCheck size={16} />Panel de administrador</button>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
