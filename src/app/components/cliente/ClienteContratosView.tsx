import { useEffect } from 'react';
import {
  Search, FileText, Clock, TrendingUp, CheckCircle2, Download, X, Loader2, User,
} from 'lucide-react';
import type { Contrato } from '../../types/api';
import { formatarHoras } from '../../utils/formatters';

export interface ClienteContratosViewProps {
  contratos: Contrato[];
  carregando: boolean;
  erro: string;
  busca: string;
  setBusca: (v: string) => void;
  filtroStatus: string;
  setFiltroStatus: (v: string) => void;
  contratoDetalhe: Contrato | null;
  exibirModalDetalhes: boolean;
  setExibirModalDetalhes: (v: boolean) => void;
  handleVerDetalhes: (id: string) => void | Promise<void>;
  handleBaixarPdf: (contrato: Contrato) => void | Promise<void>;
}

export function ClienteContratosView({
  contratos, carregando, erro, busca, setBusca, filtroStatus, setFiltroStatus,
  contratoDetalhe, exibirModalDetalhes, setExibirModalDetalhes, handleVerDetalhes, handleBaixarPdf,
}: ClienteContratosViewProps) {
  // Seleciona automaticamente o primeiro contrato quando nada estiver selecionado
  useEffect(() => {
    if (!exibirModalDetalhes && contratos.length > 0 && !carregando) {
      handleVerDetalhes(contratos[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratos.length, carregando]);

  return (
    <div className="flex h-[calc(100vh-7.5rem)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Coluna esquerda: lista de contratos */}
      <aside className="w-full sm:w-[340px] flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/40">
        <div className="p-4 space-y-3 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-black text-gray-900">Meus Contratos</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar por número..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 rounded-full outline-none focus:ring-2 focus:ring-theme-primary transition-all"
            />
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="w-full bg-gray-100 rounded-full px-3 py-1.5 text-[11px] font-bold text-gray-600 outline-none"
          >
            <option value="">Todos status</option>
            <option value="activo">Ativos</option>
            <option value="expirado">Expirados</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {carregando && contratos.length === 0 ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
          ) : contratos.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum contrato encontrado.</p>
            </div>
          ) : (
            contratos.map((contrato) => {
              const percHoras = contrato.horas_contratadas
                ? Math.min(100, Math.round((Number(contrato.horas_utilizadas) / Number(contrato.horas_contratadas)) * 100))
                : 0;
              const ativo = exibirModalDetalhes && contratoDetalhe?.id === contrato.id;
              return (
                <button
                  key={contrato.id}
                  onClick={() => handleVerDetalhes(contrato.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-50 transition-colors ${
                    ativo ? 'bg-theme-light' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-theme-light text-theme-primary flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">#{contrato.numero || contrato.id.substring(0, 6).toUpperCase()}</p>
                      <span className={`px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded ${
                        contrato.status === 'activo' || contrato.status === 'ativo'
                          ? 'bg-emerald-100 text-emerald-700'
                          : contrato.status === 'expirado'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {contrato.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5 capitalize">{contrato.tipo_contrato}</p>
                    {contrato.tipo_de_pagamento === 'horas' && (
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                        <div
                          className={`h-full rounded-full ${percHoras > 90 ? 'bg-red-500' : percHoras > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${percHoras}%` }}
                        />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Coluna direita: detalhe */}
      <section className="flex-1 flex flex-col min-w-0 bg-[#f7f5fb] overflow-y-auto">
        {erro && (
          <div className="m-5 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-bold">{erro}</div>
        )}
        {!exibirModalDetalhes || !contratoDetalhe ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-24 h-24 rounded-full bg-theme-light flex items-center justify-center mb-4">
              <FileText className="w-12 h-12 text-theme-primary" />
            </div>
            <h3 className="text-lg font-black text-gray-700">Selecione um contrato</h3>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">Escolha um contrato na lista à esquerda para ver os detalhes completos.</p>
          </div>
        ) : (
          <div className="p-6 space-y-6 max-w-2xl">
            <div className="flex items-center justify-between px-6 py-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-theme-light rounded-2xl flex items-center justify-center">
                  <User className="w-6 h-6 text-theme-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contrato</p>
                  <h4 className="text-lg font-bold text-gray-900">#{contratoDetalhe.numero || contratoDetalhe.id?.substring(0, 8)}</h4>
                </div>
              </div>
              <span className={`px-4 py-1.5 text-xs font-black rounded-full uppercase tracking-tighter ${
                contratoDetalhe.status === 'activo' || contratoDetalhe.status === 'ativo'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {contratoDetalhe.status}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Info label="Tipo" valor={contratoDetalhe.tipo_contrato} />
              <Info label="Pagamento" valor={contratoDetalhe.tipo_de_pagamento} />
              <Info label="Início" valor={contratoDetalhe.data_inicio ? new Date(contratoDetalhe.data_inicio).toLocaleDateString('pt-PT') : '-'} />
              <Info label="Fim" valor={contratoDetalhe.data_fim ? new Date(contratoDetalhe.data_fim).toLocaleDateString('pt-PT') : '-'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Metrica icon={Clock} cor="indigo" titulo="Horas Contratadas" valor={formatarHoras(contratoDetalhe.horas_contratadas)} />
              <Metrica icon={TrendingUp} cor="amber" titulo="Horas Utilizadas" valor={formatarHoras(contratoDetalhe.horas_utilizadas)} />
              <Metrica icon={CheckCircle2} cor="emerald" titulo="Horas Disponíveis" valor={formatarHoras(contratoDetalhe.horas_disponiveis)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Valor Total</p>
                <p className="text-xl font-black text-gray-900">{Number(contratoDetalhe.valor_total).toLocaleString()} Kz</p>
              </div>
              <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Valor p/ Hora</p>
                <p className="text-xl font-black text-gray-900">{Number(contratoDetalhe.valor_hora).toLocaleString()} Kz</p>
              </div>
            </div>

            {contratoDetalhe.observacoes && (
              <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Observações</p>
                <p className="text-sm text-gray-600 italic">"{contratoDetalhe.observacoes}"</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleBaixarPdf(contratoDetalhe)}
                className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg hover:bg-theme-primary-hover transition-all"
              >
                <Download className="w-4 h-4" /> Baixar PDF
              </button>
              <button
                onClick={() => setExibirModalDetalhes(false)}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-600 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all"
              >
                <X className="w-4 h-4" /> Fechar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ label, valor }: { label: string; valor?: string }) {
  return (
    <div className="space-y-1 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-gray-900 capitalize truncate">{valor || '-'}</p>
    </div>
  );
}

function Metrica({ icon: Icon, cor, titulo, valor }: { icon: any; cor: string; titulo: string; valor: string }) {
  return (
    <div className={`p-4 bg-${cor}-50/50 rounded-2xl border border-${cor}-100`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 text-${cor}-600`} />
        <p className={`text-[10px] font-black text-${cor}-400 uppercase tracking-widest`}>{titulo}</p>
      </div>
      <p className={`text-lg font-black text-${cor}-700`}>{valor}</p>
    </div>
  );
}
