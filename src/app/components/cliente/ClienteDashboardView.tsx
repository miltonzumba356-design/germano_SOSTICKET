import { useMemo } from 'react';
import {
  FileText, Clock, AlertTriangle, CheckCircle2, AlertCircle, MessageCircle,
  ArrowRight, Bell, Plus,
} from 'lucide-react';
import type { Intervencao, Contrato } from '../../types/api';
import { formatarHoras } from '../../utils/formatters';
import { ConversaListItem } from './ConversaListItem';
import { definirIntervencaoSelecionada, sinalizarNovoAtendimento, statusStyle } from './helpers';

interface AtividadeRecente {
  id: string;
  texto: string;
  descricao: string;
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
        texto: `Atendimento atualizado`,
        descricao: `"${intervencao.titulo}" mudou para ${statusStyle(h.status).label.toLowerCase()}.`,
        data: h.data_criacao,
        tipo: 'status',
      });
    });

    const comentarios = intervencao.comentarios || intervencao.comentario || [];
    const ultimoComentario = comentarios[comentarios.length - 1];
    if (ultimoComentario?.data_criacao) {
      atividades.push({
        id: `${intervencao.id}-comentario`,
        texto: 'Nova mensagem',
        descricao: `Resposta recebida no atendimento "${intervencao.titulo}".`,
        data: ultimoComentario.data_criacao,
        tipo: 'comentario',
      });
    }
  });

  return atividades
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 6);
}

