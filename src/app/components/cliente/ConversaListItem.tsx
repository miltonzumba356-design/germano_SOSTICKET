import type { Intervencao } from '../../types/api';
import {
  formatarHoraCurta, ultimaMensagem, statusStyle, isNaoLida, totalComentarios, categoriaIcon,
} from './helpers';

function contagemNaoLida(intervencao: Intervencao): number {
  try {
    const raw = localStorage.getItem('sosticket_cliente_conversas_vistas');
    const vistos = raw ? JSON.parse(raw) : {};
    const visto = vistos[intervencao.id] ?? 0;
    return Math.max(0, totalComentarios(intervencao) - visto);
  } catch {
    return 0;
  }
}

export function ConversaListItem({
  intervencao,
  ativo,
  nomeUsuario,
  onClick,
}: {
  intervencao: Intervencao;
  ativo?: boolean;
  nomeUsuario?: string;
  onClick: () => void;
}) {
  const msg = ultimaMensagem(intervencao, nomeUsuario);
  const status = statusStyle(intervencao.status);
  const naoLida = isNaoLida(intervencao);
  const naoLidaQtd = contagemNaoLida(intervencao);
  const Icone = categoriaIcon(intervencao);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 text-left bg-white rounded-[18px] shadow-sm transition-all active:scale-[0.98] active:bg-[#faf8ff] ${
        ativo ? 'border-l-4 border-l-[#7c3aed] pl-3' : 'border-l-4 border-l-transparent'
      }`}
    >
      <div className="relative flex-shrink-0 w-12 h-12 rounded-full bg-[#ede0ff] text-[#7c3aed] flex items-center justify-center">
        <Icone className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[15px] leading-tight truncate ${naoLida ? 'font-bold text-[#191c1e]' : 'font-semibold text-[#191c1e]'}`}>
            {intervencao.titulo}
          </p>
          <span className="flex-shrink-0 text-xs text-[#4a4455]">{formatarHoraCurta(msg.data)}</span>
        </div>
        <p className="text-sm text-[#4a4455] truncate mt-1">
          {!msg.deCliente && msg.autor ? `Técnico: ` : ''}{msg.texto || 'Sem mensagens ainda'}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
            {status.label}
          </span>
          {naoLidaQtd > 0 && (
            <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-[#7c3aed] text-white text-[11px] font-bold rounded-full flex items-center justify-center">
              {naoLidaQtd}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
