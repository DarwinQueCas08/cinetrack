import { useState } from 'react';
import { Download, Clapperboard, Star, Eye, CheckCircle2, Clock } from 'lucide-react';
import { Movie } from '../types';
import { MovieCard } from './MovieCard';

interface SharedListViewProps {
  movies: Movie[];
  onImport: (movies: Movie[]) => void;
}

export function SharedListView({ movies, onImport }: SharedListViewProps) {
  const [imported, setImported] = useState(false);

  const handleImport = () => {
    onImport(movies);
    setImported(true);
  };

  const watched = movies.filter(m => m.status === 'watched').length;
  const watching = movies.filter(m => m.status === 'watching').length;
  const pending = movies.filter(m => m.status === 'pending').length;
  const avgRating = movies.filter(m => m.rating > 0).length
    ? (movies.filter(m => m.rating > 0).reduce((s, m) => s + m.rating, 0) / movies.filter(m => m.rating > 0).length).toFixed(1)
    : null;

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", minHeight: '100vh', background: '#F8F7FF' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#7C3AED' }}>
              <Clapperboard size={16} className="text-white" />
            </div>
            <div>
              <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.3px', color: '#111827' }}>CineTrack</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs" style={{ background: '#FFF7ED', color: '#EA580C', fontWeight: 500 }}>
                Vista compartida
              </span>
            </div>
          </div>
          <button
            onClick={handleImport}
            disabled={imported}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white transition-colors"
            style={{ fontSize: '12px', fontWeight: 600, background: imported ? '#10B981' : '#7C3AED' }}
          >
            <Download size={13} />
            {imported ? 'Importada ✓' : 'Importar a mi lista'}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
        {/* Stats banner */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }} className="mb-3">
            Watchlist compartida · {movies.length} películas
          </p>
          <div className="flex gap-4 flex-wrap">
            {[
              { icon: <CheckCircle2 size={13} />, label: 'Vistas', value: watched, color: '#059669' },
              { icon: <Eye size={13} />, label: 'Viendo', value: watching, color: '#0891B2' },
              { icon: <Clock size={13} />, label: 'Pendientes', value: pending, color: '#6D28D9' },
              ...(avgRating ? [{ icon: <Star size={13} />, label: 'Promedio', value: `★ ${avgRating}`, color: '#D97706' }] : []),
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span style={{ color: s.color }}>{s.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{s.value}</span>
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Movie list (read-only) */}
        <div className="flex flex-col gap-3">
          {movies.map(m => (
            <MovieCard
              key={m.id}
              movie={m}
              onEdit={() => {}}
              onDelete={() => {}}
              onStatusChange={() => {}}
              readOnly
            />
          ))}
        </div>
      </main>
    </div>
  );
}
