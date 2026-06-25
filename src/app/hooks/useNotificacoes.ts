import { useState, useEffect, useRef, useCallback } from 'react';
import { notificacoesService } from '../services/api';
import { Notificacao } from '../types/api';
import { realtime } from '../lib/realtime';

const INTERVALO_POLL_MS = 5000;
const REPETICOES_SOM    = 5;
const INTERVALO_SOM_MS  = 1000;

// ── AudioContext singleton ────────────────────────────────────────────────────
// Criado uma vez e mantido vivo. Browsers suspendem o contexto após ~60 s
// sem audio; por isso registamos listeners PERMANENTES (sem {once}) para o
// retomar em qualquer gesto do utilizador, mesmo horas depois.

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

// Retoma o contexto se suspenso — chamado em cada gesto para manter vivo.
// Listeners são PERMANENTES (não {once}) porque o contexto pode suspender
// novamente a qualquer momento após inactividade.
function resumirCtx() {
  const ctx = obterCtx();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

let _desbloqueioRegistado = false;
function registarDesbloqueioAudio() {
  if (_desbloqueioRegistado) return;
  _desbloqueioRegistado = true;
  // capture:true apanha o evento antes de stopPropagation de qualquer componente
  document.addEventListener('click',       resumirCtx, { capture: true });
  document.addEventListener('keydown',     resumirCtx, { capture: true });
  document.addEventListener('pointerdown', resumirCtx, { capture: true });
  document.addEventListener('touchstart',  resumirCtx, { capture: true, passive: true });
}

// Keepalive: toca um buffer vazio (1 sample, volume 0) a cada 20 s.
// Mantém o AudioContext em estado "running" e impede o Chrome de throttlar
// os timers do tab quando está em background/minimizado.
let _keepaliveTimer: ReturnType<typeof setInterval> | null = null;
function iniciarKeepaliveAudio() {
  if (_keepaliveTimer !== null) return;
  _keepaliveTimer = setInterval(() => {
    const ctx = obterCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
    try {
      const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch { /* ignore */ }
  }, 20_000);
}

// ── Som de notificação ────────────────────────────────────────────────────────
// Square (punch) + sine (clareza) em camadas, compressor maximiza volume,
// frequências 880–1318 Hz ideais para qualquer altifalante.

function executarSom(ctx: AudioContext) {
  try {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value      =  10;
    comp.ratio.value     =  12;
    comp.attack.value    = 0.001;
    comp.release.value   = 0.15;
    comp.connect(ctx.destination);

    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp);

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
        osc.type = type;
        osc.frequency.value = freq;
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now + t);
        gain.gain.linearRampToValueAtTime(vol, now + t + 0.012);
        gain.gain.setValueAtTime(vol, now + t + dur - 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + dur);
        osc.start(now + t);
        osc.stop(now + t + dur + 0.02);
      });
    };

    nota(880,  0.00, 0.13); // A5
    nota(1174, 0.16, 0.13); // D6
    nota(1318, 0.32, 0.22); // E6
  } catch {
    // silencioso
  }
}

function tocarSomNotificacao() {
  const ctx = obterCtx();
  if (!ctx) return;

  // Sempre tenta retomar antes de tocar — garante funcionamento em qualquer estado
  if (ctx.state !== 'running') {
    ctx.resume()
      .then(() => executarSom(ctx))
      .catch(() => {});
  } else {
    executarSom(ctx);
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
  // ⚠ Este ref é actualizado ANTES de setNotificacoes para evitar bug de timing:
  // iniciarSequenciaSom é chamado antes do re-render, por isso o ref tem de
  // já reflectir o novo count de não-lidas para que proximo() não bloqueie.
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
      // naoLidasRef já foi actualizado ANTES desta chamada — sem bug de timing
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

  // Sincroniza ref — também serve de "guard" entre repetições agendadas
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
          // Actualiza o ref ANTES de iniciarSequenciaSom — evita bug de timing
          naoLidasRef.current = listaFinal.filter((n) => !n.lida).length;

          // Som: sempre, independentemente do estado do browser
          iniciarSequenciaSom();

          realtime.invalidate('dashboard');
          realtime.invalidate('intervencoes');

          // Notificação Windows: SEMPRE (minimizado OU em foco — como o Slack)
          const primeira = novas[0];
          enviarNotificacaoOS(
            primeira.titulo || 'Nova notificação',
            novas.length > 1
              ? `Tem ${novas.length} novas notificações`
              : (primeira.mensagem || '')
          );
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

    // Mantém AudioContext desbloqueado e activo em qualquer estado do browser
    registarDesbloqueioAudio();
    iniciarKeepaliveAudio();
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
