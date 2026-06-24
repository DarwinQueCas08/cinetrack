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

  const hasVotedInterest = currentUser && movie.interestVotes?.includes(currentUser);

  return (
    <div
      className={`group bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer h-full flex flex-col relative ${isMatch ? 'ring-2 ring-pink-400' : isWatchingNow ? 'ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'border-gray-100 dark:border-gray-800'}`}
      style={{ boxShadow: expanded ? '0 4px 20px rgba(124,58,237,0.08)' : undefined,
               borderColor: expanded ? '#DDD6FE' : undefined }}
      onClick={() => onDetail?.(movie)}
    >
      {countdown !== null && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <span className="text-white font-bold animate-ping" style={{ fontSize: countdown === 0 ? '48px' : '72px' }}>
            {countdown === 0 ? '▶️ PLAY' : countdown}
          </span>
        </div>
      )}

      {/* Top: Poster (Vertical layout) */}
      <div className="relative w-full bg-gray-50 dark:bg-gray-800 flex-shrink-0" style={{ aspectRatio: '2/3' }}>
        {movie.poster ? (
          <img
            src={movie.poster}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-2">
            <Film size={32} className="opacity-20" />
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em' }} className="uppercase">Sin póster</span>
          </div>
        )}

        {/* Floating Badges over Poster */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
          <span
            className="flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-md shadow-sm"
            style={{ fontSize: '10px', fontWeight: 700, color: config.textColor, background: config.bg, border: `1px solid ${config.border}` }}
          >
            {config.icon}
            {config.label}
          </span>
          {movie.platform && (
            <span
              className="flex items-center justify-center px-2 py-1 rounded-lg backdrop-blur-md shadow-sm"
              style={{ fontSize: '10px', fontWeight: 700, ...platformStyle(movie.platform) }}
            >
              {movie.platform.replace('Amazon Prime Video', 'Prime').replace('Apple TV Plus', 'Apple TV+').replace('Paramount Plus', 'Paramount+')}
            </span>
          )}
        </div>
      </div>
      
      {/* Bottom: Content */}
      <div className="flex flex-col flex-1 p-4 bg-white dark:bg-gray-900 relative z-10">
        {/* Title & Type */}
        <div className="flex gap-2 items-start justify-between mb-1.5">
          <h3 className="leading-tight line-clamp-2 text-gray-900 dark:text-gray-100" style={{ fontSize: '15px', fontWeight: 700 }}>
            {movie.title}
          </h3>
          <div className="mt-0.5">
            {movie.type === 'series'
              ? <Tv size={14} style={{ color: '#7C3AED' }} />
              : <Film size={14} style={{ color: '#F97316' }} />}
          </div>
        </div>

        {/* Year */}
        {movie.year && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">
            {movie.year}
          </p>
        )}

        {/* Overview preview (always visible, 2 lines) */}
        {movie.overview && !expanded && (
          <p style={{ fontSize: '12px', lineHeight: '1.5' }} className="text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
            {movie.overview}
          </p>
        )}

        {/* Bottom actions row */}
        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
          {/* Stars or Interest */}
          {movie.status === 'pending' && currentUser ? (
            <button
              onClick={handleInterestToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                hasVotedInterest
                  ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 scale-105 shadow-sm'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
              style={{ fontSize: '12px', fontWeight: 600 }}
              title="¡Me interesa!"
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
                      size={16}
                      className={n <= myRating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200 dark:text-gray-700 dark:fill-gray-700 transition-colors'}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {/* Card Actions */}
          <div className="flex items-center gap-1">
            {!readOnly && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  const order: MovieStatus[] = ['pending', 'watching', 'watched'];
                  const next = order[(order.indexOf(movie.status) + 1) % 3];
                  onStatusChange(movie.id, next);
                }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
                title="Cambiar estado"
              >
                <CheckCircle2 size={16} />
              </button>
            )}
            {hasDetails && (
              <button
                onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
              >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
            {!readOnly && (
               <div className="flex gap-1 ml-1">
                 <button
                   onClick={e => { e.stopPropagation(); onEdit(movie); }}
                   className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30"
                 >
                   <Edit2 size={14} />
                 </button>
                 <button
                   onClick={e => { e.stopPropagation(); onDelete(movie.id); }}
                   className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                 >
                   <Trash2 size={14} />
                 </button>
               </div>
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
            className="mt-3 w-full py-2 rounded-xl text-white font-bold flex items-center justify-center gap-1.5 transition-colors hover:brightness-110"
            style={{ background: '#06B6D4', fontSize: '13px' }}
          >
            ▶️ Empezar a ver juntos
          </button>
        )}
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
