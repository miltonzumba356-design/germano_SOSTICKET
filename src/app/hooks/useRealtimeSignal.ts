import { useEffect, useRef, useCallback } from 'react';
import { realtime } from '../lib/realtime';

interface Options {
  /** Intervalo de polling em ms. Default: 30 000 (30 s) */
  interval?: number;
  /** Desactiva o polling quando false. Default: true */
  enabled?: boolean;
}

/**
 * Hook de real-time não-invasivo.
 *
 * Adiciona polling automático, pausa inteligente e sincronização cross-tab
 * a qualquer função de carregamento existente — sem refactorizar o componente.
 *
 * Comportamentos:
 *  • Chama `callback` no intervalo configurado
 *  • Pausa quando o tab fica oculto (Page Visibility API)
 *  • Re-executa imediatamente quando o tab volta a estar visível
 *  • Escuta `realtime.invalidate(channel)` para refetch imediato
 *  • Cross-tab: se outra aba invalidar o canal, este tab também refaz
 *
 * @example
 * // Dentro de um componente que já tem `carregarDados(silencioso?)`:
 * useRealtimeSignal('dashboard', () => carregarDados(true), { interval: 30_000 });
 */
export function useRealtimeSignal(
  channel: string,
  callback: () => void | Promise<void>,
  options: Options = {}
): { refresh: () => void } {
  const { interval = 30_000, enabled = true } = options;

  // Ref garante que o intervalo/listener nunca captura uma closure velha
  const cbRef = useRef(callback);
  useEffect(() => { cbRef.current = callback; });

  useEffect(() => {
    if (!enabled) return;

    const exec = () => {
      if (!document.hidden) {
        try { cbRef.current(); } catch { /* component trata o erro */ }
      }
    };

    // Polling periódico
    const timer = setInterval(exec, interval);

    // Re-fetch imediato quando o tab volta a estar visível
    const onVisibility = () => { if (!document.hidden) exec(); };
    document.addEventListener('visibilitychange', onVisibility);

    // Invalidação local + cross-tab via BroadcastChannel
    const unsubInv = realtime.onInvalidate(channel, exec);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      unsubInv();
    };
  }, [channel, interval, enabled]);

  // Permite que o componente dispare um refetch manual + propaga cross-tab
  const refresh = useCallback(() => realtime.invalidate(channel), [channel]);

  return { refresh };
}
