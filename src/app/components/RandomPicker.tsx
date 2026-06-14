import { useState, useEffect } from 'react';
import { X, Shuffle, Star, CheckCircle2 } from 'lucide-react';
import { Movie, MovieStatus } from '../types';

interface RandomPickerProps {
  movies: Movie[];
  onClose: () => void;
  onStatusChange: (id: string, status: MovieStatus) => void;
}

export function RandomPicker({ movies, onClose, onStatusChange }: RandomPickerProps) {
  const candidates = movies.filter(m => m.status === 'pending' || m.status === 'watching');
  const [current, setCurrent] = useState<Movie | null>(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (candidates.length > 0) spin();
  }, []);

  const spin = () => {
    if (candidates.length === 0) return;
    setSpinning(true);
    let count = 0;
    const interval = setInterval(() => {
      setCurrent(candidates[Math.floor(Math.random() * candidates.length)]);
      count++;
      if (count >= 12) {
        clearInterval(interval);
        setSpinning(false);
      }
    }, 80);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-600 to-violet-800 px-6 py-8 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
          <div className="text-4xl mb-3">🎲</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }} className="text-white mb-1">¿Qué veo hoy?</h2>
          <p style={{ fontSize: '13px' }} className="text-violet-200">
            {candidates.length} películas disponibles
          </p>
        </div>

        <div className="p-6">
          {candidates.length === 0 ? (
            <div className="text-center py-6">
              <p style={{ fontSize: '15px', fontWeight: 500 }} className="text-gray-700 mb-1">Lista vacía</p>
              <p style={{ fontSize: '13px' }} className="text-gray-400">Agrega películas pendientes primero</p>
            </div>
          ) : (
            <>
              {/* Movie display */}
              {current && (
                <div
                  className={`flex gap-4 mb-5 transition-all duration-100 ${spinning ? 'opacity-60 scale-95' : 'opacity-100 scale-100'}`}
                >
                  <div className="w-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                    {current.poster ? (
                      <img src={current.poster} alt={current.title} className="w-full h-28 object-cover" />
                    ) : (
                      <div className="w-full h-28 flex items-center justify-center text-3xl">🎬</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }} className="text-gray-900 mb-1 leading-tight">{current.title}</h3>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {current.year && <span style={{ fontSize: '12px' }} className="text-gray-400">{current.year}</span>}
                      {current.platform && (
                        <span style={{ fontSize: '11px' }} className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{current.platform}</span>
                      )}
                    </div>
                    {current.genres.length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-2">
                        {current.genres.slice(0, 3).map(g => (
                          <span key={g} style={{ fontSize: '10px' }} className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{g}</span>
                        ))}
                      </div>
                    )}
                    {current.rating > 0 && (
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} size={11} className={n <= current.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={spin}
                  disabled={spinning}
                  className="w-full py-3 bg-violet-600 text-white rounded-2xl hover:bg-violet-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  style={{ fontSize: '14px', fontWeight: 600 }}
                >
                  <Shuffle size={16} className={spinning ? 'animate-spin' : ''} />
                  {spinning ? 'Eligiendo...' : 'Otra vez'}
                </button>

                {current && !spinning && (
                  <button
                    onClick={() => {
                      onStatusChange(current.id, 'watching');
                      onClose();
                    }}
                    className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-2xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 border border-emerald-100"
                    style={{ fontSize: '14px', fontWeight: 600 }}
                  >
                    <CheckCircle2 size={16} />
                    ¡Esta la veo!
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
