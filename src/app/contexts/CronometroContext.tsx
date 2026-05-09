import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cronometroService } from '../services/api';
import { CronometroState, SessaoCronometro } from '../types/api';
import { useAuth } from './AuthContext';

interface CronometroContextType {
  cronometros: CronometroState[];
  carregando: boolean;
  iniciar: (intervencaoId: string, tipo: 'presencial' | 'remoto') => Promise<void>;
  pausar: (id: string) => Promise<void>;
  retomar: (id: string) => Promise<void>;
  parar: (id: string, descricao: string, horas: number) => Promise<void>;
  recuperarLocal: () => void;
  limparLocal: (id: string) => void;
}

const CronometroContext = createContext<CronometroContextType | undefined>(undefined);

export function CronometroProvider({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();
  const [cronometros, setCronometros] = useState<CronometroState[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Carregar sessões iniciais do backend e localStorage
  useEffect(() => {
    if (usuario?.perfil === 'tecnico') {
      carregarSessoes();
    } else {
      setCarregando(false);
    }
  }, [usuario]);

  const carregarSessoes = async () => {
    try {
      const sessoes = await cronometroService.listar();
      const localSessoes = JSON.parse(localStorage.getItem('cronometros_ativos') || '[]');
      
      // Merge backend and local data (backend has priority for state, local for recent calculation)
      const merged: CronometroState[] = sessoes.map(s => {
        const local = localSessoes.find((l: any) => l.id === s.id);
        return {
          ...s,
          tempoAtual: local ? local.tempoAtual : s.tempo_acumulado
        };
      });

      setCronometros(merged);
    } catch (error) {
      console.error('Erro ao carregar cronómetros:', error);
      // Se falhar API, tenta usar local
      const local = JSON.parse(localStorage.getItem('cronometros_ativos') || '[]');
      setCronometros(local);
    } finally {
      setCarregando(false);
    }
  };

  // Persistência local
  useEffect(() => {
    if (cronometros.length > 0) {
      localStorage.setItem('cronometros_ativos', JSON.stringify(cronometros));
    } else {
      localStorage.removeItem('cronometros_ativos');
    }
  }, [cronometros]);

  // Atualizador de segundos em tempo real
  useEffect(() => {
    const timer = setInterval(() => {
      setCronometros(prev => prev.map(c => {
        if (c.status === 'ativo') {
          const inicio = new Date(c.hora_inicio).getTime();
          const agora = new Date().getTime();
          
          // Calcula pausas
          let duracaoPausas = 0;
          c.pausas?.forEach(p => {
            if (p.fim) {
              duracaoPausas += p.duracao;
            } else {
              // Se houver uma pausa aberta, o timer não deveria estar 'ativo'
              // mas por segurança calculamos até agora
              const pausaInicio = new Date(p.inicio).getTime();
              duracaoPausas += (agora - pausaInicio) / 1000;
            }
          });

          const decorrido = (agora - inicio) / 1000 - duracaoPausas;
          return { ...c, tempoAtual: Math.max(0, Math.floor(decorrido)) };
        }
        return c;
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [cronometros]);

  // Sincronização periódica (30s)
  useEffect(() => {
    const syncTimer = setInterval(() => {
      cronometros.forEach(c => {
        if (c.status === 'ativo' && c.tempoAtual) {
          cronometroService.sincronizar(c.id, c.tempoAtual).catch(err => {
            console.warn('Falha na sincronização do cronómetro:', err);
          });
        }
      });
    }, 30000);

    return () => clearInterval(syncTimer);
  }, [cronometros]);

  const iniciar = async (intervencaoId: string, tipo: 'presencial' | 'remoto') => {
    if (cronometros.length >= 3) {
      throw new Error('Limite de 3 cronómetros atingido.');
    }
    const novaSessao = await cronometroService.iniciar({ intervencao_id: intervencaoId, tipo });
    setCronometros(prev => [...prev, { ...novaSessao, tempoAtual: 0 }]);
  };

  const pausar = async (id: string) => {
    const sessao = await cronometroService.pausar(id);
    setCronometros(prev => prev.map(c => c.id === id ? { ...c, ...sessao } : c));
  };

  const retomar = async (id: string) => {
    const sessao = await cronometroService.retomar(id);
    setCronometros(prev => prev.map(c => c.id === id ? { ...c, ...sessao } : c));
  };

  const parar = async (id: string, descricao: string, horas: number) => {
    await cronometroService.parar(id, { descricao, horas });
    setCronometros(prev => prev.filter(c => c.id !== id));
  };

  const recuperarLocal = () => {
    const local = JSON.parse(localStorage.getItem('cronometros_ativos') || '[]');
    setCronometros(local);
  };

  const limparLocal = (id: string) => {
    setCronometros(prev => prev.filter(c => c.id !== id));
  };

  return (
    <CronometroContext.Provider value={{ 
      cronometros, 
      carregando, 
      iniciar, 
      pausar, 
      retomar, 
      parar,
      recuperarLocal,
      limparLocal
    }}>
      {children}
    </CronometroContext.Provider>
  );
}

export function useCronometro() {
  const context = useContext(CronometroContext);
  if (context === undefined) {
    throw new Error('useCronometro deve ser usado dentro de um CronometroProvider');
  }
  return context;
}
