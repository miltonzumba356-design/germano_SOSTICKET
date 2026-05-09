import React, { useState } from 'react';
import { Clock, Pause, Play, Square, ChevronUp, ChevronDown, Laptop, MapPin } from 'lucide-react';
import { useCronometro } from '../contexts/CronometroContext';

export function WidgetCronometro() {
  const { cronometros, pausar, retomar, parar } = useCronometro();
  const [minimizado, setMinimizado] = useState(false);

  // Só mostra se houver cronómetros ativos ou pausados
  if (cronometros.length === 0) return null;

  // Pegamos o primeiro para o widget principal se houver múltiplos
  const c = cronometros[0];

  const formatarTempo = (segundos: number) => {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = Math.floor(segundos % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[9999] transition-all duration-500 transform ${minimizado ? 'translate-y-2' : ''}`}>
      <div className="bg-gray-900 text-white rounded-[24px] shadow-2xl border border-white/10 overflow-hidden w-72">
        {/* Header do Widget */}
        <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${c.status === 'ativo' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {c.intervencao_numero || 'Timer Ativo'}
              </span>
           </div>
           <button onClick={() => setMinimizado(!minimizado)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              {minimizado ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
           </button>
        </div>

        {/* Conteúdo (Escondido se minimizado) */}
        {!minimizado && (
          <div className="p-5 space-y-4">
             <div>
                <h4 className="text-sm font-bold truncate">{c.intervencao_titulo || 'Trabalho em curso...'}</h4>
                <div className="flex items-center gap-2 mt-1">
                   {c.tipo === 'presencial' ? <MapPin className="w-3 h-3 text-blue-400" /> : <Laptop className="w-3 h-3 text-purple-400" />}
                   <span className="text-[10px] text-gray-400 font-bold uppercase">{c.tipo}</span>
                </div>
             </div>

             <div className="flex flex-col items-center py-2">
                <div className="text-3xl font-black tabular-nums tracking-tighter">
                   {formatarTempo(c.tempoAtual || 0)}
                </div>
                <p className="text-[10px] text-emerald-500 font-black uppercase mt-1 tracking-widest">
                   {c.status === 'ativo' ? 'Contando...' : 'Em Pausa'}
                </p>
             </div>

             <div className="flex gap-2">
                {c.status === 'ativo' ? (
                  <button 
                    onClick={() => pausar(c.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500/10 text-amber-500 rounded-xl text-[10px] font-black uppercase hover:bg-amber-500 hover:text-white transition-all"
                  >
                    <Pause className="w-3 h-3" /> Pausar
                  </button>
                ) : (
                  <button 
                    onClick={() => retomar(c.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-all"
                  >
                    <Play className="w-3 h-3" /> Retomar
                  </button>
                )}
                <button 
                  onClick={() => {/* Redirecionar para página de horas ou abrir modal? 
                    Por agora apenas indicamos que deve ir à página principal para parar com segurança */}}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all"
                >
                  <Square className="w-3 h-3" /> Parar
                </button>
             </div>
          </div>
        )}

        {/* Barra de progresso visual pequena se minimizado */}
        {minimizado && (
          <div className="px-4 py-2 flex items-center justify-between">
             <div className="text-lg font-black tabular-nums">{formatarTempo(c.tempoAtual || 0)}</div>
             <div className="flex gap-2">
               {c.status === 'ativo' ? 
                 <button onClick={() => pausar(c.id)} className="p-1 text-amber-500"><Pause className="w-4 h-4" /></button> :
                 <button onClick={() => retomar(c.id)} className="p-1 text-emerald-500"><Play className="w-4 h-4" /></button>
               }
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
