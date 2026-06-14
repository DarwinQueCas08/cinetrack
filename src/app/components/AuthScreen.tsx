import { useState } from 'react';
import { Clapperboard, User, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-da14cc3d`;
const HEADERS = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

export interface AuthSession {
  userId: string;
  username: string;
  accessToken: string;
  refreshToken: string;
}

interface AuthScreenProps {
  onAuth: (session: AuthSession) => void;
}

export function AuthScreen({ onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const endpoint = mode === 'login' ? 'signin' : 'signup';
      const res = await fetch(`${SERVER}/auth/${endpoint}`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al autenticar');
      onAuth({
        userId: data.userId,
        username: data.username,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: 'linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 50%, #F0FDF4 100%)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg"
            style={{ background: '#7C3AED', boxShadow: '0 8px 24px rgba(124,58,237,0.3)' }}>
            <Clapperboard size={28} className="text-white" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>CineTrack</h1>
          <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px' }}>Tu watchlist personal de películas</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
          {/* Mode tabs */}
          <div className="flex border-b border-gray-100">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className="flex-1 py-4 transition-colors"
                style={{
                  fontSize: '14px',
                  fontWeight: mode === m ? 700 : 400,
                  color: mode === m ? '#7C3AED' : '#9CA3AF',
                  borderBottom: mode === m ? '2px solid #7C3AED' : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="p-6 flex flex-col gap-4">
            {/* Username */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="tu_usuario"
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border outline-none transition-all"
                  style={{
                    fontSize: '15px',
                    borderColor: '#E5E7EB',
                    background: '#F9FAFB',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#A78BFA'; e.currentTarget.style.background = 'white'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#F9FAFB'; }}
                />
              </div>
              {mode === 'register' && (
                <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>Mínimo 3 caracteres, sin espacios</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }} className="block mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full pl-10 pr-11 py-3 rounded-2xl border outline-none transition-all"
                  style={{ fontSize: '15px', borderColor: '#E5E7EB', background: '#F9FAFB' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#A78BFA'; e.currentTarget.style.background = 'white'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#F9FAFB'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#9CA3AF' }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {mode === 'register' && (
                <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>Mínimo 6 caracteres</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <AlertCircle size={14} style={{ color: '#EF4444', flexShrink: 0, marginTop: '1px' }} />
                <p style={{ fontSize: '13px', color: '#DC2626' }}>{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full py-3.5 rounded-2xl text-white transition-all flex items-center justify-center gap-2"
              style={{
                fontSize: '15px',
                fontWeight: 700,
                background: loading || !username.trim() || !password ? '#C4B5FD' : '#7C3AED',
                boxShadow: loading || !username.trim() || !password ? 'none' : '0 4px 14px rgba(124,58,237,0.4)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> {mode === 'login' ? 'Entrando...' : 'Creando cuenta...'}</>
              ) : (
                mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'
              )}
            </button>

            {/* Switch mode */}
            <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center' }}>
              {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
              {' '}
              <button
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                style={{ color: '#7C3AED', fontWeight: 600 }}
              >
                {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
              </button>
            </p>
          </form>
        </div>

        <p style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'center', marginTop: '16px' }}>
          Tus datos se guardan de forma segura en la nube ☁️
        </p>
      </div>
    </div>
  );
}
