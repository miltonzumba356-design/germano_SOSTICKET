import { useState, useEffect, useRef, useCallback } from 'react';
import { notificacoesService } from '../services/api';
import { Notificacao } from '../types/api';

const INTERVALO_POLL_MS = 5000;

// ── Som via Web Audio API (sem ficheiro externo) ──────────────────────────────
function tocarSomNotificacao() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const bip = (freq: number, inicio: number, duracao: number, volume = 0.25) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, ctx.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracao);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracao + 0.01);
    };

    // Dois bips curtos ascendentes — som discreto de notificação
    bip(880,  0,    0.12);
    bip(1100, 0.16, 0.18);
  } catch {
    // Web Audio não suportado — silencioso
  }
}

// ── Notificação do sistema operativo (Web Notifications API) ─────────────────
function enviarNotificacaoOS(titulo: string, corpo: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification('SOSTicket', {
      body: `${titulo}${corpo ? `\n${corpo}` : ''}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'sosticket-notif',
      renotify: true,
    });
    window.setTimeout(() => n.close(), 7000);
  } catch {
    // ignore
  }
}

async function pedirPermissaoNotificacaoOS() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

// ── Hook principal ─────────────────────────────────────────────────────────────
export function useNotificacoes(usuarioId?: string) {
  const [notificacoes, setNotificacoes]                 = useState<Notificacao[]>([]);
  const [carregandoNotificacoes, setCarregandoNotificacoes] = useState(false);

  // IDs já conhecidos para detectar NOVAS notificações sem repetir sons
  const idsConhecidosRef  = useRef<Set<string>>(new Set());
  const primeiraVezRef    = useRef(true);

  const carregarNotificacoes = useCallback(async () => {
    if (!usuarioId) return;
    // Não mostra spinner no polling silencioso (apenas no primeiro carregamento)
    if (primeiraVezRef.current) setCarregandoNotificacoes(true);
    try {
      const response = await notificacoesService.listar({ limit: 20 });
      const lista: Notificacao[] = Array.isArray(response)
        ? response
        : (response as any)?.results || (response as any)?.data || [];
      const listaFinal = Array.isArray(lista) ? lista : [];

      if (!primeiraVezRef.current) {
        // Detectar notificações não lidas que ainda não conhecíamos
        const novas = listaFinal.filter(
          (n) => !n.lida && !idsConhecidosRef.current.has(n.id)
        );

        if (novas.length > 0) {
          tocarSomNotificacao();
          // Envia notificação OS apenas se o documento não está visível (browser minimizado/em background)
          if (document.hidden) {
            const primeira = novas[0];
            enviarNotificacaoOS(
              primeira.titulo || 'Nova notificação',
              novas.length > 1
                ? `Tem ${novas.length} novas notificações`
                : (primeira.mensagem || '')
            );
          }
        }
      }

      // Actualiza IDs conhecidos
      idsConhecidosRef.current = new Set(listaFinal.map((n) => n.id));
      primeiraVezRef.current = false;

      setNotificacoes(listaFinal);
    } catch {
      // falha silenciosa no polling
    } finally {
      setCarregandoNotificacoes(false);
    }
  }, [usuarioId]);

  // Primeiro carregamento + polling a cada 5 s
  useEffect(() => {
    if (!usuarioId) return;

    // Pede permissão para notificações do SO na primeira vez
    pedirPermissaoNotificacaoOS();

    primeiraVezRef.current = true;
    idsConhecidosRef.current = new Set();

    carregarNotificacoes();
    const intervalo = window.setInterval(carregarNotificacoes, INTERVALO_POLL_MS);
    return () => window.clearInterval(intervalo);
  }, [usuarioId, carregarNotificacoes]);

  const marcarLida = useCallback(async (id: string) => {
    try {
      await notificacoesService.marcarLida(id);
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      );
    } catch {
      // ignore
    }
  }, []);

  const marcarTodasLidas = useCallback(async () => {
    try {
      await notificacoesService.marcarTodasLidas();
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch {
      // ignore
    }
  }, []);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return { notificacoes, naoLidas, carregandoNotificacoes, carregarNotificacoes, marcarLida, marcarTodasLidas };
}
