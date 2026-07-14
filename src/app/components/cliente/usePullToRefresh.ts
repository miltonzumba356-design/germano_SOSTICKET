import { useCallback, useRef, useState } from 'react';

const LIMIAR_ATUALIZAR = 70;
const PUXAR_MAXIMO = 110;

// Gesto de "puxar para atualizar" para uso num contentor com scroll vertical.
// Só ativa quando o toque começa com o contentor já no topo.
export function usePullToRefresh<T extends HTMLElement>(onRefresh: (() => Promise<void> | void) | null) {
  const containerRef = useRef<T>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const puxando = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing || !onRefresh) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    puxando.current = true;
  }, [refreshing, onRefresh]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!puxando.current || startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }
    setPullDistance(Math.min(PUXAR_MAXIMO, delta * 0.5));
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (!puxando.current) return;
    puxando.current = false;
    startY.current = null;
    if (pullDistance >= LIMIAR_ATUALIZAR && onRefresh) {
      setRefreshing(true);
      setPullDistance(LIMIAR_ATUALIZAR);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRefresh]);

  return {
    containerRef,
    pullDistance,
    refreshing,
    limiar: LIMIAR_ATUALIZAR,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
