/**
 * Motor de real-time para o SOSTicket.
 *
 * Funciona inteiramente com polling HTTP — não requer WebSockets nem
 * alterações no backend. Expõe dois primitivos:
 *
 *   realtime.invalidate(channel)   — dispara refetch imediato em todos os
 *                                     subscribers locais e noutras abas abertas
 *   realtime.onInvalidate(ch, cb)  — regista um callback, retorna unsubscribe
 *
 * Internamente usa:
 *   • EventTarget  para comunicação local (mesmo tab)
 *   • BroadcastChannel para comunicação cross-tab (mesma origem)
 */

const BC_NAME = 'sos_realtime_bus';

interface BusMessage {
  type: 'invalidate';
  channel: string;
}

class RealtimeEngine {
  private readonly bus = new EventTarget();
  private bc: BroadcastChannel | null = null;

  constructor() {
    // BroadcastChannel disponível em todos os browsers modernos
    try {
      this.bc = new BroadcastChannel(BC_NAME);
      this.bc.onmessage = (e: MessageEvent<BusMessage>) => {
        if (e.data?.type === 'invalidate') {
          // Mensagem de outra aba — propaga localmente sem re-broadcast
          this.bus.dispatchEvent(new CustomEvent(`inv:${e.data.channel}`));
        }
      };
    } catch {
      // Ambiente sem suporte (ex: worker isolado) — degrada graciosamente
      this.bc = null;
    }
  }

  /**
   * Notifica todos os subscribers deste canal (nesta aba e nas outras)
   * para re-buscar os seus dados.
   */
  invalidate(channel: string): void {
    this.bus.dispatchEvent(new CustomEvent(`inv:${channel}`));
    this.bc?.postMessage({ type: 'invalidate', channel } satisfies BusMessage);
  }

  /**
   * Regista um callback para ser chamado sempre que o canal é invalidado.
   * Retorna uma função de cleanup (para usar em useEffect).
   */
  onInvalidate(channel: string, callback: () => void): () => void {
    const eventName = `inv:${channel}`;
    this.bus.addEventListener(eventName, callback);
    return () => this.bus.removeEventListener(eventName, callback);
  }

  destroy(): void {
    this.bc?.close();
  }
}

// Singleton — partilhado por todo o app
export const realtime = new RealtimeEngine();
