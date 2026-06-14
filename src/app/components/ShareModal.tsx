import { useState } from 'react';
import { X, Link2, Copy, Check, Users, Lock } from 'lucide-react';
import { Movie } from '../types';

interface ShareModalProps {
  movies: Movie[];
  onClose: () => void;
}

function encodeList(movies: Movie[]): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(movies))));
  } catch {
    return '';
  }
}

export function ShareModal({ movies, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}${window.location.pathname}#share=${encodeList(movies)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#F5F3FF' }}>
              <Link2 size={18} style={{ color: '#7C3AED' }} />
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors" style={{ color: '#9CA3AF' }}>
              <X size={16} />
            </button>
          </div>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111827' }} className="mb-1">Compartir watchlist</h2>
          <p style={{ fontSize: '13px', color: '#6B7280' }}>
            Genera un link para que otros vean tu lista de {movies.length} películas (solo lectura).
          </p>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-4">
          {/* Share link */}
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
            <div className="px-3 py-2" style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Link de solo lectura
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5">
              <p style={{ fontSize: '12px', color: '#6B7280' }} className="flex-1 truncate">
                {shareUrl.length > 60 ? shareUrl.slice(0, 60) + '…' : shareUrl}
              </p>
              <button
                onClick={copy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all flex-shrink-0"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  background: copied ? '#ECFDF5' : '#7C3AED',
                  color: copied ? '#059669' : 'white',
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Info pills */}
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2.5 rounded-xl px-3 py-2.5" style={{ background: '#F0FDF4' }}>
              <Check size={14} style={{ color: '#059669', marginTop: '1px', flexShrink: 0 }} />
              <p style={{ fontSize: '12px', color: '#065F46' }}>
                Cualquiera con el link puede ver tu lista completa con posters, géneros y puntuaciones.
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl px-3 py-2.5" style={{ background: '#FFF7ED' }}>
              <Lock size={14} style={{ color: '#D97706', marginTop: '1px', flexShrink: 0 }} />
              <p style={{ fontSize: '12px', color: '#92400E' }}>
                No pueden editar ni agregar películas. Solo vista de lectura.
              </p>
            </div>
          </div>

          {/* Collaborators CTA */}
          <div className="rounded-2xl border p-4" style={{ borderColor: '#DDD6FE', background: '#FAF5FF' }}>
            <div className="flex items-center gap-2 mb-2">
              <Users size={15} style={{ color: '#7C3AED' }} />
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#5B21B6' }}>¿Quieres colaboradores con edición?</p>
            </div>
            <p style={{ fontSize: '12px', color: '#7C3AED', lineHeight: '1.5' }}>
              Para listas compartidas donde varios puedan agregar y editar películas, conecta Supabase como base de datos en tiempo real.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
