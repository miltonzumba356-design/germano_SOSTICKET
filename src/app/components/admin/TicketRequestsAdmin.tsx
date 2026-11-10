import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircle,
  X,
  Mail,
  Bot,
} from 'lucide-react';

// Tipos
interface TicketRequest {
  id: number;
  intervencao_id: number;
  tecnico_id: number;
  tecnico_nome: string;
  tipo: string;
  justificativa: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  criado_em: string;
  aprovado_por?: number;
  aprovado_por_nome?: string;
  aprovado_em?: string;
  motivo_rejeicao?: string;
}

interface AdminProps {
  onClose?: () => void;
  onRequestApproved?: (intervencaoId: number, tecnicoId: number) => void;
}

export function TicketRequestsAdmin({ onClose, onRequestApproved }: AdminProps) {
  const [requests, setRequests] = useState<TicketRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente' | 'aprovado' | 'rejeitado'>('pendente');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Carregar solicitações
  useEffect(() => {
    carregarRequests();
  }, []);

  const carregarRequests = async () => {
    setLoading(true);
    try {
      const statusParam = filterStatus !== 'todos' ? `?status=${filterStatus}` : '';
      const response = await fetch(`/api/intervencoes/pending-requests/${statusParam}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
        if (data.total > 0) {
          setSuccessMsg(`${data.total} solicitação(s) encontrada(s)`);
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Aprovar solicitação
  const handleAprovar = async (request: TicketRequest) => {
    setApproving(request.id);
    try {
      const response = await fetch(
        `/api/intervencoes/${request.intervencao_id}/approve-access/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request_id: request.id,
            tecnico_id: request.tecnico_id,
          }),
        }
      );

      if (response.ok) {
        setSuccessMsg(`Solicitação ${request.id} aprovada!`);
        carregarRequests();
        onRequestApproved?.(request.intervencao_id, request.tecnico_id);
      } else {
        const result = await response.json();
        alert(result.erro || 'Erro ao aprovar');
      }
    } catch (error: any) {
      alert(error.message || 'Erro de rede');
    } finally {
      setApproving(null);
    }
  };

  // Rejeitar solicitação
  const handleRejeitar = async (request: TicketRequest) => {
    const motivo = prompt('Motivo da rejeição:');
    if (!motivo) return;

    setRejecting(request.id);
    try {
      const response = await fetch(
        `/api/intervencoes/${request.intervencao_id}/reject-access/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request_id: request.id,
            motivo,
          }),
        }
      );

      if (response.ok) {
        setSuccessMsg(`Solicitação ${request.id} rejeitada.`);
        carregarRequests();
      } else {
        const result = await response.json();
        alert(result.erro || 'Erro ao rejeitar');
      }
    } catch (error: any) {
      alert(error.message || 'Erro de rede');
    } finally {
      setRejecting(null);
    }
  };

  // Filtrar por status
  const filteredRequests = requests.filter((r) => {
    if (filterStatus === 'todos') return true;
    return r.status === filterStatus;
  });

  // Contadores
  const contagem = {
    pendente: requests.filter((r) => r.status === 'pendente').length,
    aprovado: requests.filter((r) => r.status === 'aprovado').length,
    rejeitado: requests.filter((r) => r.status === 'rejeitado').length,
  };

  // Status label em português
  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pendente: 'Pendente',
      aprovado: 'Aprovado',
      rejeitado: 'Rejeitado',
    };
    return labels[status] || status;
  };

  // Status cor
  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      pendente: 'bg-amber-100 text-amber-700',
      aprovado: 'bg-emerald-100 text-emerald-700',
      rejeitado: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  // Tipo label
  const tipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      acesso: 'Acesso ao Ticket',
      backup: 'Solicitar Backup',
      prioridade: 'Alterar Prioridade',
      reasignar: 'Reatribuir Técnico',
    };
    return labels[tipo] || tipo;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#630ed4]" />
          <p className="text-sm text-[#4a4455]">Carregando solicitações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 md:p-8 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-top duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-[#630ed4]" />
              <h2 className="text-lg font-bold text-[#191c1e]">Solicitações de Acesso</h2>
            </div>
            <p className="text-sm text-[#4a4455] mt-1">Gerencie solicitações de técnicos para atender tickets</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-[#4a4455] hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Resumo e Filtros */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          {/* Contadores */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold">
              {contagem.pendente} Pendente
            </div>
            <div className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">
              {contagem.aprovado} Aprovado
            </div>
            <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
              {contagem.rejeitado} Rejeitado
            </div>
          </div>

          {/* Filtro de status */}
          <div className="flex flex-wrap gap-2">
            {['todos', 'pendente', 'aprovado', 'rejeitado'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-[#630ed4] text-white shadow-sm'
                    : 'bg-white text-[#4a4455] border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {statusLabel(status)}
              </button>
            ))}
            {successMsg && (
              <span className="ml-auto px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {successMsg}
              </span>
            )}
          </div>
        </div>

        {/* Lista de solicitações */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-[#4a4455] text-sm">
                {filterStatus === 'todos'
                  ? 'Nenhuma solicitação encontrada.'
                  : `Nenhuma solicitação ${filterStatus}.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-start justify-between gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors"
                >
                  {/* Informações da solicitação */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge type={req.tipo} />
                      <Badge status={req.status} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-4 h-4 text-[#4a4455] flex-shrink-0" />
                      <span className="text-sm font-medium text-[#191c1e]">{req.tecnico_nome}</span>
                      <span className="text-xs text-[#4a4455]">solicita acesso</span>
                      <span className="text-xs text-[#4a4455]">· Ticket #{req.intervencao_id}</span>
                    </div>
                    <p className="text-sm text-[#4a4455] mb-2">{req.justificativa}</p>
                    <div className="flex items-center gap-2 text-xs text-[#4a4455]">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(req.criado_em).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Ações Admin */}
                  <div className="flex flex-col gap-2 md:flex-row md:items-end">
                    {req.status === 'pendente' && (
                      <>
                        <button
                          onClick={() => handleAprovar(req)}
                          disabled={approving === req.id}
                          className="flex-1 md:flex-1 px-4 py-2 bg-[#50ca7c] text-white rounded-lg text-sm font-semibold hover:bg-[#40b26a] disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                        >
                          {approving === req.id ? (
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          Aprovar
                        </button>
                        <button
                          onClick={() => handleRejeitar(req)}
                          disabled={rejecting === req.id}
                          className="flex-1 md:flex-1 px-4 py-2 bg-[#630ed4] text-white rounded-lg text-sm font-semibold hover:bg-[#500cc6] disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                        >
                          {rejecting === req.id ? (
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          Rejeitar
                        </button>
                      </>
                    )}
                    {req.status === 'aprovado' && (
                      <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold">
                        Aprovado por {req.aprovado_por_nome || 'Admin'}
                      </span>
                    )}
                    {req.status === 'rejeitado' && (
                      <span className="px-3 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-semibold">
                        Rejeitado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-[#191c1e] text-white rounded-lg text-sm font-semibold hover:bg-[#111111] transition-colors flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" /> Fechar e Voltar ao Atendimento
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar para Badge
function Badge({ tipo, status }: { tipo?: string; status?: string }) {
  if (tipo) {
    const colors: Record<string, string> = {
      acesso: 'bg-blue-50 text-blue-700',
      backup: 'bg-purple-50 text-purple-700',
      prioridade: 'bg-orange-50 text-orange-700',
      reasignar: 'bg-pink-50 text-pink-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[tipo] || 'bg-gray-50 text-gray-700'}`}>
        {tipoLabel(tipo)}
      </span>
    );
  }
  if (status) {
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(status)}`}>
        {statusLabel(status)}
      </span>
    );
  }
  return null;
}

Badge.prototype.tipoLabel = tipoLabel;
Badge.prototype.statusLabel = statusLabel;
Badge.prototype.statusColor = statusColor;