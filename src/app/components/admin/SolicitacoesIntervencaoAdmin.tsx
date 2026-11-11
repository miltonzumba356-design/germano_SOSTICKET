import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  ShieldCheck,
  X,
} from 'lucide-react';
import { solicitacoesService } from '../../services/api';
import type { SolicitacaoIntervencao } from '../../types/api';

interface Props {
  onClose?: () => void;
  /** Chamado quando um pedido é respondido (para recarregar a lista de tickets). */
  onRespondido?: () => void;
}

const ESTADOS = [
  { valor: 'pendente', rotulo: 'Pendentes' },
  { valor: 'aprovado', rotulo: 'Aprovados' },
  { valor: 'rejeitado', rotulo: 'Rejeitados' },
] as const;

/**
 * Pedidos para intervir numa intervenção.
 * O administrador aprova (o ticket passa para quem pediu) ou rejeita.
 */
export function SolicitacoesIntervencaoAdmin({ onClose, onRespondido }: Props) {
  const [pedidos, setPedidos] = useState<SolicitacaoIntervencao[]>([]);
  const [estado, setEstado] = useState<'pendente' | 'aprovado' | 'rejeitado'>('pendente');
  const [carregando, setCarregando] = useState(true);
  const [aResponder, setAResponder] = useState<string | null>(null);
  const [emEdicao, setEmEdicao] = useState<{ pedido: SolicitacaoIntervencao; aprovar: boolean } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await solicitacoesService.listar({ estado } as any);
      const lista = Array.isArray(resposta)
        ? resposta
        : (resposta as any)?.results || (resposta as any)?.data || [];
      setPedidos(Array.isArray(lista) ? lista : []);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar os pedidos.');
    } finally {
      setCarregando(false);
    }
  }, [estado]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const confirmar = async () => {
    if (!emEdicao) return;
    const { pedido, aprovar } = emEdicao;
    setAResponder(pedido.id);
    setErro(null);
    try {
      if (aprovar) {
        await solicitacoesService.aprovar(pedido.id, motivo.trim());
      } else {
        await solicitacoesService.rejeitar(pedido.id, motivo.trim());
      }
      setEmEdicao(null);
      setMotivo('');
      await carregar();
      onRespondido?.();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível responder ao pedido.');
    } finally {
      setAResponder(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-theme-primary" />
              Pedidos de intervenção
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Técnicos que pedem para intervir em atendimentos que não lhes estão atribuídos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2">
          {ESTADOS.map((e) => (
            <button
              key={e.valor}
              type="button"
              onClick={() => setEstado(e.valor)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                estado === e.valor
                  ? 'bg-theme-primary text-white shadow'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {e.rotulo}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void carregar()}
            className="ml-auto text-xs font-bold text-gray-500 hover:text-gray-800"
          >
            Actualizar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {erro && (
            <p className="text-xs font-semibold text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {erro}
            </p>
          )}

          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">A carregar pedidos...</span>
            </div>
          ) : pedidos.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-8 text-center">
              Não há pedidos de intervenção neste estado.
            </p>
          ) : (
            pedidos.map((pedido) => (
              <div
                key={pedido.id}
                className="border border-gray-100 rounded-2xl p-4 bg-gray-50/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      #{pedido.intervencao_numero} — {pedido.intervencao_titulo}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Pedido por <strong>{pedido.utilizador_nome}</strong>
                      {pedido.cliente_nome ? ` para ${pedido.cliente_nome}` : ''}
                    </p>
                    {pedido.tecnico_responsavel && (
                      <p className="text-xs text-gray-500">
                        Responsável actual: <strong>{pedido.tecnico_responsavel}</strong>
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-lg shrink-0 ${
                      pedido.estado === 'pendente'
                        ? 'bg-amber-100 text-amber-700'
                        : pedido.estado === 'aprovado'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {pedido.estado}
                  </span>
                </div>

                {pedido.justificativa && (
                  <p className="text-xs text-gray-700 mt-3 bg-white border border-gray-100 rounded-xl px-3 py-2 flex items-start gap-2">
                    <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                    {pedido.justificativa}
                  </p>
                )}

                {pedido.motivo && (
                  <p className="text-xs text-gray-500 mt-2">
                    Resposta do administrador: {pedido.motivo}
                  </p>
                )}

                {pedido.estado === 'pendente' && emEdicao?.pedido.id !== pedido.id && (
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      disabled={aResponder === pedido.id}
                      onClick={() => {
                        setEmEdicao({ pedido, aprovar: true });
                        setMotivo('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Aprovar
                    </button>
                    <button
                      type="button"
                      disabled={aResponder === pedido.id}
                      onClick={() => {
                        setEmEdicao({ pedido, aprovar: false });
                        setMotivo('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors disabled:opacity-60"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Rejeitar
                    </button>
                  </div>
                )}

                {emEdicao?.pedido.id === pedido.id && (
                  <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      {emEdicao.aprovar ? 'Nota (opcional)' : 'Motivo da rejeição'}
                    </label>
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      rows={2}
                      placeholder={
                        emEdicao.aprovar
                          ? 'Ex.: pode ficar com este atendimento.'
                          : 'Ex.: já está com outro técnico.'
                      }
                      className="w-full px-3 py-2 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-xs font-medium resize-none"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setEmEdicao(null);
                          setMotivo('');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={aResponder === pedido.id || (!emEdicao.aprovar && !motivo.trim())}
                        onClick={() => void confirmar()}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-colors disabled:opacity-60 ${
                          emEdicao.aprovar ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
                        }`}
                      >
                        {aResponder === pedido.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        {emEdicao.aprovar ? 'Confirmar aprovação' : 'Confirmar rejeição'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
