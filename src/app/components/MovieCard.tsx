import { Star, Clock, Eye, CheckCircle2, Edit2, Trash2, StickyNote, ChevronDown, ChevronUp, Monitor, Film, Tv } from 'lucide-react';
import { useState, useEffect } from 'react';
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
  onUpdateMovie?: (movie: Movie) => void;
  currentUser?: string;
  readOnly?: boolean;
}

export function MovieCard({ movie, onEdit, onDelete, onStatusChange, onDetail, onUpdateMovie, currentUser, readOnly }: MovieCardProps) {
  const config = STATUS_CONFIG[movie.status];
  const [expanded, setExpanded] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (movie.watchingSince) {
      const target = new Date(movie.watchingSince).getTime();
      const interval = setInterval(() => {
        const now = Date.now();
        if (target > now) {
          setCountdown(Math.ceil((target - now) / 1000));
        } else if (now - target < 5000) {
          setCountdown(0); // 0 means "¡Play!"
        } else {
          setCountdown(null);
          clearInterval(interval);
        }
      }, 200);
      return () => clearInterval(interval);
    } else {
      setCountdown(null);
    }
  }, [movie.watchingSince]);

  const hasDetails = movie.overview || movie.notes;

  const handleInterestToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser || !onUpdateMovie) return;
    const currentList = movie.interestVotes || [];
    const newList = currentList.includes(currentUser)
      ? currentList.filter(u => u !== currentUser)
      : [...currentList, currentUser];
    onUpdateMovie({ ...movie, interestVotes: newList });
  };

  const yesVotes = movie.matchVotes ? Object.values(movie.matchVotes).filter(v => v === 'yes').length : 0;
  const isMatch = yesVotes >= 2;
  const isWatchingNow = movie.status === 'watching' && movie.watchingSince && new Date(movie.watchingSince).getTime() > Date.now() - 1000 * 60 * 60 * 3; // within 3 hours

  return (
    <div
      className={`group bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer h-full flex flex-col relative ${isMatch ? 'ring-2 ring-pink-400' : isWatchingNow ? 'ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'border-gray-100 dark:border-gray-800'}`}
      style={{ boxShadow: expanded ? '0 4px 20px rgba(124,58,237,0.08)' : undefined,
               borderColor: expanded ? '#DDD6FE' : undefined }}
      onClick={() => onDetail?.(movie)}
    >
      {countdown !== null && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <span className="text-white font-bold animate-ping" style={{ fontSize: countdown === 0 ? '48px' : '72px' }}>
            {countdown === 0 ? '▶️ PLAY' : countdown}
          </span>
        </div>
      )}
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
                  <h3 className="leading-tight truncate text-gray-900 dark:text-gray-100" style={{ fontSize: '14px', fontWeight: 700 }}>
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
              <p style={{ fontSize: '12px', lineHeight: '1.5' }} className="text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                {movie.overview}
              </p>
            )}

            {/* Genres */}
            {movie.genres.length > 0 && (
              <div className="flex gap-1 flex-wrap mb-2">
                {movie.genres.slice(0, 3).map(g => (
                  <span key={g} style={{ fontSize: '10px' }} className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
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
            {/* Stars or Interest */}
            {movie.status === 'pending' && currentUser ? (
              <button
                onClick={handleInterestToggle}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-colors"
                style={{ 
                  background: movie.interestVotes?.includes(currentUser) ? '#FEF2F2' : 'transparent',
                  borderColor: movie.interestVotes?.includes(currentUser) ? '#FECACA' : '#F3F4F6',
                  color: movie.interestVotes?.includes(currentUser) ? '#EF4444' : '#9CA3AF',
                  fontSize: '11px', fontWeight: 600
                }}
              >
                🔥 {movie.interestVotes?.length || 0}
              </button>
            ) : (
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(n => {
                  const userRatings = movie.userRatings || {};
                  const myRating = currentUser && userRatings[currentUser] ? userRatings[currentUser] : movie.rating;
                  return (
                    <button
                      key={n}
                      disabled={readOnly || !onUpdateMovie}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (readOnly || !onUpdateMovie) return;
                        if (currentUser) {
                          onUpdateMovie({ ...movie, userRatings: { ...userRatings, [currentUser]: n } });
                        } else {
                          onUpdateMovie({ ...movie, rating: n });
                        }
                      }}
                      className="transition-transform hover:scale-125 disabled:cursor-default"
                    >
                      <Star
                        size={14}
                        className={n <= myRating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200 transition-colors'}
                      />
                    </button>
                  );
                })}
              </div>
            )}

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
          
          {/* Play Sync Button */}
          {movie.status === 'watching' && currentUser && !readOnly && onUpdateMovie && (
            <button
              onClick={e => {
                e.stopPropagation();
                onUpdateMovie({ ...movie, watchingSince: new Date(Date.now() + 6000).toISOString() });
              }}
              className="mt-2.5 w-full py-1.5 rounded-xl text-white font-bold flex items-center justify-center gap-1 transition-colors"
              style={{ background: '#06B6D4', fontSize: '12px' }}
            >
              ▶️ Empezar a ver juntos
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t px-4 py-3 flex flex-col gap-2.5 bg-gray-50 border-gray-100 dark:bg-gray-900/50 dark:border-gray-800">
          {movie.overview && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }} className="text-gray-400 dark:text-gray-500 mb-1">Sinopsis</p>
              <p style={{ fontSize: '13px', lineHeight: '1.6' }} className="text-gray-700 dark:text-gray-300">{movie.overview}</p>
            </div>
          )}
          {movie.streamingPlatforms && movie.streamingPlatforms.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }} className="text-gray-400 dark:text-gray-500 mb-1.5">
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
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }} className="text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1">
                <StickyNote size={10} /> Mi nota
              </p>
              <p style={{ fontSize: '13px', lineHeight: '1.6', fontStyle: 'italic' }} className="text-gray-700 dark:text-gray-300">"{movie.notes}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
