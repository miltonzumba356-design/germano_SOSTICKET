import { Paperclip } from 'lucide-react';
import type { Intervencao } from '../../types/api';
import { avatarColor, iniciais, formatarHoraCurta, ultimaMensagem, priorityStyle, statusStyle, isNaoLida, totalAnexos } from './helpers';

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
  const prioridade = priorityStyle(intervencao.prioridade);
  const naoLida = isNaoLida(intervencao);
  const anexos = totalAnexos(intervencao);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-50 transition-colors ${
        ativo ? 'bg-theme-light' : 'hover:bg-gray-50'
      }`}
    >
      <div className={`relative flex-shrink-0 w-11 h-11 rounded-full ${avatarColor(intervencao.id)} text-white flex items-center justify-center font-bold text-sm`}>
        {iniciais(intervencao.titulo)}
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${status.dot}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate ${naoLida ? 'font-black text-gray-900' : 'font-bold text-gray-800'}`}>
            {intervencao.titulo}
          </p>
          <span className={`flex-shrink-0 text-[11px] ${naoLida ? 'text-theme-primary font-bold' : 'text-gray-400'}`}>
            {formatarHoraCurta(msg.data)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={`text-xs truncate ${naoLida ? 'text-gray-700 font-semibold' : 'text-gray-500'}`}>
            {msg.texto || 'Sem mensagens ainda'}
          </p>
          {naoLida && <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-theme-primary" />}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded ${status.bg} ${status.text}`}>
            {status.label}
          </span>
          <span className={`px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded ${prioridade.bg} ${prioridade.text}`}>
            {prioridade.label}
          </span>
          {anexos > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
              <Paperclip className="w-3 h-3" /> {anexos}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
