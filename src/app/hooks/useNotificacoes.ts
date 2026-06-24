import { useState, useEffect, useRef, useCallback } from 'react';
import { notificacoesService } from '../services/api';
import { Notificacao } from '../types/api';

const INTERVALO_POLL_MS    = 5000;
const REPETICOES_SOM       = 5;   // toca 5 vezes
const INTERVALO_SOM_MS     = 1000; // 1 segundo entre cada toque

// ── Som via Web Audio API ─────────────────────────────────────────────────────
// Três notas ascendentes (acorde de Dó maior — Do/Mi/Sol)
// Volume alto (0.7) e ataque rápido para ser bem audível
function tocarSomNotificacao() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const nota = (freq: number, inicio: number, duracao: number, vol = 0.65) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      // Envelope: ataque rápido, sustain, decay suave
      gain.gain.setValueAtTime(0, ctx.currentTime + inicio);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + inicio + 0.025);
      gain.gain.setValueAtTime(vol, ctx.currentTime + inicio + duracao - 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracao);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracao + 0.01);
    };

    // Dó5 → Mi5 → Sol5 — som de alerta claro e ascendente
    nota(523.25, 0.00, 0.18); // C5
    nota(659.25, 0.22, 0.18); // E5
    nota(783.99, 0.44, 0.26); // G5
  } catch {
    // Web Audio não suportado — silencioso
  }
}

// ── Notificação do sistema operativo ─────────────────────────────────────────
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
  const [notificacoes, setNotificacoes]             = useState<Notificacao[]>([]);
  const [carregandoNotificacoes, setCarregandoNotificacoes] = useState(false);

  // Controlo da sequência de som
  const somTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const somCanceladoRef   = useRef(false);
  const naoLidasRef       = useRef(0); // espelho em ref para os callbacks de timeout

  // Controlo do polling
  const idsConhecidosRef  = useRef<Set<string>>(new Set());
  const primeiraVezRef    = useRef(true);

  // ── Sequência de som ─────────────────────────────────────────────────────

  const pararSom = useCallback(() => {
    somCanceladoRef.current = true;
    if (somTimerRef.current !== null) {
      clearTimeout(somTimerRef.current);
      somTimerRef.current = null;
    }
  }, []);

  const iniciarSequenciaSom = useCallback(() => {
    // Cancela qualquer sequência anterior antes de iniciar nova
    pararSom();
    somCanceladoRef.current = false;

    let repeticoes = 0;

    const proximo = () => {
      // Para se cancelado externamente ou se já não há notificações não lidas
      if (somCanceladoRef.current || naoLidasRef.current === 0) return;
      if (repeticoes >= REPETICOES_SOM) return;

      tocarSomNotificacao();
      repeticoes++;

      if (repeticoes < REPETICOES_SOM) {
        somTimerRef.current = setTimeout(proximo, INTERVALO_SOM_MS);
      }
    };

    proximo();
  }, [pararSom]);

  // ── Sincroniza ref com o count de não lidas e para o som quando chega a 0 ──

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  useEffect(() => {
    naoLidasRef.current = naoLidas;
    if (naoLidas === 0) {
      pararSom();
    }
  }, [naoLidas, pararSom]);

  // ── Polling ──────────────────────────────────────────────────────────────

  const carregarNotificacoes = useCallback(async () => {
    if (!usuarioId) return;
    if (primeiraVezRef.current) setCarregandoNotificacoes(true);
    try {
      const response = await notificacoesService.listar({ limit: 20 });
      const lista: Notificacao[] = Array.isArray(response)
        ? response
        : (response as any)?.results || (response as any)?.data || [];
      const listaFinal = Array.isArray(lista) ? lista : [];

      if (!primeiraVezRef.current) {
        const novas = listaFinal.filter(
          (n) => !n.lida && !idsConhecidosRef.current.has(n.id)
        );

        if (novas.length > 0) {
          // Inicia sequência de 5 sons
          iniciarSequenciaSom();

          // Alerta do SO se o browser estiver em background
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

      idsConhecidosRef.current = new Set(listaFinal.map((n) => n.id));
      primeiraVezRef.current   = false;
      setNotificacoes(listaFinal);
    } catch {
      // falha silenciosa no polling
    } finally {
      setCarregandoNotificacoes(false);
    }
  }, [usuarioId, iniciarSequenciaSom]);

  useEffect(() => {
    if (!usuarioId) return;

    pedirPermissaoNotificacaoOS();
    primeiraVezRef.current  = true;
    idsConhecidosRef.current = new Set();

    carregarNotificacoes();
    const intervalo = window.setInterval(carregarNotificacoes, INTERVALO_POLL_MS);

    return () => {
      window.clearInterval(intervalo);
      pararSom();
    };
  }, [usuarioId, carregarNotificacoes, pararSom]);

  // ── Acções do utilizador ─────────────────────────────────────────────────

  const marcarLida = useCallback(async (id: string) => {
    try {
      await notificacoesService.marcarLida(id);
      setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
      // O useEffect acima para o som assim que naoLidas chegar a 0
    } catch {
      // ignore
    }
  }, []);

  const marcarTodasLidas = useCallback(async () => {
    try {
      await notificacoesService.marcarTodasLidas();
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
      // Para o som imediatamente — não espera pelo próximo render
      pararSom();
    } catch {
      // ignore
    }
  }, [pararSom]);

  return {
    notificacoes,
    naoLidas,
    carregandoNotificacoes,
    carregarNotificacoes,
    marcarLida,
    marcarTodasLidas,
  };
}
