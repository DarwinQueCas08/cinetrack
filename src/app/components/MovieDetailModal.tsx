import { useState, useRef, useEffect } from 'react';
import { X, Star, MessageCircle, Send, StickyNote, Clock, Eye, CheckCircle2, Edit2, Trash2, Calendar, Tv, Monitor } from 'lucide-react';
import { Movie, MovieStatus, platformStyle } from '../types';
import { Avatar } from './Avatar';

const STATUS_CONFIG: Record<MovieStatus, { label: string; textColor: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pendiente',   textColor: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE', icon: <Clock size={13} /> },
  watching: { label: 'Viendo',      textColor: '#0369A1', bg: '#E0F2FE', border: '#BAE6FD', icon: <Eye size={13} /> },
  watched:  { label: 'Visto',       textColor: '#15803D', bg: '#DCFCE7', border: '#BBF7D0', icon: <CheckCircle2 size={13} /> },
};

const RATING_LABELS: Record<number, string> = {
  1: 'Horrible',
  2: 'Mala',
  3: 'Regular',
  4: 'Buena',
  5: 'Obra maestra'
};

interface MovieDetailModalProps {
  movie: Movie;
  onClose: () => void;
  onEdit?: (m: Movie) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, s: MovieStatus) => void;
  readOnly?: boolean;
  currentUser?: string;
  onUpdateMovie?: (m: Movie) => void;
}

