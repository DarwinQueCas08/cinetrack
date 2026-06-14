import { X, Star, Clock, Eye, CheckCircle2, Edit2, Trash2, Monitor, Calendar, StickyNote, Tv, Film } from 'lucide-react';
import { Movie, MovieStatus, platformStyle } from '../types';

const STATUS_CONFIG: Record<MovieStatus, { label: string; textColor: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pendiente',   textColor: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE', icon: <Clock size={13} /> },
  watching: { label: 'Viendo ahora',textColor: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC', icon: <Eye size={13} /> },
  watched:  { label: 'Visto ✓',     textColor: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: <CheckCircle2 size={13} /> },
};

const RATING_LABELS = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];

interface MovieDetailModalProps {
  movie: Movie;
  onClose: () => void;
  onEdit: (movie: Movie) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: MovieStatus) => void;
  readOnly?: boolean;
}

export function MovieDetailModal({ movie, onClose, onEdit, onDelete, onStatusChange, readOnly }: MovieDetailModalProps) {
  const cfg = STATUS_CONFIG[movie.status];
  const nextStatus: Record<MovieStatus, MovieStatus> = { pending: 'watching', watching: 'watched', watched: 'pending' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{ maxHeight: '92vh' }}
      >
        {/* Hero — poster + gradient overlay */}
        <div className="relative flex-shrink-0" style={{ minHeight: '220px', background: '#111' }}>
          {movie.poster ? (
            <>
              <img
                src={movie.poster}
                alt={movie.title}
                className="w-full object-cover"
                style={{ height: '220px', objectPosition: 'center 20%' }}
              />
              {/* gradient fade to white */}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 60%, rgba(255,255,255,1) 100%)' }}
              />
            </>
          ) : (
            <div className="w-full h-56 flex items-center justify-center text-6xl" style={{ background: '#F3F4F6' }}>
              🎬
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(0,0,0,0.4)', color: 'white' }}
          >
            <X size={15} />
          </button>

          {/* Status badge on hero */}
          <div className="absolute top-3 left-3">
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ fontSize: '11px', fontWeight: 600, color: cfg.textColor, background: 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.15)' }}
            >
              {cfg.icon} {cfg.label}
            </span>
          </div>

          {/* Title block over hero bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', letterSpacing: '-0.4px', lineHeight: 1.2 }}>
              {movie.title}
            </h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {movie.year && (
                <span className="flex items-center gap-1" style={{ fontSize: '12px', color: '#6B7280' }}>
                  <Calendar size={11} /> {movie.year}
                </span>
              )}
              {movie.platform && (
                <span className="flex items-center gap-1" style={{ fontSize: '12px', color: '#EA580C', fontWeight: 500 }}>
                  <Monitor size={11} /> {movie.platform}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">

          {/* Rating */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  disabled={readOnly}
                  onClick={() => !readOnly && onStatusChange && null /* rating handled via edit */}
                  className="transition-transform hover:scale-110 disabled:cursor-default"
                >
                  <Star
                    size={22}
                    className={n <= movie.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
                  />
                </button>
              ))}
            </div>
            {movie.rating > 0 && (
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>{RATING_LABELS[movie.rating]}</span>
            )}
            {movie.rating === 0 && (
              <span style={{ fontSize: '12px', color: '#D1D5DB' }}>Sin calificar</span>
            )}
          </div>

          {/* Genres */}
          {movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {movie.genres.map(g => (
                <span key={g} className="px-2.5 py-1 rounded-full" style={{ fontSize: '11px', fontWeight: 500, background: '#F3F4F6', color: '#374151' }}>
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          {movie.overview && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }} className="mb-1.5">
                Sinopsis
              </p>
              <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7' }}>{movie.overview}</p>
            </div>
          )}

          {/* Streaming platforms */}
          {movie.streamingPlatforms && movie.streamingPlatforms.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }} className="mb-2">
                Disponible en
              </p>
              <div className="flex flex-wrap gap-2">
                {movie.streamingPlatforms.map(p => {
                  const s = platformStyle(p);
                  return (
                    <span
                      key={p}
                      className="px-3 py-1.5 rounded-xl"
                      style={{ fontSize: '12px', fontWeight: 700, background: s.bg, color: s.color }}
                    >
                      {p.replace('Amazon Prime Video', 'Prime Video').replace('Apple TV Plus', 'Apple TV+').replace('Paramount Plus', 'Paramount+')}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {movie.notes && (
            <div className="rounded-2xl p-3.5" style={{ background: '#FAFAFA', border: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }} className="mb-1.5 flex items-center gap-1">
                <StickyNote size={10} /> Mi nota
              </p>
              <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', fontStyle: 'italic' }}>
                "{movie.notes}"
              </p>
            </div>
          )}

          {/* Series info */}
          {movie.type === 'series' && (
            <div className="rounded-2xl p-4 flex flex-wrap gap-4" style={{ background: '#F5F3FF', border: '1px solid #EDE9FE' }}>
              <div className="flex items-center gap-1.5">
                <Tv size={14} style={{ color: '#7C3AED' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#5B21B6' }}>Serie</span>
              </div>
              {movie.seasons && (
                <div className="text-center">
                  <p style={{ fontSize: '18px', fontWeight: 700, color: '#7C3AED', lineHeight: 1 }}>{movie.seasons}</p>
                  <p style={{ fontSize: '10px', color: '#9CA3AF' }}>temporadas</p>
                </div>
              )}
              {movie.episodes && (
                <div className="text-center">
                  <p style={{ fontSize: '18px', fontWeight: 700, color: '#7C3AED', lineHeight: 1 }}>{movie.episodes}</p>
                  <p style={{ fontSize: '10px', color: '#9CA3AF' }}>episodios</p>
                </div>
              )}
              {movie.currentSeason && (
                <div className="text-center">
                  <p style={{ fontSize: '18px', fontWeight: 700, color: '#F97316', lineHeight: 1 }}>T{movie.currentSeason}</p>
                  <p style={{ fontSize: '10px', color: '#9CA3AF' }}>viendo ahora</p>
                </div>
              )}
              {movie.seriesStatus && (
                <span
                  className="px-2.5 py-1 rounded-xl self-center"
                  style={{
                    fontSize: '11px', fontWeight: 700,
                    background: movie.seriesStatus === 'En emisión' ? '#ECFDF5' : movie.seriesStatus === 'Finalizada' ? '#F3F4F6' : '#FEF2F2',
                    color: movie.seriesStatus === 'En emisión' ? '#059669' : movie.seriesStatus === 'Finalizada' ? '#374151' : '#EF4444',
                  }}
                >
                  {movie.seriesStatus === 'En emisión' ? '🟢' : movie.seriesStatus === 'Finalizada' ? '✅' : '🔴'} {movie.seriesStatus}
                </span>
              )}
            </div>
          )}

          {/* Date added */}
          <p style={{ fontSize: '11px', color: '#D1D5DB' }}>
            {movie.type === 'series' ? 'Serie agregada' : 'Agregada'} el {new Date(movie.dateAdded).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-2 flex-shrink-0">
          {/* Status cycle button */}
          {!readOnly && (
            <button
              onClick={() => onStatusChange(movie.id, nextStatus[movie.status])}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all hover:opacity-80"
              style={{ fontSize: '12px', fontWeight: 600, color: cfg.textColor, background: cfg.bg, borderColor: cfg.border }}
            >
              {cfg.icon}
              {cfg.label}
            </button>
          )}

          <div className="flex-1" />

          {!readOnly && (
            <>
              <button
                onClick={() => { onEdit(movie); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 transition-colors hover:bg-violet-50 hover:border-violet-300"
                style={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}
              >
                <Edit2 size={13} style={{ color: '#7C3AED' }} />
                Editar
              </button>
              <button
                onClick={() => { onDelete(movie.id); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 transition-colors hover:bg-red-50 hover:border-red-200"
                style={{ fontSize: '12px', fontWeight: 500, color: '#EF4444' }}
              >
                <Trash2 size={13} />
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
