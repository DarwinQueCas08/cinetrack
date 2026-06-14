import { useState } from 'react';
import { X, Users, Plus, ArrowRight, Loader2, Hash } from 'lucide-react';
import { Movie } from '../types';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-da14cc3d`;
const HEADERS = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

function genOwnerKey() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

interface CollabModalProps {
  movies: Movie[];
  onJoinRoom: (roomId: string, ownerKey: string | null, memberName: string, roomName?: string) => void;
  onClose: () => void;
}

export function CollabModal({ movies, onJoinRoom, onClose }: CollabModalProps) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [importMovies, setImportMovies] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim() || !roomName.trim()) { setError('Completa todos los campos'); return; }
    setLoading(true);
    setError('');
    try {
      const ownerKey = genOwnerKey();
      const res = await fetch(`${SERVER}/rooms`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          name: roomName.trim(),
          movies: importMovies ? movies : [],
          ownerKey,
          ownerName: name.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al crear sala');
      // Store owner key locally
      localStorage.setItem(`cinetrack_room_owner_${data.roomId}`, ownerKey);
      onJoinRoom(data.roomId, ownerKey, name.trim(), roomName.trim());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear sala');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim() || !roomCode.trim()) { setError('Completa todos los campos'); return; }
    setLoading(true);
    setError('');
    try {
      const code = roomCode.trim().toUpperCase();
      const res = await fetch(`${SERVER}/rooms/${code}`, { headers: HEADERS });
      if (res.status === 404) throw new Error('Sala no encontrada. Verifica el código.');
      if (!res.ok) throw new Error('Error al buscar la sala');
      const data = await res.json();
      const ownerKey = localStorage.getItem(`cinetrack_room_owner_${code}`) ?? null;
      onJoinRoom(code, ownerKey, name.trim(), data.name ?? code);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al unirse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(5px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#F5F3FF' }}>
              <Users size={18} style={{ color: '#7C3AED' }} />
            </div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111827' }}>Sala colaborativa</h2>
            <p style={{ fontSize: '13px', color: '#6B7280' }} className="mt-0.5">Comparte y edita una lista en tiempo real</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors" style={{ color: '#9CA3AF' }}>
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6">
          {mode === 'choose' && (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setMode('create')}
                className="flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all hover:border-violet-300 hover:bg-violet-50"
                style={{ borderColor: '#E5E7EB' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#7C3AED' }}>
                  <Plus size={16} className="text-white" />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Crear nueva sala</p>
                  <p style={{ fontSize: '12px', color: '#6B7280' }}>Genera un código e invita a tus amigos</p>
                </div>
                <ArrowRight size={16} style={{ color: '#9CA3AF', marginLeft: 'auto' }} />
              </button>
              <button
                onClick={() => setMode('join')}
                className="flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all hover:border-violet-300 hover:bg-violet-50"
                style={{ borderColor: '#E5E7EB' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#F97316' }}>
                  <Hash size={16} className="text-white" />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Unirme a una sala</p>
                  <p style={{ fontSize: '12px', color: '#6B7280' }}>Tengo un código de sala</p>
                </div>
                <ArrowRight size={16} style={{ color: '#9CA3AF', marginLeft: 'auto' }} />
              </button>
            </div>
          )}

          {mode === 'create' && (
            <div className="flex flex-col gap-3">
              <button onClick={() => setMode('choose')} style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'left' }}>← Volver</button>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280' }} className="block mb-1.5">Tu nombre</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="¿Cómo te llamas?"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-violet-400 focus:bg-white transition-colors"
                  style={{ fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280' }} className="block mb-1.5">Nombre de la sala</label>
                <input
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  placeholder="Ej: Películas con Juan"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-violet-400 focus:bg-white transition-colors"
                  style={{ fontSize: '14px' }}
                />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={importMovies}
                  onChange={e => setImportMovies(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: '#7C3AED' }}
                />
                <span style={{ fontSize: '13px', color: '#374151' }}>Importar mis {movies.length} películas a la sala</span>
              </label>
              {error && <p style={{ fontSize: '12px', color: '#EF4444' }}>{error}</p>}
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full py-3 rounded-xl text-white transition-colors flex items-center justify-center gap-2"
                style={{ fontSize: '14px', fontWeight: 600, background: loading ? '#A78BFA' : '#7C3AED' }}
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                {loading ? 'Creando...' : 'Crear sala'}
              </button>
            </div>
          )}

          {mode === 'join' && (
            <div className="flex flex-col gap-3">
              <button onClick={() => setMode('choose')} style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'left' }}>← Volver</button>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280' }} className="block mb-1.5">Tu nombre</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="¿Cómo te llamas?"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-violet-400 focus:bg-white transition-colors"
                  style={{ fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280' }} className="block mb-1.5">Código de sala</label>
                <input
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Ej: AB12CD"
                  maxLength={6}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-violet-400 focus:bg-white transition-colors font-mono"
                  style={{ fontSize: '18px', letterSpacing: '0.2em', textAlign: 'center' }}
                />
              </div>
              {error && <p style={{ fontSize: '12px', color: '#EF4444' }}>{error}</p>}
              <button
                onClick={handleJoin}
                disabled={loading}
                className="w-full py-3 rounded-xl text-white transition-colors flex items-center justify-center gap-2"
                style={{ fontSize: '14px', fontWeight: 600, background: loading ? '#FB923C' : '#F97316' }}
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                {loading ? 'Buscando...' : 'Unirme'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
