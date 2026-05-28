import React, { createContext, useContext, useState, useEffect } from 'react';
import { intervencoesService } from '../services/api';
import { CronometroState } from '../types/api';
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

const STORAGE_KEY = 'cronometros_ativos';
const CronometroContext = createContext<CronometroContextType | undefined>(undefined);

export function CronometroProvider({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();
  const [cronometros, setCronometros] = useState<CronometroState[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (usuario?.perfil === 'tecnico') {
      carregarSessoes();
    } else {
      setCronometros([]);
      setCarregando(false);
    }
  }, [usuario]);

  const carregarSessoes = () => {
    try {
      const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setCronometros(Array.isArray(local) ? local : []);
    } catch (error) {
      console.error('Erro ao carregar cronometros locais:', error);
      setCronometros([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (cronometros.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cronometros));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [cronometros]);

  useEffect(() => {
    if (cronometros.length === 0) return;

    const timer = setInterval(() => {
      setCronometros(prev => prev.map(c => {
        if (c.status !== 'ativo') return c;

        const inicio = new Date(c.hora_inicio).getTime();
        const agora = Date.now();
        const novoTempo = Math.max(0, Math.floor((agora - inicio) / 1000));

        if (novoTempo === c.tempoAtual) return c;
        return { ...c, tempoAtual: novoTempo, tempo_acumulado: novoTempo };
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [cronometros.length > 0]);

  const iniciar = async (intervencaoId: string, tipo: 'presencial' | 'remoto') => {
    if (cronometros.length >= 3) {
      throw new Error('Limite de 3 cronometros atingido.');
    }

    await intervencoesService.atualizacaoParcial(intervencaoId, {
      status: 'em_andamento',
    });
    const intervencao = await intervencoesService.obterPorId(intervencaoId);

    const novaSessao: CronometroState = {
      id: `local-${intervencaoId}-${Date.now()}`,
      intervencao_id: intervencaoId,
      intervencao_numero: intervencao.numero,
      intervencao_titulo: intervencao.titulo,
      cliente_nome: intervencao.cliente_nome,
      tipo,
      status: 'ativo',
      hora_inicio: new Date().toISOString(),
      tempo_acumulado: 0,
      pausas: [],
      tempoAtual: 0,
    };

    setCronometros(prev => [...prev, novaSessao]);
  };

  const pausar = async (id: string) => {
    setCronometros(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'pausado', tempo_acumulado: c.tempoAtual || 0 } : c
    ));
  };

  const retomar = async (id: string) => {
    setCronometros(prev => prev.map(c => {
      if (c.id !== id) return c;
      const tempoAtual = c.tempoAtual || c.tempo_acumulado || 0;
      return {
        ...c,
        status: 'ativo',
        hora_inicio: new Date(Date.now() - tempoAtual * 1000).toISOString(),
        tempo_acumulado: tempoAtual,
        pausas: [],
      };
    }));
  };

  const parar = async (id: string, _descricao?: string, horas?: number) => {
    const sessao = cronometros.find(c => c.id === id);
    if (sessao?.intervencao_id) {
      const horasCalculadas = Number(horas ?? ((sessao.tempoAtual || sessao.tempo_acumulado || 0) / 3600));
      await intervencoesService.atualizacaoParcial(sessao.intervencao_id, {
        status: 'resolvido',
        horas_trabalhadas: Number.isFinite(horasCalculadas) ? horasCalculadas.toFixed(2) : '0.00',
        data_conclusao: new Date().toISOString(),
      });
    }
    setCronometros(prev => prev.filter(c => c.id !== id));
  };

  const recuperarLocal = () => {
    carregarSessoes();
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
