import { useState, useEffect } from 'react';
import { X, Heart, X as XIcon, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Movie } from '../types';

interface MatchGameProps {
  movies: Movie[];
  currentUser: string;
  onVote: (movieId: string, vote: 'yes' | 'no') => void;
  onClose: () => void;
}

export function MatchGame({ movies, currentUser, onVote, onClose }: MatchGameProps) {
  // Only play with pending movies
  const pendingMovies = movies.filter(m => m.status === 'pending');
  
  // Find movies the user hasn't voted on yet
  const [currentIndex, setCurrentIndex] = useState(0);
  const unvotedMovies = pendingMovies.filter(m => !m.matchVotes?.[currentUser]);

  const [matchAlert, setMatchAlert] = useState<Movie | null>(null);

  // If there's a match, trigger confetti
  const checkForMatch = (movie: Movie, vote: 'yes' | 'no') => {
    if (vote === 'yes') {
      const yesVotes = movie.matchVotes ? Object.values(movie.matchVotes).filter(v => v === 'yes').length : 0;
      // If someone else already voted yes, and now I vote yes = MATCH!
      if (yesVotes >= 1) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        setMatchAlert(movie);
      }
    }
  };

  const handleVote = (vote: 'yes' | 'no') => {
    if (currentIndex >= unvotedMovies.length) return;
    const movie = unvotedMovies[currentIndex];
    onVote(movie.id, vote);
    checkForMatch(movie, vote);
    
    if (!matchAlert) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleContinueAfterMatch = () => {
    setMatchAlert(null);
    setCurrentIndex(prev => prev + 1);
  };

  const currentMovie = unvotedMovies[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(17, 24, 39, 0.95)', backdropFilter: 'blur(10px)' }}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <X size={20} />
      </button>

      <div className="w-full max-w-sm flex flex-col items-center">
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }} className="mb-2">
          Minijuego Match ❤️
        </h2>
        <p style={{ fontSize: '14px', color: '#9CA3AF' }} className="mb-8 text-center">
          Vota las películas que quieras ver. Si tú y tus amigos coinciden, ¡habrá un Match!
        </p>

        {matchAlert ? (
          <div className="bg-white rounded-3xl p-6 text-center animate-in zoom-in duration-300 w-full shadow-2xl shadow-pink-500/20">
            <div className="text-5xl mb-4">🎉</div>
            <h3 style={{ fontSize: '28px', fontWeight: 800, color: '#EC4899' }} className="mb-2">¡MATCH!</h3>
            <p style={{ fontSize: '16px', color: '#4B5563', lineHeight: '1.5' }} className="mb-6">
              ¡A todos les gustaría ver <strong>{matchAlert.title}</strong>!
            </p>
            <div className="rounded-2xl overflow-hidden mb-6 mx-auto" style={{ width: '140px', height: '210px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
              {matchAlert.poster ? (
                <img src={matchAlert.poster} alt={matchAlert.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-4xl">🎬</div>
              )}
            </div>
            <button
              onClick={handleContinueAfterMatch}
              className="w-full py-3 rounded-xl text-white font-bold transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)' }}
            >
              Seguir jugando
            </button>
          </div>
        ) : currentMovie ? (
          <div className="w-full">
            {/* Tarjeta de la película */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl mb-8 relative" style={{ height: '420px' }}>
              {currentMovie.poster ? (
                <img src={currentMovie.poster} alt={currentMovie.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center p-6 text-center">
                  <span className="text-6xl mb-4">🎬</span>
                </div>
              )}
              
              {/* Gradiente para el texto */}
              <div className="absolute inset-x-0 bottom-0 p-6 pt-24" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)' }}>
                <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'white', lineHeight: '1.2' }} className="mb-1">
                  {currentMovie.title}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  {currentMovie.year && <span style={{ fontSize: '14px', color: '#D1D5DB' }}>{currentMovie.year}</span>}
                  {currentMovie.genres.length > 0 && (
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#A78BFA' }}>• {currentMovie.genres[0]}</span>
                  )}
                </div>
                {currentMovie.overview && (
                  <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: '1.5' }} className="line-clamp-3">
                    {currentMovie.overview}
                  </p>
                )}
              </div>
            </div>

            {/* Controles de votación */}
            <div className="flex justify-center gap-6">
              <button
                onClick={() => handleVote('no')}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl transition-transform hover:scale-110 active:scale-95"
                style={{ color: '#EF4444' }}
              >
                <XIcon size={28} strokeWidth={3} />
              </button>
              <button
                onClick={() => handleVote('yes')}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl transition-transform hover:scale-110 active:scale-95"
                style={{ color: '#10B981' }}
              >
                <Heart size={28} strokeWidth={3} className="fill-emerald-500 text-emerald-500" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto rounded-full bg-white/10 flex items-center justify-center mb-6 text-4xl">
              🍿
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'white' }} className="mb-2">
              ¡Estás al día!
            </h3>
            <p style={{ fontSize: '15px', color: '#9CA3AF' }} className="mb-8">
              Has votado por todas las películas pendientes de esta sala.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-white text-gray-900 font-bold hover:bg-gray-100 transition-colors"
            >
              Cerrar minijuego
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
