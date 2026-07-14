import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Search, FileText, Clock, TrendingUp, CheckCircle2, Download, ArrowLeft,
} from 'lucide-react';
import type { Contrato } from '../../types/api';
import { formatarHoras } from '../../utils/formatters';
import { useClienteChrome } from './ClienteShell';

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
  onAtualizar?: () => void | Promise<void>;
}

const FILTROS_STATUS = [
  { valor: '', label: 'Todos' },
  { valor: 'activo', label: 'Ativos' },
  { valor: 'expirado', label: 'Expirados' },
  { valor: 'cancelado', label: 'Cancelados' },
];

function statusPill(status?: string) {
  if (status === 'activo' || status === 'ativo') return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
  if (status === 'expirado') return { bg: 'bg-red-100', text: 'text-red-700' };
  return { bg: 'bg-[#eceef0]', text: 'text-[#4a4455]' };
}

export function ClienteContratosView({
  contratos, carregando, erro, busca, setBusca, filtroStatus, setFiltroStatus,
  contratoDetalhe, exibirModalDetalhes, setExibirModalDetalhes, handleVerDetalhes, handleBaixarPdf,
  onAtualizar,
}: ClienteContratosViewProps) {
  const ultimoErroMostrado = useRef<string>('');
  const { registarAoAtualizar } = useClienteChrome();

  useEffect(() => {
    if (erro && erro !== ultimoErroMostrado.current) {
      toast.error(erro);
    }
    ultimoErroMostrado.current = erro;
  }, [erro]);

  useEffect(() => {
    registarAoAtualizar(onAtualizar || null);
    return () => registarAoAtualizar(null);
  }, [onAtualizar, registarAoAtualizar]);

  if (exibirModalDetalhes && contratoDetalhe) {
    const pill = statusPill(contratoDetalhe.status);
    return (
      <div className="fixed inset-0 z-30 flex flex-col bg-[#f7f9fb] cliente-font-body">
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3 bg-white border-b border-[#e5e7eb] pt-[calc(8px_+_env(safe-area-inset-top,0px))]">
          <button onClick={() => setExibirModalDetalhes(false)} className="p-2 text-[#191c1e] hover:bg-gray-100 rounded-full flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="cliente-font-heading text-[15px] font-bold text-[#630ed4] truncate">
              Contrato #{contratoDetalhe.numero || contratoDetalhe.id?.substring(0, 8)}
            </p>
          </div>
          <span className={`flex-shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded-full uppercase ${pill.bg} ${pill.text}`}>
            {contratoDetalhe.status}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
          <div className="grid grid-cols-2 gap-3">
            <Info label="Tipo" valor={contratoDetalhe.tipo_contrato} />
            <Info label="Pagamento" valor={contratoDetalhe.tipo_de_pagamento} />
            <Info label="Início" valor={contratoDetalhe.data_inicio ? new Date(contratoDetalhe.data_inicio).toLocaleDateString('pt-PT') : '-'} />
            <Info label="Fim" valor={contratoDetalhe.data_fim ? new Date(contratoDetalhe.data_fim).toLocaleDateString('pt-PT') : '-'} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Metrica icon={Clock} cor="text-[#630ed4]" fundo="bg-[#ede0ff]" titulo="Contratadas" valor={formatarHoras(contratoDetalhe.horas_contratadas)} />
            <Metrica icon={TrendingUp} cor="text-amber-600" fundo="bg-amber-50" titulo="Utilizadas" valor={formatarHoras(contratoDetalhe.horas_utilizadas)} />
            <Metrica icon={CheckCircle2} cor="text-emerald-600" fundo="bg-emerald-50" titulo="Disponíveis" valor={formatarHoras(contratoDetalhe.horas_disponiveis)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-white rounded-[18px] shadow-sm">
              <p className="text-[10px] font-bold text-[#4a4455] uppercase tracking-widest mb-1.5">Valor Total</p>
              <p className="cliente-font-heading text-lg font-bold text-[#191c1e]">{Number(contratoDetalhe.valor_total).toLocaleString()} Kz</p>
            </div>
            <div className="p-4 bg-white rounded-[18px] shadow-sm">
              <p className="text-[10px] font-bold text-[#4a4455] uppercase tracking-widest mb-1.5">Valor p/ Hora</p>
              <p className="cliente-font-heading text-lg font-bold text-[#191c1e]">{Number(contratoDetalhe.valor_hora).toLocaleString()} Kz</p>
            </div>
          </div>

          {contratoDetalhe.observacoes && (
            <div className="p-4 bg-white rounded-[18px] shadow-sm">
              <p className="text-[10px] font-bold text-[#4a4455] uppercase tracking-widest mb-1.5">Observações</p>
              <p className="text-sm text-[#191c1e] italic">"{contratoDetalhe.observacoes}"</p>
            </div>
          )}

          <button
            onClick={() => handleBaixarPdf(contratoDetalhe)}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#7c3aed] text-white font-bold rounded-full shadow-lg shadow-[#7c3aed]/25 hover:bg-[#630ed4] active:scale-[0.99] transition-all"
          >
            <Download className="w-4 h-4" /> Baixar PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
      <div>
        <h2 className="cliente-font-heading text-2xl font-bold text-[#191c1e]">Contratos</h2>
        <p className="text-sm text-[#4a4455] mt-0.5">Os seus contratos com o gabinete de contabilidade</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a4455]" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por número..."
          className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-[#e5e7eb] rounded-full outline-none focus:ring-2 focus:ring-[#7c3aed] transition-all"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
        {FILTROS_STATUS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltroStatus(f.valor)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              filtroStatus === f.valor ? 'bg-[#7c3aed] text-white shadow-md shadow-[#7c3aed]/25' : 'bg-[#eceef0] text-[#4a4455]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-semibold">{erro}</div>
      )}

      <div className="space-y-3">
        {carregando ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-white/60 rounded-[18px] animate-pulse" />)
        ) : contratos.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-400">Nenhum contrato encontrado.</p>
          </div>
        ) : (
          contratos.map((contrato) => {
            const percHoras = contrato.horas_contratadas
              ? Math.min(100, Math.round((Number(contrato.horas_utilizadas) / Number(contrato.horas_contratadas)) * 100))
              : 0;
            const pill = statusPill(contrato.status);
            return (
              <button
                key={contrato.id}
                onClick={() => handleVerDetalhes(contrato.id)}
                className="w-full flex items-center gap-3 p-4 text-left bg-white rounded-[18px] shadow-sm"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#ede0ff] text-[#7c3aed] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[15px] font-bold text-[#191c1e] truncate">#{contrato.numero || contrato.id.substring(0, 6).toUpperCase()}</p>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase ${pill.bg} ${pill.text}`}>{contrato.status}</span>
                  </div>
                  <p className="text-xs text-[#4a4455] capitalize truncate mt-0.5">{contrato.tipo_contrato}</p>
                  {contrato.tipo_de_pagamento === 'horas' && (
                    <div className="h-1.5 bg-[#eceef0] rounded-full overflow-hidden mt-2">
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
    </div>
  );
}

function Info({ label, valor }: { label: string; valor?: string }) {
  return (
    <div className="p-4 bg-white rounded-[18px] shadow-sm">
      <p className="text-[10px] font-bold text-[#4a4455] uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-[#191c1e] capitalize truncate mt-1">{valor || '-'}</p>
    </div>
  );
}

function Metrica({ icon: Icon, cor, fundo, titulo, valor }: { icon: any; cor: string; fundo: string; titulo: string; valor: string }) {
  return (
    <div className="p-3 bg-white rounded-[18px] shadow-sm">
      <div className={`w-8 h-8 rounded-lg ${fundo} flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${cor}`} />
      </div>
      <p className="text-[10px] font-bold text-[#4a4455] uppercase tracking-wide">{titulo}</p>
      <p className="cliente-font-heading text-sm font-bold text-[#191c1e] mt-0.5">{valor}</p>
    </div>
  );
}
