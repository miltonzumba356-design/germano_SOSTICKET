import { useState, useEffect, useRef, useCallback } from 'react';
import { notificacoesService } from '../services/api';
import { Notificacao } from '../types/api';
import { realtime } from '../lib/realtime';

const INTERVALO_POLL_MS = 5000;
const REPETICOES_SOM    = 5;
const INTERVALO_SOM_MS  = 1000;

// ── Motor de áudio ────────────────────────────────────────────────────────────
//
// Problemas comuns que silenciam o som em muitos PCs:
//   1. Browsers bloqueiam AudioContext até ao primeiro gesto do utilizador
//   2. Criar um novo AudioContext a cada toque → fica suspenso silenciosamente
//   3. Onda sine é a mais fraca; square é 2-3x mais audível
//   4. Sem DynamicsCompressor o volume pode ser limitado silenciosamente
//
// Solução: singleton + desbloqueio no primeiro gesto + square+sine em camadas + compressor

let _audioCtx: AudioContext | null = null;

function obterCtx(): AudioContext | null {
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    if (!_audioCtx || _audioCtx.state === 'closed') {
      _audioCtx = new Ctor();
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

// Desbloqueia o contexto na primeira interação — deve ser chamado o mais cedo possível
function registarDesbloqueioAudio() {
  const unlock = () => {
    const ctx = obterCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };
  // capture:true garante que apanha o evento antes de qualquer stopPropagation
  const opts: AddEventListenerOptions = { once: true, capture: true };
  document.addEventListener('click',       unlock, opts);
  document.addEventListener('keydown',     unlock, opts);
  document.addEventListener('pointerdown', unlock, opts);
  document.addEventListener('touchstart',  unlock, opts);
}

function tocarSomNotificacao() {
  const ctx = obterCtx();
  if (!ctx) return;

  const executar = () => {
    try {
      // DynamicsCompressor: maximiza o volume sem clippar
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value      =  10;
      comp.ratio.value     =  12;
      comp.attack.value    = 0.001;
      comp.release.value   = 0.15;
      comp.connect(ctx.destination);

      // Master gain — perto do máximo seguro
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(comp);

      // Duas camadas por nota: square (potência/punch) + sine (clareza)
      const nota = (freq: number, t: number, dur: number) => {
        (
          [
            { type: 'square' as OscillatorType, vol: 0.75 },
            { type: 'sine'   as OscillatorType, vol: 0.45 },
          ] as const
        ).forEach(({ type, vol }) => {
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(master);
          osc.type            = type;
          osc.frequency.value = freq;

          const now = ctx.currentTime;
          gain.gain.setValueAtTime(0, now + t);
          gain.gain.linearRampToValueAtTime(vol, now + t + 0.012); // ataque agressivo
          gain.gain.setValueAtTime(vol, now + t + dur - 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + t + dur);
          osc.start(now + t);
          osc.stop(now + t + dur + 0.02);
        });
      };

      // A5 → D6 → E6 — faixa 880–1318 Hz, ideal para altifalantes de portáteis e desktops
      nota(880,  0.00, 0.13);
      nota(1174, 0.16, 0.13);
      nota(1318, 0.32, 0.22);
    } catch {
      // silencioso em ambientes sem suporte
    }
  };

  // Se suspenso (sem gesto prévio) tenta retomar antes de tocar
  if (ctx.state === 'suspended') {
    ctx.resume().then(executar).catch(() => {});
  } else {
    executar();
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
  const [notificacoes, setNotificacoes]                   = useState<Notificacao[]>([]);
  const [carregandoNotificacoes, setCarregandoNotificacoes] = useState(false);

  // Controlo da sequência de som
  const somTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const somCanceladoRef = useRef(false);
  const naoLidasRef     = useRef(0);

  // Controlo do polling
  const idsConhecidosRef = useRef<Set<string>>(new Set());
  const primeiraVezRef   = useRef(true);

  // ── Sequência de som ─────────────────────────────────────────────────────

  const pararSom = useCallback(() => {
    somCanceladoRef.current = true;
    if (somTimerRef.current !== null) {
      clearTimeout(somTimerRef.current);
      somTimerRef.current = null;
    }
  }, []);

  const iniciarSequenciaSom = useCallback(() => {
    pararSom();
    somCanceladoRef.current = false;
    let repeticoes = 0;

    const proximo = () => {
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

  // ── Sincroniza ref e para o som quando não há não-lidas ──────────────────

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  useEffect(() => {
    naoLidasRef.current = naoLidas;
    if (naoLidas === 0) pararSom();
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
          iniciarSequenciaSom();

          // Invalida dashboard e intervenções para actualizarem silenciosamente
          realtime.invalidate('dashboard');
          realtime.invalidate('intervencoes');

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

    // Desbloqueio de áudio + permissão de notificações OS logo no mount
    registarDesbloqueioAudio();
    pedirPermissaoNotificacaoOS();

    primeiraVezRef.current   = true;
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
    } catch {
      // ignore
    }
  }, []);

  const marcarTodasLidas = useCallback(async () => {
    try {
      await notificacoesService.marcarTodasLidas();
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
      pararSom(); // para imediatamente sem esperar pelo próximo render
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
