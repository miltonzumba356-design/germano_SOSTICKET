import { useMemo } from 'react';
import { FileText, Clock, Ticket, TrendingUp, AlertCircle, MessageCircle, ArrowRight, Activity } from 'lucide-react';
import type { Intervencao, Contrato } from '../../types/api';
import { formatarHoras } from '../../utils/formatters';
import { ConversaListItem } from './ConversaListItem';
import { definirIntervencaoSelecionada, statusStyle } from './helpers';

interface AtividadeRecente {
  id: string;
  texto: string;
  data: string;
  tipo: 'status' | 'comentario';
}

function construirAtividades(intervencoes: Intervencao[]): AtividadeRecente[] {
  const atividades: AtividadeRecente[] = [];

  intervencoes.forEach((intervencao) => {
    (intervencao.historico_status || []).forEach((h: any) => {
      if (!h?.data_criacao) return;
      atividades.push({
        id: `${intervencao.id}-status-${h.status}`,
        texto: `Atendimento "${intervencao.titulo}" mudou para ${statusStyle(h.status).label.toLowerCase()}`,
        data: h.data_criacao,
        tipo: 'status',
      });
    });

    const comentarios = intervencao.comentarios || intervencao.comentario || [];
    const ultimoComentario = comentarios[comentarios.length - 1];
    if (ultimoComentario?.data_criacao) {
      atividades.push({
        id: `${intervencao.id}-comentario`,
        texto: `Nova mensagem no atendimento "${intervencao.titulo}"`,
        data: ultimoComentario.data_criacao,
        tipo: 'comentario',
      });
    }
  });

  return atividades
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 6);
}

export interface ClienteDashboardViewProps {
  usuario: { nome?: string } | null;
  dadosDashboard: any;
  intervencoes: Intervencao[];
  contratosExpira: Contrato[];
  carregando: boolean;
  onNavigate?: (pagina: string) => void;
}

export function ClienteDashboardView({
  usuario, dadosDashboard, intervencoes, contratosExpira, carregando, onNavigate,
}: ClienteDashboardViewProps) {
  const primeiroNome = (usuario?.nome || 'Cliente').split(' ')[0];
  const atividades = useMemo(() => construirAtividades(intervencoes), [intervencoes]);
  const conversasRecentes = useMemo(() => intervencoes.slice(0, 6), [intervencoes]);

  const horasDisponiveis = Number(dadosDashboard?.total_horas_disponiveis || 0);
  const horasContratadas = Number(dadosDashboard?.total_horas_contratadas || 0);
  const consumoAlto = horasContratadas > 0 && horasDisponiveis / horasContratadas < 0.15;

  const abrirConversa = (intervencao: Intervencao) => {
    definirIntervencaoSelecionada(intervencao.id);
    onNavigate?.('intervencoes');
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="text-2xl font-black text-gray-900">Olá, {primeiroNome} 👋</h2>
        <p className="text-sm text-gray-500 mt-0.5">Portal Contábil Digital · Comunique-se diretamente com o seu gabinete de contabilidade.</p>
      </div>

      {/* Widgets compactos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Widget icon={FileText} cor="bg-violet-500" titulo="Contratos Ativos" valor={dadosDashboard?.contratos_ativos ?? 0} carregando={carregando} />
        <Widget icon={Clock} cor="bg-indigo-500" titulo="Horas Disponíveis" valor={formatarHoras(dadosDashboard?.total_horas_disponiveis)} carregando={carregando} />
        <Widget icon={Ticket} cor="bg-amber-500" titulo="Atendimentos em Aberto" valor={dadosDashboard?.intervencoes_abertas ?? 0} carregando={carregando} />
        <Widget icon={TrendingUp} cor="bg-emerald-500" titulo="Concluídos (Mês)" valor={dadosDashboard?.intervencoes_concluidas ?? 0} carregando={carregando} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversas recentes */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-theme-primary" /> Atendimentos Recentes
            </h3>
            <button onClick={() => onNavigate?.('intervencoes')} className="text-xs font-bold text-theme-primary hover:opacity-80 flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div>
            {conversasRecentes.length === 0 ? (
              <p className="p-8 text-sm text-center text-gray-400">Nenhum atendimento ainda. Abra a sua primeira solicitação.</p>
            ) : (
              conversasRecentes.map((intervencao) => (
                <ConversaListItem
                  key={intervencao.id}
                  intervencao={intervencao}
                  nomeUsuario={usuario?.nome}
                  onClick={() => abrirConversa(intervencao)}
                />
              ))
            )}
          </div>
        </div>

        {/* Últimas atividades */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-theme-primary" /> Últimas atividades
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {atividades.length === 0 ? (
              <p className="p-6 text-sm text-center text-gray-400">Sem atividade recente.</p>
            ) : (
              atividades.map((atividade) => (
                <div key={atividade.id} className="px-5 py-3 flex items-start gap-3">
                  <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${atividade.tipo === 'comentario' ? 'bg-theme-primary' : 'bg-amber-400'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-700 leading-snug">{atividade.texto}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{new Date(atividade.data).toLocaleString('pt-PT')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Alertas importantes */}
      {(contratosExpira.length > 0 || consumoAlto) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contratosExpira.length > 0 && (
            <div className="flex items-start gap-4 p-5 bg-red-50 border border-red-100 rounded-2xl">
              <div className="p-3 bg-red-100 rounded-xl"><AlertCircle className="w-5 h-5 text-red-600" /></div>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900">Contrato a expirar</p>
                <p className="text-xs text-red-700 mt-1">
                  {contratosExpira.length === 1
                    ? 'Um dos seus contratos vence nos próximos 30 dias.'
                    : `${contratosExpira.length} dos seus contratos vencem nos próximos 30 dias.`}
                </p>
              </div>
              <button onClick={() => onNavigate?.('contratos')} className="text-xs font-bold text-red-700 hover:underline flex-shrink-0">Ver</button>
            </div>
          )}
          {consumoAlto && (
            <div className="flex items-start gap-4 p-5 bg-amber-50 border border-amber-100 rounded-2xl">
              <div className="p-3 bg-amber-100 rounded-xl"><Clock className="w-5 h-5 text-amber-600" /></div>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-900">Poucas horas disponíveis</p>
                <p className="text-xs text-amber-700 mt-1">O seu pacote de horas está quase a esgotar-se.</p>
              </div>
              <button onClick={() => onNavigate?.('contratos')} className="text-xs font-bold text-amber-700 hover:underline flex-shrink-0">Ver</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Widget({
  icon: Icon, cor, titulo, valor, carregando,
}: { icon: any; cor: string; titulo: string; valor: string | number; carregando?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${cor} bg-opacity-10 flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${cor.replace('bg-', 'text-')}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate">{titulo}</p>
        <p className="text-lg font-black text-gray-900">{carregando ? '…' : valor}</p>
      </div>
    </div>
  );
}
