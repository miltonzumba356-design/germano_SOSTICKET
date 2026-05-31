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
  limparPorIntervencao: (intervencaoId: string) => void;
}

const STORAGE_KEY = 'cronometros_ativos';
const STATUS_FINAIS = ['resolvido', 'fechado', 'concluido'];
const CronometroContext = createContext<CronometroContextType | undefined>(undefined);

function calcularTempoAtual(sessao: CronometroState) {
  if (sessao.status !== 'ativo') {
    return sessao.tempoAtual ?? sessao.tempo_acumulado ?? 0;
  }

  const inicio = new Date(sessao.hora_inicio).getTime();
  if (!Number.isFinite(inicio)) {
    return sessao.tempoAtual ?? sessao.tempo_acumulado ?? 0;
  }

  return Math.max(0, Math.floor((Date.now() - inicio) / 1000));
}

function normalizarSessao(sessao: CronometroState): CronometroState {
  const tempoAtual = calcularTempoAtual(sessao);
  return {
    ...sessao,
    tempoAtual,
    tempo_acumulado: tempoAtual,
  };
}

function normalizarHorasRegistaveis(horas: number, segundosContados: number) {
  if (!Number.isFinite(horas) || horas <= 0) {
    return segundosContados > 0 ? 0.01 : 0;
  }

  const horasArredondadas = Number(horas.toFixed(2));
  return segundosContados > 0 && horasArredondadas === 0 ? 0.01 : horasArredondadas;
}

export function CronometroProvider({ children }: { children: React.ReactNode }) {
  const { usuario, carregando: carregandoAuth } = useAuth();
  const [cronometros, setCronometros] = useState<CronometroState[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [localCarregado, setLocalCarregado] = useState(false);

  useEffect(() => {
    if (carregandoAuth) return;

    setCarregando(true);
    setLocalCarregado(false);

    if (usuario?.perfil === 'tecnico') {
      carregarSessoes();
    } else {
      setCronometros([]);
      setCarregando(false);
      setLocalCarregado(true);
    }
  }, [usuario, carregandoAuth]);

  const carregarSessoes = async () => {
    try {
      const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const sessoesLocais = Array.isArray(local) ? local.map(normalizarSessao) : [];
      const sessoesValidas = await Promise.all(
        sessoesLocais.map(async (sessao) => {
          if (!sessao.intervencao_id) return null;

          try {
            const intervencao = await intervencoesService.obterPorId(sessao.intervencao_id);
            return STATUS_FINAIS.includes(intervencao.status || '') ? null : sessao;
          } catch {
            return sessao;
          }
        })
      );

      setCronometros(sessoesValidas.filter(Boolean) as CronometroState[]);
    } catch (error) {
      console.error('Erro ao carregar cronometros locais:', error);
      setCronometros([]);
    } finally {
      setCarregando(false);
      setLocalCarregado(true);
    }
  };

  useEffect(() => {
    if (!localCarregado) return;

    if (cronometros.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cronometros));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [cronometros, localCarregado]);

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
    if (cronometros.some(c => c.intervencao_id === intervencaoId)) {
      throw new Error('Esta intervenção já tem um cronometro ativo.');
    }

    const intervencaoAtual = await intervencoesService.obterPorId(intervencaoId);
    const intervencao = intervencaoAtual.status === 'em_andamento'
      ? intervencaoAtual
      : await intervencoesService.atualizacaoParcial(intervencaoId, {
          status: 'em_andamento',
          actuacao_tipo: tipo,
          data_inicio_intervencao: new Date().toISOString(),
        });

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
      const segundosContados = sessao.tempoAtual || sessao.tempo_acumulado || 0;
      const horasCalculadas = Number(horas && horas > 0 ? horas : segundosContados / 3600);
      const horasValidas = normalizarHorasRegistaveis(horasCalculadas, segundosContados);
      const fim = new Date();
      const inicio = new Date(fim.getTime() - horasValidas * 60 * 60 * 1000);
      await intervencoesService.atualizacaoParcial(sessao.intervencao_id, {
        status: 'concluido',
        actuacao_tipo: sessao.tipo,
        data_inicio_intervencao: inicio.toISOString(),
        data_fim_intervencao: fim.toISOString(),
        horas_trabalhadas: horasValidas.toFixed(2),
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

  const limparPorIntervencao = (intervencaoId: string) => {
    setCronometros(prev => prev.filter(c => c.intervencao_id !== intervencaoId));
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
      limparLocal,
      limparPorIntervencao
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
