import { useState } from 'react';
import { AlertCircle, Loader2, Send, X } from 'lucide-react';
import { solicitacoesService } from '../services/api';

interface Props {
  intervencaoId: string;
  intervencaoNumero?: string | number;
  intervencaoTitulo?: string;
  responsavel?: string | null;
  onFechar: () => void;
  onEnviado?: () => void;
}

/** Modal: o técnico pede para intervir num atendimento que não é dele. */
export function SolicitarIntervencaoModal({
  intervencaoId,
  intervencaoNumero,
  intervencaoTitulo,
  responsavel,
  onFechar,
  onEnviado,
}: Props) {
  const [justificativa, setJustificativa] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async () => {
    if (enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      await solicitacoesService.criar({
        intervencao_id: intervencaoId,
        tipo: 'intervencao',
        justificativa: justificativa.trim(),
      });
      onEnviado?.();
      onFechar();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível enviar o pedido.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[95] flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-gray-900">Solicitar intervenção</h3>
            <p className="text-xs text-gray-500 mt-1">
              #{intervencaoNumero} — {intervencaoTitulo}
              {responsavel ? ` · responsável: ${responsavel}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-600">
            Este pedido vai para o administrador. Se for aprovado, o atendimento passa para si.
          </p>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Justificação
            </label>
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={4}
              placeholder="Explique porque precisa de intervir neste atendimento..."
              className="mt-1.5 w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium resize-none"
            />
          </div>

          {erro && (
            <p className="text-xs font-semibold text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {erro}
            </p>
          )}
        </div>

        <div className="px-6 pb-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onFechar}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void enviar()}
            disabled={enviando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-primary text-white text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-theme-primary-hover transition-colors disabled:opacity-60"
          >
            {enviando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Enviar pedido
          </button>
        </div>
      </div>
    </div>
  );
}