function tempoRelativo(data: string) {
  const diffMs = Date.now() - new Date(data).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `${min} minuto${min > 1 ? 's' : ''} atrás`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `${horas} hora${horas > 1 ? 's' : ''} atrás`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'Ontem';
  return `${dias} dias atrás`;
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
  const conversasRecentes = useMemo(() => intervencoes.slice(0, 4), [intervencoes]);

  const ticketsAbertos = Number(dadosDashboard?.intervencoes_abertas ?? 0);
  const horasDisponiveis = Number(dadosDashboard?.total_horas_disponiveis || 0);
  const horasContratadas = Number(dadosDashboard?.total_horas_contratadas || 0);
  const consumoAlto = horasContratadas > 0 && horasDisponiveis / horasContratadas < 0.15;

  const abrirConversa = (intervencao: Intervencao) => {
    definirIntervencaoSelecionada(intervencao.id);
    onNavigate?.('intervencoes');
  };

  const abrirNovoAtendimento = () => {
    sinalizarNovoAtendimento();
    onNavigate?.('intervencoes');
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-6">
      <div>
        <h2 className="cliente-font-heading text-2xl font-bold text-[#191c1e]">Olá, {primeiroNome}</h2>
        <p className="text-sm text-[#4a4455] mt-0.5">Veja o que está a acontecer com os seus atendimentos hoje.</p>
      </div>

      {/* Widgets 2x2 em mobile, 4 colunas em desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Widget
          icon={FileText}
          cor="text-[#7c3aed]"
          fundo="bg-[#ede0ff]"
          titulo="Contratos Ativos"
          valor={dadosDashboard?.contratos_ativos ?? 0}
          carregando={carregando}
        />
        <Widget
          icon={Clock}
          cor="text-[#630ed4]"
          fundo="bg-[#ede0ff]"
          titulo="Horas Disponíveis"
          valor={formatarHoras(dadosDashboard?.total_horas_disponiveis)}
          carregando={carregando}
        />
        <Widget
          icon={AlertTriangle}
          cor="text-red-600"
          fundo="bg-red-50"
          titulo="Atendimentos Abertos"
          valor={ticketsAbertos}
          carregando={carregando}
          destaque={ticketsAbertos > 0}
        />
        <Widget
          icon={CheckCircle2}
          cor="text-[#4a4455]"
          fundo="bg-[#eceef0]"
          titulo="Atendimentos Concluídos"
          valor={dadosDashboard?.intervencoes_concluidas ?? 0}
          carregando={carregando}
        />
      </div>

      {/* Atendimentos recentes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="cliente-font-heading text-base font-bold text-[#191c1e]">Atendimentos Recentes</h3>
          <button onClick={() => onNavigate?.('intervencoes')} className="text-xs font-semibold text-[#7c3aed] flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {conversasRecentes.length === 0 ? (
          <div className="bg-white rounded-[18px] shadow-sm p-8 text-center">
            <MessageCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum atendimento ainda. Abra a sua primeira solicitação.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversasRecentes.map((intervencao) => (
              <ConversaListItem
                key={intervencao.id}
                intervencao={intervencao}
                nomeUsuario={usuario?.nome}
                onClick={() => abrirConversa(intervencao)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Atividades e alertas */}
      <div>
        <h3 className="cliente-font-heading text-base font-bold text-[#191c1e] mb-3">Atividade e Alertas</h3>
        <div className="space-y-3">
          {contratosExpira.length > 0 && (
            <AtividadeCard
              icon={AlertCircle}
              cor="text-red-600"
              fundo="bg-red-100"
              destaque
              titulo="Contrato a expirar"
              descricao={
                contratosExpira.length === 1
                  ? 'Um dos seus contratos vence nos próximos 30 dias.'
                  : `${contratosExpira.length} dos seus contratos vencem nos próximos 30 dias.`
              }
              tempo="Ação necessária"
            />
          )}
          {consumoAlto && (
            <AtividadeCard
              icon={Clock}
              cor="text-amber-600"
              fundo="bg-amber-100"
              titulo="Poucas horas disponíveis"
              descricao="O seu pacote de horas contratado está quase a esgotar-se."
              tempo="Ação necessária"
            />
          )}
          {atividades.length === 0 && contratosExpira.length === 0 && !consumoAlto ? (
            <div className="bg-white rounded-[18px] shadow-sm p-6 text-center">
              <Bell className="w-6 h-6 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Sem atividade recente.</p>
            </div>
          ) : (
            atividades.map((atividade) => (
              <AtividadeCard
                key={atividade.id}
                icon={atividade.tipo === 'comentario' ? MessageCircle : Bell}
                cor="text-[#4a4455]"
                fundo="bg-[#eceef0]"
                titulo={atividade.texto}
                descricao={atividade.descricao}
                tempo={tempoRelativo(atividade.data)}
              />
            ))
          )}
        </div>
      </div>

      {/* Botão nova intervenção: FAB mobile, botão inline desktop */}
      <div className="hidden md:block pt-2">
        <button
          onClick={abrirNovoAtendimento}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#7c3aed] text-white font-bold rounded-[18px] shadow-lg shadow-[#7c3aed]/25 hover:bg-[#630ed4] transition-all"
        >
          <Plus className="w-5 h-5" />
          Abrir Novo Atendimento
        </button>
      </div>

      <button
        onClick={abrirNovoAtendimento}
        className="md:hidden fixed bottom-24 right-5 z-30 w-14 h-14 bg-[#7c3aed] text-white rounded-full shadow-xl shadow-[#7c3aed]/30 flex items-center justify-center hover:bg-[#630ed4] active:scale-95 transition-all"
        title="Novo Atendimento"
        aria-label="Novo Atendimento"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

function Widget({
  icon: Icon, cor, fundo, titulo, valor, carregando, destaque,
}: { icon: any; cor: string; fundo: string; titulo: string; valor: string | number; carregando?: boolean; destaque?: boolean }) {
  return (
    <div className="relative bg-white rounded-[18px] shadow-sm p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${fundo}`}>
          <Icon className={`w-5 h-5 ${cor}`} />
        </div>
        {destaque && <span className="w-2.5 h-2.5 rounded-full bg-red-600" />}
      </div>
      <p className="cliente-font-heading text-xl font-bold text-[#191c1e]">{carregando ? '…' : valor}</p>
      <p className="text-xs text-[#4a4455] mt-0.5">{titulo}</p>
    </div>
  );
}

function AtividadeCard({
  icon: Icon, cor, fundo, titulo, descricao, tempo, destaque,
}: { icon: any; cor: string; fundo: string; titulo: string; descricao: string; tempo: string; destaque?: boolean }) {
  return (
    <div className={`flex items-start gap-3 bg-white rounded-[18px] shadow-sm p-4 ${destaque ? 'border-l-4 border-l-[#7c3aed]' : ''}`}>
      <div className={`p-2.5 rounded-xl flex-shrink-0 ${fundo}`}>
        <Icon className={`w-4 h-4 ${cor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#191c1e]">{titulo}</p>
        <p className="text-xs text-[#4a4455] mt-0.5">{descricao}</p>
        <p className="flex items-center gap-1 text-[11px] text-[#7c3aed] font-semibold mt-1.5">
          <Clock className="w-3 h-3" /> {tempo}
        </p>
      </div>
    </div>
  );
}
