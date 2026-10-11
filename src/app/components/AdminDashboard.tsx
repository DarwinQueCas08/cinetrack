import { useState } from 'react';
import { Clapperboard, KeyRound, LogOut, ShieldCheck, User, ArrowRight, LockKeyhole } from 'lucide-react';
import { AdminRecoveryPanel } from './AdminRecoveryPanel';
import { ProfileModal, type AccountProfile } from './ProfileModal';
import { RecoveryCodeModal } from './RecoveryCodeModal';
import type { AuthSession } from './AuthScreen';

interface Props {
  session: AuthSession;
  loadProfile: () => Promise<AccountProfile>;
  request: (path: string, body: Record<string, unknown>) => Promise<any>;
  onRefreshSession: () => Promise<AuthSession | null>;
  onLogout: () => void;
}

export function AdminDashboard({ session, loadProfile, request, onRefreshSession, onLogout }: Props) {
  const [showProfile, setShowProfile] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [safeToLeave, setSafeToLeave] = useState(true);
  const [workflow, setWorkflow] = useState(0);

  return <div className="min-h-screen bg-[#F8F7FF] dark:bg-gray-950 text-gray-900 dark:text-gray-100" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
      <div className="flex items-center gap-2.5"><span className="rounded-xl bg-violet-600 p-2 text-white"><Clapperboard size={22} /></span><span className="text-lg font-bold">CineTrack</span></div>
      <p className="mt-8 mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">Administración</p>
      <nav aria-label="Administración"><a href="#admin-recovery" aria-current="page" className="flex items-center gap-3 rounded-xl bg-violet-50 dark:bg-violet-950 p-3 text-sm font-semibold text-violet-700 dark:text-violet-300"><KeyRound size={18} />Recuperación de cuentas</a><button onClick={() => setShowProfile(true)} className="mt-2 flex w-full items-center gap-3 rounded-xl p-3 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"><User size={18} />Mi cuenta</button></nav>
      <div className="mt-auto rounded-2xl border border-violet-100 dark:border-violet-900 bg-violet-50/50 dark:bg-violet-950/30 p-4"><ShieldCheck size={20} className="text-violet-600 mb-2" /><p className="text-sm font-semibold">Acceso administrativo</p><p className="mt-1 text-xs text-gray-500 leading-relaxed">Gestiona la recuperación de acceso de los usuarios de CineTrack.</p></div>
    </aside>
    <div className="lg:ml-64">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={18} className="text-violet-600" />Panel de administrador</div>
        <div className="flex items-center gap-3"><button onClick={() => setShowProfile(true)} aria-label="Ver mi perfil de administrador" className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-950 text-violet-600"><User size={17} /></span><span className="text-left min-w-0"><span className="block max-w-36 truncate text-sm font-semibold">{session.username}</span><span className="block text-xs text-gray-400">Administrador</span></span></button><button onClick={onLogout} disabled={!safeToLeave} title={safeToLeave ? 'Cerrar sesión' : 'Guarda el código antes de cerrar sesión'} className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"><LogOut size={16} /><span className="hidden sm:inline">Cerrar sesión</span></button></div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:p-8 lg:p-10">
        <div className="mb-8"><span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 dark:bg-violet-950 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300"><LockKeyhole size={12} />Gestión de acceso</span><h1 className="mt-4 text-3xl font-bold tracking-tight">Administración de cuentas</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">Ayuda a los usuarios a recuperar el acceso. Busca su cuenta, confirma su identidad y emite un código de recuperación.</p></div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div id="admin-recovery" className="xl:col-span-2 scroll-mt-6"><AdminRecoveryPanel key={workflow} embedded loadProfile={loadProfile} request={request} onSafeToLeaveChange={setSafeToLeave} onClose={() => setWorkflow(value => value + 1)} /></div>
          <aside className="space-y-5">
            <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6"><h2 className="text-sm font-bold mb-5">Cómo recuperar una cuenta</h2><ol className="space-y-5">{[
              ['Busca la cuenta', 'Introduce el nombre de usuario y revisa que sus datos coincidan.'],
              ['Verifica al titular', 'Confirma su identidad antes de autorizar la recuperación.'],
              ['Genera y entrega el código', 'Confirma con tu contraseña y envíalo al titular por un canal privado.'],
            ].map(([title, description], index) => <li key={title} className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-950 text-xs font-bold text-violet-600">{index + 1}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p></div></li>)}</ol></section>
            <section className="rounded-3xl border border-violet-100 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/50 p-6"><KeyRound size={20} className="mb-3 text-violet-600" /><h2 className="text-sm font-bold">El usuario elige su contraseña</h2><p className="mt-2 text-xs leading-relaxed text-gray-500">El titular usa el código en «¿Olvidaste tu contraseña?». Funciona una sola vez y conserva sus películas, series y listas.</p><p className="mt-4 flex items-center gap-2 text-xs font-semibold text-violet-600">Recuperar acceso<ArrowRight size={14} />Conservar la cuenta</p></section>
          </aside>
        </div>
      </main>
    </div>
    {showProfile && <ProfileModal username={session.username} loadProfile={loadProfile} onClose={() => setShowProfile(false)} onAdmin={() => { setShowProfile(false); document.getElementById('admin-recovery')?.scrollIntoView({ behavior: 'smooth' }); }} onRecovery={() => { setShowProfile(false); setShowRecovery(true); }} />}
    {showRecovery && <RecoveryCodeModal session={session} onClose={() => setShowRecovery(false)} onRefreshSession={onRefreshSession} />}
  </div>;
}