export function MovieDetailModal({ movie, onClose, onEdit, onDelete, onStatusChange, readOnly, currentUser, onUpdateMovie }: MovieDetailModalProps) {
  const [newComment, setNewComment] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CONFIG[movie.status];
  const nextStatus: Record<MovieStatus, MovieStatus> = { pending: 'watching', watching: 'watched', watched: 'pending' };

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [movie.comments]);

  const handleAddComment = () => {
    if (newComment.trim() && currentUser && onUpdateMovie) {
      const comment = { id: Date.now().toString(), user: currentUser, text: newComment.trim(), date: new Date().toISOString() };
      onUpdateMovie({ ...movie, comments: [...(movie.comments || []), comment] });
      setNewComment('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10" style={{ maxHeight: '85vh' }}>
        
        {/* Dynamic Blurred Background */}
        {movie.poster && (
          <div 
            className="absolute inset-0 z-0 opacity-20 dark:opacity-40 mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage: `url(${movie.poster})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(40px)',
            }}
          />
        )}

        {/* Hero Poster */}
        {movie.poster && (
          <div className="relative w-full h-48 sm:h-56 flex-shrink-0 z-10">
            <img
              src={movie.poster}
              alt={movie.title}
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 20%' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/10 to-black/40 dark:from-gray-900/95 dark:via-gray-900/10" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b border-gray-200/50 dark:border-gray-700/50 relative z-10 ${movie.poster ? '-mt-4' : ''}`}>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white truncate pr-4 tracking-tight">
            {movie.title}
          </h2>
          {!movie.poster && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 relative z-10 custom-scrollbar">
          
          {/* Metadata */}
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm"
              style={{ color: cfg.textColor, background: cfg.bg, border: `1px solid ${cfg.border}` }}
            >
              {cfg.icon} {cfg.label}
            </span>

            {movie.year && (
              <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                <Calendar size={12} /> {movie.year}
              </span>
            )}

            {movie.platform && (
              <span className="flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-800">
                <Monitor size={12} /> {movie.platform}
              </span>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-3 bg-gray-50/80 dark:bg-gray-800/80 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => {
                const userRatings = movie.userRatings || {};
                const myRating = currentUser && userRatings[currentUser] ? userRatings[currentUser] : movie.rating;
                return (
                  <button
                    key={n}
                    disabled={readOnly || !onUpdateMovie}
                    onClick={() => {
                      if (readOnly || !onUpdateMovie) return;
                      if (currentUser) onUpdateMovie({ ...movie, userRatings: { ...userRatings, [currentUser]: n } });
                      else onUpdateMovie({ ...movie, rating: n });
                    }}
                    className="transition-transform hover:scale-125 disabled:cursor-default"
                  >
                    <Star
                      size={24}
                      className={n <= myRating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}
                    />
                  </button>
                );
              })}
            </div>
            {(() => {
              const userRatings = movie.userRatings || {};
              const avgRating = Object.keys(userRatings).length > 0 
                ? Object.values(userRatings).reduce((a, b) => a + b, 0) / Object.keys(userRatings).length
                : movie.rating;
              if (avgRating > 0) {
                return (
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {avgRating.toFixed(1)} {Object.keys(userRatings).length > 0 ? '(Promedio)' : RATING_LABELS[Math.round(avgRating)]}
                  </span>
                );
              }
              return <span className="text-xs text-gray-400 dark:text-gray-500">Sin calificar</span>;
            })()}
          </div>

          {/* Genres */}
          {movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {movie.genres.map(g => (
                <span key={g} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          {movie.overview && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sinopsis</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{movie.overview}</p>
            </div>
          )}

          {/* Streaming Platforms */}
          {movie.streamingPlatforms && movie.streamingPlatforms.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Disponible en</h3>
              <div className="flex flex-wrap gap-2">
                {movie.streamingPlatforms.map(p => {
                  const s = platformStyle(p);
                  return (
                    <span
                      key={p}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {p.replace('Amazon Prime Video', 'Prime Video').replace('Apple TV Plus', 'Apple TV+').replace('Paramount Plus', 'Paramount+')}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Series Info */}
          {movie.type === 'series' && (
            <div className="rounded-2xl p-4 flex flex-wrap gap-4 bg-violet-50/50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/30">
              <div className="flex items-center gap-1.5">
                <Tv size={14} className="text-violet-600 dark:text-violet-400" />
                <span className="text-sm font-bold text-violet-800 dark:text-violet-300">Serie</span>
              </div>
              {movie.seasons && (
                <div className="text-center">
                  <p className="text-lg font-bold text-violet-600 dark:text-violet-400 leading-none">{movie.seasons}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">temporadas</p>
                </div>
              )}
              {movie.episodes && (
                <div className="text-center">
                  <p className="text-lg font-bold text-violet-600 dark:text-violet-400 leading-none">{movie.episodes}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">episodios</p>
                </div>
              )}
              {movie.currentSeason && (
                <div className="text-center">
                  <p className="text-lg font-bold text-orange-500 dark:text-orange-400 leading-none">T{movie.currentSeason}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">viendo ahora</p>
                </div>
              )}
            </div>
          )}

          {/* Your Notes */}
          {movie.notes && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <StickyNote size={12} /> Tu Nota Personal
              </h3>
              <div className="bg-amber-50/50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-3 text-sm text-gray-700 dark:text-gray-300 italic">
                "{movie.notes}"
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
              <MessageCircle size={12} /> Comentarios
            </h3>
            
            <div className="space-y-3 mb-4">
              {movie.comments && movie.comments.length > 0 ? (
                movie.comments.map(comment => (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar name={comment.user} size={24} />
                    <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-2xl rounded-tl-none p-3 border border-gray-100 dark:border-gray-700/50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-gray-900 dark:text-gray-200">{comment.user}</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {new Date(comment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4 italic">
                  Nadie ha comentado aún. ¡Sé el primero!
                </p>
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Comment Input */}
            {!readOnly && onUpdateMovie && (
              <div className="flex gap-2 items-end relative z-10">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  placeholder="Escribe un comentario..."
                  className="flex-1 bg-gray-100 dark:bg-gray-800/80 border-transparent focus:bg-white dark:focus:bg-gray-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-900 rounded-xl px-4 py-2.5 text-sm resize-none text-gray-900 dark:text-gray-100"
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="p-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        {!readOnly && (
          <div className="p-4 bg-gray-50/80 dark:bg-gray-800/80 border-t border-gray-200/50 dark:border-gray-700/50 flex flex-wrap gap-2 relative z-10">
            {onStatusChange && (
              <button
                onClick={() => onStatusChange(movie.id, nextStatus[movie.status])}
                className="flex-1 flex justify-center items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
              >
                Mover a {STATUS_CONFIG[nextStatus[movie.status]].label}
              </button>
            )}
            <div className="flex gap-2">
              {onEdit && (
                <button
                  onClick={() => { onClose(); onEdit(movie); }}
                  className="p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => { onClose(); onDelete(movie.id); }}
                  className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors shadow-sm"
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
