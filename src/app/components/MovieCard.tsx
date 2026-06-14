import { Star, Clock, Eye, CheckCircle2, Edit2, Trash2, StickyNote, ChevronDown, ChevronUp, Monitor, Film, Tv } from 'lucide-react';
import { useState } from 'react';
import { Movie, MovieStatus, platformStyle } from '../types';

const STATUS_CONFIG: Record<MovieStatus, { label: string; textColor: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pendiente',
    textColor: '#6D28D9',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    icon: <Clock size={11} />,
  },
  watching: {
    label: 'Viendo ahora',
    textColor: '#0891B2',
    bg: '#ECFEFF',
    border: '#A5F3FC',
    icon: <Eye size={11} />,
  },
  watched: {
    label: 'Visto ✓',
    textColor: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    icon: <CheckCircle2 size={11} />,
  },
};

interface MovieCardProps {
  movie: Movie;
  onEdit: (movie: Movie) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: MovieStatus) => void;
  onDetail?: (movie: Movie) => void;
  readOnly?: boolean;
}

export function MovieCard({ movie, onEdit, onDelete, onStatusChange, onDetail, readOnly }: MovieCardProps) {
  const config = STATUS_CONFIG[movie.status];
  const [expanded, setExpanded] = useState(false);

  const hasDetails = movie.overview || movie.notes;

  return (
    <div
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-200 cursor-pointer h-full flex flex-col"
      style={{ boxShadow: expanded ? '0 4px 20px rgba(124,58,237,0.08)' : undefined,
               borderColor: expanded ? '#DDD6FE' : undefined }}
      onClick={() => onDetail?.(movie)}
    >
      <div className="flex gap-0 flex-1">
        {/* Poster */}
        <div className="relative flex-shrink-0 w-24 sm:w-28 bg-gray-50" style={{ minHeight: '160px' }}>
          {movie.poster ? (
            <img
              src={movie.poster}
              alt={movie.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center">
              <span className="text-3xl">🎬</span>
            </div>
          )}
          {/* Status color stripe */}
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: config.textColor, opacity: 0.7 }} />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {movie.type === 'series'
                    ? <Tv size={11} style={{ color: '#7C3AED', flexShrink: 0 }} />
                    : <Film size={11} style={{ color: '#F97316', flexShrink: 0 }} />}
                  <h3 className="leading-tight truncate" style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                    {movie.title}
                  </h3>
                </div>
              </div>
              {!readOnly && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); onEdit(movie); }}
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: '#9CA3AF' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#7C3AED', e.currentTarget.style.background = '#F5F3FF')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF', e.currentTarget.style.background = 'transparent')}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(movie.id); }}
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: '#9CA3AF' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#EF4444', e.currentTarget.style.background = '#FEF2F2')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF', e.currentTarget.style.background = 'transparent')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {movie.year && <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{movie.year}</span>}
              {movie.type === 'series' && movie.seasons && (
                <span style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 600 }}>{movie.seasons} temp.</span>
              )}
              {movie.type === 'series' && movie.seriesStatus && (
                <span
                  className="px-1.5 py-0.5 rounded-full"
                  style={{
                    fontSize: '10px', fontWeight: 600,
                    background: movie.seriesStatus === 'En emisión' ? '#ECFDF5' : movie.seriesStatus === 'Finalizada' ? '#F3F4F6' : '#FEF2F2',
                    color: movie.seriesStatus === 'En emisión' ? '#059669' : movie.seriesStatus === 'Finalizada' ? '#6B7280' : '#EF4444',
                  }}
                >
                  {movie.seriesStatus}
                </span>
              )}
              {movie.platform && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full border"
                  style={{ fontSize: '11px', fontWeight: 500, color: '#EA580C', background: '#FFF7ED', borderColor: '#FED7AA' }}>
                  <Monitor size={9} />{movie.platform}
                </span>
              )}
            </div>

            {/* Overview preview (always visible, 2 lines) */}
            {movie.overview && !expanded && (
              <p style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.5' }} className="mb-2 line-clamp-2">
                {movie.overview}
              </p>
            )}

            {/* Genres */}
            {movie.genres.length > 0 && (
              <div className="flex gap-1 flex-wrap mb-2">
                {movie.genres.slice(0, 3).map(g => (
                  <span key={g} style={{ fontSize: '10px', color: '#6B7280', background: '#F3F4F6' }} className="px-2 py-0.5 rounded-full">
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Streaming platforms available */}
            {movie.streamingPlatforms && movie.streamingPlatforms.length > 0 && (
              <div className="flex gap-1 flex-wrap mb-1">
                {movie.streamingPlatforms.slice(0, 4).map(p => {
                  const s = platformStyle(p);
                  return (
                    <span
                      key={p}
                      style={{ fontSize: '9px', fontWeight: 700, background: s.bg, color: s.color, letterSpacing: '0.02em' }}
                      className="px-1.5 py-0.5 rounded"
                    >
                      {p.replace('Amazon Prime Video', 'Prime').replace('Apple TV Plus', 'Apple TV+').replace('Paramount Plus', 'Paramount+')}
                    </span>
                  );
                })}
                {movie.streamingPlatforms.length > 4 && (
                  <span style={{ fontSize: '9px', color: '#9CA3AF' }} className="px-1 py-0.5">
                    +{movie.streamingPlatforms.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Stars */}
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(n => (
                <Star
                  key={n}
                  size={12}
                  className={n <= movie.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Expand toggle */}
              {hasDetails && (
                <button
                  onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: '#9CA3AF' }}
                >
                  {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              )}

              {/* Status badge */}
              {!readOnly ? (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    const order: MovieStatus[] = ['pending', 'watching', 'watched'];
                    const next = order[(order.indexOf(movie.status) + 1) % 3];
                    onStatusChange(movie.id, next);
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full border cursor-pointer transition-all hover:opacity-80"
                  style={{ fontSize: '11px', fontWeight: 500, color: config.textColor, background: config.bg, borderColor: config.border }}
                >
                  {config.icon}
                  {config.label}
                </button>
              ) : (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full border"
                  style={{ fontSize: '11px', fontWeight: 500, color: config.textColor, background: config.bg, borderColor: config.border }}
                >
                  {config.icon}
                  {config.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t px-4 py-3 flex flex-col gap-2.5" style={{ borderColor: '#F3F4F6', background: '#FAFAFA' }}>
          {movie.overview && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.05em', textTransform: 'uppercase' }} className="mb-1">Sinopsis</p>
              <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>{movie.overview}</p>
            </div>
          )}
          {movie.streamingPlatforms && movie.streamingPlatforms.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.05em', textTransform: 'uppercase' }} className="mb-1.5">
                Disponible en
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {movie.streamingPlatforms.map(p => {
                  const s = platformStyle(p);
                  return (
                    <span key={p} className="px-2.5 py-1 rounded-lg" style={{ fontSize: '11px', fontWeight: 700, background: s.bg, color: s.color }}>
                      {p.replace('Amazon Prime Video', 'Prime Video').replace('Apple TV Plus', 'Apple TV+').replace('Paramount Plus', 'Paramount+')}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {movie.notes && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.05em', textTransform: 'uppercase' }} className="mb-1 flex items-center gap-1">
                <StickyNote size={10} /> Mi nota
              </p>
              <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', fontStyle: 'italic' }}>"{movie.notes}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
