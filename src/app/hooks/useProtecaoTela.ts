import { useEffect, useRef, useState } from 'react';

/**
 * Activa protecção de ecrã para a conta técnico.
 * - Bloqueia teclas de captura (PrintScreen, Cmd+Shift+3/4/5, Win+Shift+S)
 * - Limpa a área de transferência após tentativa de captura
 * - Mostra overlay preto quando a janela perde foco ou o separador fica oculto
 * - Remove a selecção de texto e o menu de contexto
 * - Oculta conteúdo em modo de impressão
 */
export function useProtecaoTela(ativo: boolean) {
  const [bloqueado, setBloqueado] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ativo) {
      setBloqueado(false);
      return;
    }

    const mostrar = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setBloqueado(true);
    };

    const esconder = (delay = 400) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setBloqueado(false), delay);
    };

    // Intercepta atalhos comuns de captura de ecrã
    const onKeyDown = (e: KeyboardEvent) => {
      const isPrintScreen = e.key === 'PrintScreen';
      // Cmd+Shift+3 / 4 / 5 / 6  (macOS)
      const isMac = e.metaKey && e.shiftKey && ['3', '4', '5', '6'].includes(e.key);
      // Win+Shift+S  (Ferramenta de Recorte do Windows)
      const isWinSnip = e.key === 'S' && e.shiftKey && (e.metaKey || e.getModifierState('Meta'));

      if (isPrintScreen || isMac || isWinSnip) {
        e.preventDefault();
        // Limpa a área de transferência para apagar qualquer conteúdo capturado
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText('').catch(() => {});
        }
        mostrar();
        esconder(2500);
      }
    };

    // Overlay quando a janela perde foco (utilizador pode estar a usar ferramenta de captura externa)
    const onBlur  = () => mostrar();
    const onFocus = () => esconder();

    // Overlay quando o separador fica oculto
    const onVisibility = () => {
      if (document.hidden) mostrar();
      else esconder();
    };

    // Remove o menu de contexto (clique direito)
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    // CSS injectado dinamicamente
    const style = document.createElement('style');
    style.id = 'sos-screen-protection';
    style.textContent = `
      body.modo-seguro,
      body.modo-seguro * {
        -webkit-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      @media print {
        body.modo-seguro > * { display: none !important; }
        body.modo-seguro::after {
          content: 'Conteúdo protegido. Impressão não permitida.';
          display: block;
          text-align: center;
          padding: 4rem;
          font-size: 1.5rem;
          color: #000;
        }
      }
    `;
    document.head.appendChild(style);
    document.body.classList.add('modo-seguro');

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.getElementById('sos-screen-protection')?.remove();
      document.body.classList.remove('modo-seguro');
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ativo]);

  return { bloqueado };
}
