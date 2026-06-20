import { Movie } from '../types';
import { Play, Check, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface HeroBannerProps {
  movie: Movie;
  onStatusChange: (id: string, status: 'watching' | 'watched') => void;
  onDetail: (movie: Movie) => void;
}

export function HeroBanner({ movie, onStatusChange, onDetail }: HeroBannerProps) {
  if (!movie) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onClick={() => onDetail(movie)}
      className="relative w-full rounded-3xl overflow-hidden cursor-pointer shadow-2xl mb-8 group"
      style={{ height: '400px', backgroundColor: '#111' }}
    >
      {/* Background Poster */}
      {movie.poster ? (
        <img
          src={movie.poster}
          alt={movie.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          style={{ objectPosition: 'center 20%' }}
        />
      ) : (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center text-8xl">🎬</div>
      )}

      {/* Gradient Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(10,10,10,1) 0%, rgba(10,10,10,0.4) 50%, rgba(0,0,0,0.1) 100%)'
        }}
      />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 flex flex-col justify-end">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {movie.genres && movie.genres.length > 0 && (
            <span className="inline-block mb-3 px-3 py-1 rounded-full text-xs font-bold bg-violet-600/80 text-white backdrop-blur-md border border-violet-400/30">
              {movie.genres[0]}
            </span>
          )}

          <h2 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight leading-tight">
            {movie.title}
          </h2>

          <div className="flex items-center gap-4 mb-4 text-sm font-medium text-gray-300">
            {movie.year && <span>{movie.year}</span>}
            {movie.rating > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                ⭐ {movie.rating}/5
              </span>
            )}
            <span className="flex items-center gap-1 text-cyan-400">
              <Clock size={14} /> Pendiente
            </span>
          </div>

          {movie.overview && (
            <p className="text-gray-300 text-sm md:text-base max-w-2xl line-clamp-2 md:line-clamp-3 mb-6 leading-relaxed">
              {movie.overview}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(movie.id, 'watching');
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-200 transition-colors"
            >
              <Play size={18} className="fill-black" />
              Ver ahora
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(movie.id, 'watched');
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/20 text-white font-bold backdrop-blur-md hover:bg-white/30 transition-colors border border-white/10"
            >
              <Check size={18} />
              Ya la vi
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
