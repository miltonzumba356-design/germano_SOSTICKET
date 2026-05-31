import { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  MapPin,
  Laptop,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Info,
  X,
  Trash2,
  Edit2,
  Download,
  Check,
  Play,
  Pause,
  Square,
  History
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCronometro } from '../contexts/CronometroContext';
import { 
  intervencoesService, 
  relatoriosService 
} from '../services/api';
import { HoraTrabalho, Intervencao, CronometroState } from '../types/api';
import { formatarHoras } from '../utils/formatters';

function normalizarLista<T>(response: any): T[] {
  const lista = Array.isArray(response)
    ? response
    : response?.results || response?.data?.results || response?.data || [];

  return Array.isArray(lista) ? lista : [];
}

function normalizarDashboardTecnico(response: any) {
  return response?.data || response || {};
}

function primeiroNumero(...valores: unknown[]) {
  for (const valor of valores) {
    const numero = Number(valor);
    if (Number.isFinite(numero)) return numero;
  }

  return 0;
}

function extrairResumoTecnico(dados: any) {
  const resumo = dados?.resumo || dados?.horas || dados?.metricas || {};
  const graficoSemana = normalizarLista<any>(dados?.grafico_horas_semana || []);
  const semanaAtual = graficoSemana.length ? graficoSemana[graficoSemana.length - 1] : null;

  return {
    hoje: primeiroNumero(
      dados?.horas_hoje,
      dados?.total_horas_hoje,
      dados?.hoje,
      resumo?.hoje,
      resumo?.horas_hoje,
      resumo?.total_horas_hoje
    ),
    semana: primeiroNumero(
      dados?.horas_semana,
      dados?.total_horas_semana,
      dados?.semana,
      resumo?.semana,
      resumo?.horas_semana,
      resumo?.total_horas_semana,
      semanaAtual?.total
    ),
    mes: primeiroNumero(
      dados?.total_horas_mes,
      dados?.horas_mes,
      dados?.mes,
      resumo?.mes,
      resumo?.total_horas_mes
    ),
  };
}

function calcularResumoPorIntervencoes(intervencoes: Intervencao[]) {
  const agora = new Date();
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioSemana = new Date(inicioHoje);
  inicioSemana.setDate(inicioHoje.getDate() - inicioHoje.getDay());
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  return intervencoes.reduce((total, intervencao) => {
    const dataBase = intervencao.data_conclusao || intervencao.data_fim_intervencao || intervencao.data_abertura;
    if (!dataBase) return total;

    const data = new Date(dataBase);
    if (Number.isNaN(data.getTime())) return total;

    const horas = primeiroNumero(intervencao.horas_trabalhadas);
    if (data >= inicioHoje) total.hoje += horas;
    if (data >= inicioSemana) total.semana += horas;
    if (data >= inicioMes) total.mes += horas;
    return total;
  }, { hoje: 0, semana: 0, mes: 0 });
}

function combinarResumoTecnico(dados: any, intervencoes: Intervencao[]) {
  const resumoDashboard = extrairResumoTecnico(dados);
  const resumoIntervencoes = calcularResumoPorIntervencoes(intervencoes);

  return {
    hoje: resumoDashboard.hoje || resumoIntervencoes.hoje,
    semana: resumoDashboard.semana || resumoIntervencoes.semana,
    mes: resumoDashboard.mes || resumoIntervencoes.mes,
  };
}

function extrairHistoricoTecnico(dados: any): HoraTrabalho[] {
  const historico = normalizarLista<any>(
    dados?.historico_horas ||
    dados?.historico ||
    dados?.ultimas_horas ||
    dados?.ultimas_intervencoes ||
    dados?.proximas_intervencoes ||
    dados?.intervencoes ||
    dados?.detalhes ||
    []
  );

  return historico.map((item, index) => ({
    id: String(item.id || item.hora_id || item.intervencao_id || `historico-${index}`),
    intervencao: String(item.intervencao || item.intervencao_id || item.numero || item.intervencao_numero || ''),
    intervencao_id: item.intervencao_id || item.id,
    intervencao_numero: item.intervencao_numero || item.numero,
    intervencao_titulo: item.intervencao_titulo || item.titulo,
    tecnico: item.tecnico,
    tecnico_id: item.tecnico_id,
    tecnico_nome: item.tecnico_nome,
    cliente_nome: item.cliente_nome,
    horas: primeiroNumero(item.horas, item.horas_trabalhadas, item.total_horas, item.tempo_total),
    data_trabalho: item.data_trabalho || item.data || item.data_conclusao || item.data_fim_intervencao || item.data_abertura || new Date().toISOString(),
    descricao: item.descricao || item.observacao || item.titulo || 'Sem descricao registada.',
    tipo: item.tipo || item.actuacao_tipo || 'remoto',
  }));
}

function extrairSerieHoras(dados: any) {
  const serie = normalizarLista<any>(
    dados?.grafico_horas_semana ||
    dados?.horas_por_dia ||
    dados?.grafico_horas ||
    dados?.grafico_horas_dia ||
    dados?.evolucao_horas ||
    dados?.historico_horas ||
    []
  );

  return serie.map((item, index) => ({
    name: item.dia || item.data || item.semana || item.mes || item.periodo || `Item ${index + 1}`,
    total: primeiroNumero(item.total, item.horas, item.valor, item.total_horas),
  }));
}

function extrairStatusRelatorio(dados: any) {
  const status = normalizarLista<any>(dados?.por_status || dados?.status_intervencoes || dados?.intervencoes_por_status || []);

  return status.map((item) => ({
    label: item.status || item.name || item.label || 'Sem status',
    total: primeiroNumero(item.total, item.value, item.quantidade),
  }));
}

function intervencaoParaHistorico(item: Intervencao, index: number): HoraTrabalho {
  return {
    id: String(item.id || `intervencao-${index}`),
    intervencao: String(item.numero || item.id || ''),
    intervencao_id: item.id,
    intervencao_numero: item.numero,
    intervencao_titulo: item.titulo,
    tecnico_id: item.tecnico_id,
    tecnico_nome: item.tecnico_nome,
    cliente_nome: item.cliente_nome,
    horas: primeiroNumero(item.horas_trabalhadas),
    data_trabalho: item.data_conclusao || item.data_fim_intervencao || item.data_abertura || new Date().toISOString(),
    descricao: item.descricao || item.titulo || 'Sem descricao registada.',
    tipo: item.actuacao_tipo || 'remoto',
  };
}

export function Horas() {
  const { usuario } = useAuth();
  const { cronometros, iniciar, pausar, retomar, parar, carregando: carregandoTimers } = useCronometro();
  const [tab, setTab] = useState<'cronometro' | 'minhas' | 'historico'>('cronometro');
  const [carregando, setCarregando] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [erro, setErro] = useState('');
  
  const isAdmin = usuario?.perfil === 'admin';
  const isTecnico = usuario?.perfil === 'tecnico';
  
  // Estados para Registro
  const [intervencoes, setIntervencoes] = useState<Intervencao[]>([]);
  const [resumoTecnico, setResumoTecnico] = useState({ hoje: 0, semana: 0, mes: 0 });
  const [dashboardTecnico, setDashboardTecnico] = useState<any>({});
  const [novaSessao, setNovaSessao] = useState({
    intervencao_id: '',
    tipo: 'presencial' as 'presencial' | 'remoto'
  });

  // Estado para Modal de Parar
  const [modalParar, setModalParar] = useState<{aberto: boolean, cronometro: CronometroState | null}>({
    aberto: false,
    cronometro: null
  });
  const [pararDados, setPararDados] = useState({
    descricao: '',
    horasAjustadas: 0
  });

  // Estados para Lista
  const [listaHoras, setListaHoras] = useState<HoraTrabalho[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  useEffect(() => {
    carregarDadosIniciais();
  }, [tab, pagina, busca, filtroTipo]);

  useEffect(() => {
    if (tab !== 'cronometro' || novaSessao.intervencao_id) return;
    const intervencaoId = localStorage.getItem('cronometro_intervencao_id');
    if (!intervencaoId) return;
    if (intervencoes.some((intervencao) => intervencao.id === intervencaoId)) {
      setNovaSessao((prev) => ({ ...prev, intervencao_id: intervencaoId }));
      localStorage.removeItem('cronometro_intervencao_id');
    }
  }, [tab, intervencoes, novaSessao.intervencao_id]);

  const carregarDadosIniciais = async () => {
    setCarregando(true);
    try {
      if (tab === 'cronometro') {
        const [intervs, dashboard] = await Promise.all([
          intervencoesService.listar({ limit: 100 }),
          relatoriosService.dashboardTecnico().catch(() => ({}))
        ]);
        
        const results = normalizarLista<Intervencao>(intervs);
        const dadosDashboard = normalizarDashboardTecnico(dashboard);
        
        setIntervencoes(results.filter((intervencao: Intervencao) =>
          !['resolvido', 'fechado', 'concluido'].includes(intervencao.status || '')
        ));
        setDashboardTecnico(dadosDashboard);
        setResumoTecnico(combinarResumoTecnico(dadosDashboard, results));
      } else if (tab === 'minhas' || tab === 'historico') {
        const [dashboard, intervs] = await Promise.all([
          relatoriosService.dashboardTecnico(),
          intervencoesService.listar({ limit: 100 }),
        ]);
        const dadosDashboard = normalizarDashboardTecnico(dashboard);
        const intervencoesTecnico = normalizarLista<Intervencao>(intervs);
        const historicoIntervencoes = intervencoesTecnico.map(intervencaoParaHistorico);
        const historicoDashboard = extrairHistoricoTecnico(dadosDashboard);
        const historico = historicoIntervencoes.length ? historicoIntervencoes : historicoDashboard;
        const termo = busca.trim().toLowerCase();
        const historicoFiltrado = historico.filter((item) => {
          const texto = [
            item.intervencao,
            item.intervencao_numero,
            item.intervencao_titulo,
            item.cliente_nome,
            item.descricao,
            item.tipo,
          ].filter(Boolean).join(' ').toLowerCase();
          const bateBusca = !termo || texto.includes(termo);
          const bateTipo = !filtroTipo || item.tipo === filtroTipo;
          return bateBusca && bateTipo;
        });
        const total = Math.max(1, Math.ceil(historicoFiltrado.length / 10));
        const inicio = (pagina - 1) * 10;

        setDashboardTecnico(dadosDashboard);
        setResumoTecnico(combinarResumoTecnico(dadosDashboard, intervencoesTecnico));
        setListaHoras(historicoFiltrado.slice(inicio, inicio + 10));
        setTotalPaginas(total);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setCarregando(false);
    }
  };

  const handleIniciarTimer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaSessao.intervencao_id) {
      setErro('Selecione uma intervenção.');
      return;
    }

    try {
      setStatus('loading');
      await iniciar(novaSessao.intervencao_id, novaSessao.tipo);
      setNovaSessao({ intervencao_id: '', tipo: 'presencial' });
      setStatus('idle');
      await carregarDadosIniciais();
    } catch (err: any) {
      setErro(err.message || 'Erro ao iniciar cronómetro.');
      setStatus('error');
    }
  };

  const abrirModalParar = (c: CronometroState) => {
    const horasSugeridas = arredondarHoras(c.tempoAtual || 0);
    setPararDados({
      descricao: '',
      horasAjustadas: horasSugeridas
    });
    setModalParar({ aberto: true, cronometro: c });
  };

  const handleConfirmarParar = async () => {
    if (!modalParar.cronometro || pararDados.descricao.length < 20) {
      setErro('A descrição deve ter pelo menos 20 caracteres.');
      return;
    }

    try {
      setStatus('loading');
      await parar(modalParar.cronometro.id, pararDados.descricao, pararDados.horasAjustadas);
      setModalParar({ aberto: false, cronometro: null });
      setStatus('idle');
      carregarDadosIniciais();
    } catch (err: any) {
      setErro(err.message || 'Erro ao guardar horas.');
      setStatus('error');
    }
  };

  // Funções Auxiliares
  const handleSalvarCronometro = async (cronometro: CronometroState) => {
    try {
      setStatus('loading');
      setErro('');
      await parar(cronometro.id, 'Cronometro finalizado pelo tecnico.', arredondarHoras(cronometro.tempoAtual || 0));
      setStatus('idle');
      await carregarDadosIniciais();
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar o cronometro.');
      setStatus('error');
    }
  };

  const formatarTempo = (segundos: number) => {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = Math.floor(segundos % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const arredondarHoras = (segundos: number) => {
    const horas = segundos / 3600;
    const arredondado = Number(horas.toFixed(2));
    return segundos > 0 && arredondado === 0 ? 0.01 : arredondado;
  };

  const intervencoesComCronometro = new Set(cronometros.map((cronometro) => cronometro.intervencao_id));
  const intervencoesDisponiveis = intervencoes.filter((intervencao) => !intervencoesComCronometro.has(intervencao.id));
  const serieHoras = extrairSerieHoras(dashboardTecnico);
  const statusRelatorio = extrairStatusRelatorio(dashboardTecnico);
  const totalIntervencoes = primeiroNumero(
    dashboardTecnico?.intervencoes_atribuidas,
    dashboardTecnico?.total_intervencoes,
    dashboardTecnico?.meus_tickets
  );
  const intervencoesAndamento = primeiroNumero(
    dashboardTecnico?.intervencoes_em_andamento,
    dashboardTecnico?.em_andamento,
    dashboardTecnico?.tickets_em_andamento
  );
  const intervencoesConcluidas = primeiroNumero(
    dashboardTecnico?.intervencoes_concluidas_mes,
    dashboardTecnico?.intervencoes_concluidas,
    dashboardTecnico?.concluidas_mes
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Estilizado */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <div className="p-2 bg-emerald-500 rounded-lg text-white">
               <Clock className="w-5 h-5" />
             </div>
             <span className="text-emerald-600 font-black text-xs uppercase tracking-widest">Módulo Técnico</span>
          </div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Cronómetro de Horas</h2>
          <p className="text-gray-500 font-bold mt-1 uppercase text-[10px] tracking-widest">Versão 1.0.0 • Gestão em Tempo Real</p>
        </div>

        <div className="flex bg-gray-100 p-1.5 rounded-2xl shadow-inner">
          {[
            { id: 'cronometro', label: 'Cronómetro', icon: Clock },
            { id: 'minhas', label: 'Histórico', icon: History },
            { id: 'historico', label: 'Relatórios', icon: TrendingUp }
          ].map((t) => (
            <button 
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${tab === t.id ? 'bg-white text-emerald-600 shadow-xl scale-105' : 'text-gray-500 hover:text-emerald-500'}`}
            >
              <t.icon className={`w-4 h-4 ${tab === t.id ? 'text-emerald-500' : ''}`} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-gray-100" />

      {erro && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-bold">{erro}</span>
        </div>
      )}

      {/* Conteúdo das Abas */}
      <div className="min-h-[600px]">
        {tab === 'cronometro' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Coluna Principal: Cronómetros Ativos */}
            <div className="lg:col-span-2 space-y-8">
               <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
                 <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                    <div>
                       <h3 className="text-xl font-black text-gray-900">Cronómetros Ativos</h3>
                       <p className="text-sm text-gray-500 font-medium">Você pode ter até 3 cronómetros simultâneos.</p>
                    </div>
                    <div className="px-4 py-2 bg-gray-100 rounded-full text-xs font-black text-gray-600">
                      {cronometros.length} / 3
                    </div>
                 </div>

                 <div className="p-8 space-y-6">
                    {cronometros.length === 0 ? (
                      <div className="py-20 text-center space-y-4">
                         <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                            <Clock className="w-10 h-10 text-gray-300" />
                         </div>
                         <p className="text-gray-500 font-bold italic">Nenhum cronómetro ativo no momento.</p>
                      </div>
                    ) : (
                      cronometros.map(c => (
                        <div key={c.id} className="bg-gray-50 rounded-[24px] p-8 border-2 border-transparent hover:border-emerald-500 transition-all group">
                           <div className="flex flex-col md:flex-row justify-between gap-6">
                              <div className="space-y-4">
                                 <div>
                                    <div className="flex items-center gap-2 mb-1">
                                       <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">{c.intervencao_numero || 'INT-XXXX'}</span>
                                       <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${c.status === 'ativo' ? 'bg-emerald-500 text-white animate-pulse' : 'bg-amber-500 text-white'}`}>
                                          {c.status === 'ativo' ? 'AO VIVO' : 'PAUSADO'}
                                       </span>
                                    </div>
                                    <h4 className="text-lg font-black text-gray-900">{c.intervencao_titulo || 'Carregando...'}</h4>
                                    <p className="text-sm text-gray-500 font-bold">{c.cliente_nome || 'Cliente não identificado'}</p>
                                 </div>
                                 <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                       <CalendarIcon className="w-4 h-4 text-gray-400" />
                                       <span className="text-xs font-bold text-gray-600">Iniciado: {new Date(c.hora_inicio).toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       {c.tipo === 'presencial' ? <MapPin className="w-4 h-4 text-blue-400" /> : <Laptop className="w-4 h-4 text-purple-400" />}
                                       <span className="text-xs font-bold text-gray-600 uppercase">{c.tipo}</span>
                                    </div>
                                 </div>
                              </div>

                              <div className="flex flex-col items-center justify-center gap-4 bg-white p-6 rounded-[24px] shadow-sm min-w-[200px]">
                                 <div className="text-4xl font-black text-gray-900 tracking-tighter tabular-nums">
                                    {formatarTempo(c.tempoAtual || 0)}
                                 </div>
                                 <div className="flex gap-2">
                                    {c.status === 'ativo' ? (
                                      <button 
                                        onClick={() => pausar(c.id)}
                                        className="p-4 bg-amber-100 text-amber-600 rounded-2xl hover:bg-amber-200 transition-colors"
                                      >
                                        <Pause className="w-6 h-6 fill-current" />
                                      </button>
                                    ) : (
                                      <button 
                                        onClick={() => retomar(c.id)}
                                        className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl hover:bg-emerald-200 transition-colors"
                                      >
                                        <Play className="w-6 h-6 fill-current" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleSalvarCronometro(c)}
                                      disabled={status === 'loading'}
                                      className="px-4 py-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-colors font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
                                    >
                                      <Check className="w-5 h-5" />
                                      Salvar
                                    </button>
                                 </div>
                              </div>
                           </div>
                        </div>
                      ))
                    )}
                 </div>
               </div>

               {/* Iniciar Novo */}
               <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl p-8">
                  <h3 className="text-xl font-black text-gray-900 mb-6">Iniciar Novo Cronómetro</h3>
                  <form onSubmit={handleIniciarTimer} className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Intervenção</label>
                      <select 
                        value={novaSessao.intervencao_id}
                        onChange={(e) => setNovaSessao({...novaSessao, intervencao_id: e.target.value})}
                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                      >
                        <option value="">Selecione a intervenção...</option>
                        {intervencoesDisponiveis.map(i => (
                          <option key={i.id} value={i.id}>#{i.numero} - {i.titulo}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full md:w-48 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</label>
                      <div className="flex p-1 bg-gray-100 rounded-2xl">
                        <button 
                          type="button"
                          onClick={() => setNovaSessao({...novaSessao, tipo: 'presencial'})}
                          className={`flex-1 flex items-center justify-center p-3 rounded-xl transition-all ${novaSessao.tipo === 'presencial' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setNovaSessao({...novaSessao, tipo: 'remoto'})}
                          className={`flex-1 flex items-center justify-center p-3 rounded-xl transition-all ${novaSessao.tipo === 'remoto' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
                        >
                          <Laptop className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <button 
                        type="submit"
                        disabled={cronometros.length >= 3 || status === 'loading'}
                        className="w-full md:w-auto px-10 py-4 bg-emerald-600 text-white rounded-[20px] font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                      >
                        {status === 'loading' ? 'Iniciando...' : 'Iniciar Timer'}
                      </button>
                    </div>
                  </form>
               </div>
            </div>

            {/* Sidebar: Resumo do Dia */}
            <div className="space-y-8">
               <div className="grid grid-cols-1 gap-6">
                  <StatCard icon={Clock} label="Hoje" value={formatarHoras(resumoTecnico.hoje)} sub="Trabalho acumulado" color="emerald" />
                  <StatCard icon={TrendingUp} label="Semana" value={formatarHoras(resumoTecnico.semana)} sub="Total desta semana" color="blue" />
               </div>

               <div className="bg-emerald-900 p-8 rounded-[32px] text-white space-y-6 shadow-2xl">
                  <div className="p-3 bg-white/10 rounded-2xl w-fit">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-black leading-tight">Os seus dados são sincronizados automaticamente a cada 30 segundos.</h4>
                  <p className="text-emerald-200 text-sm">Se o browser fechar, você poderá recuperar o tempo acumulado ao reabrir.</p>
               </div>
            </div>
          </div>
        )}

        {tab === 'minhas' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             {/* Tabela de Lançamentos Recentes */}
             <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                   <h3 className="text-xl font-black text-gray-900">Histórico de Lançamentos</h3>
                   <div className="flex gap-2">
                      <div className="relative">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                         <input 
                           type="text" 
                           value={busca}
                           onChange={(e) => setBusca(e.target.value)}
                           placeholder="Pesquisar..." 
                           className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm font-bold w-64"
                         />
                      </div>
                   </div>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead className="bg-gray-50/50">
                         <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <th className="px-8 py-6">Data</th>
                            <th className="px-8 py-6">Intervenção</th>
                            <th className="px-8 py-6">Horas</th>
                            <th className="px-8 py-6">Descrição</th>
                            <th className="px-8 py-6 text-right">Ação</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                         {listaHoras.map(h => (
                            <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                               <td className="px-8 py-6 text-sm font-black text-gray-900">{new Date(h.data_trabalho).toLocaleDateString('pt-PT')}</td>
                               <td className="px-8 py-6">
                                  <div className="text-sm font-black text-emerald-600">#{h.intervencao_numero || String(h.intervencao || h.intervencao_id || 'INT').split('-')[0].toUpperCase()}</div>
                                  <div className="text-xs text-gray-400 font-bold truncate max-w-xs">{h.intervencao_titulo || h.cliente_nome || 'Intervenção'}</div>
                               </td>
                               <td className="px-8 py-6">
                                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black">{formatarHoras(h.horas)}</span>
                               </td>
                               <td className="px-8 py-6 text-xs text-gray-500 font-medium max-w-xs truncate">{h.descricao}</td>
                               <td className="px-8 py-6 text-right">
                                  <button className="p-2 text-gray-400 hover:text-gray-600"><MoreVertical className="w-5 h-5" /></button>
                               </td>
                            </tr>
                         ))}
                         {listaHoras.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-8 py-16 text-center text-gray-400 font-bold">Sem histórico no dashboard técnico.</td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
                {totalPaginas > 1 && (
                  <div className="p-6 border-t border-gray-50 flex items-center justify-end gap-3">
                    <button
                      onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
                      disabled={pagina === 1}
                      className="p-2 rounded-xl border border-gray-100 text-gray-500 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-gray-500 uppercase">{pagina} / {totalPaginas}</span>
                    <button
                      onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))}
                      disabled={pagina === totalPaginas}
                      className="p-2 rounded-xl border border-gray-100 text-gray-500 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
             </div>
          </div>
        )}

        {tab === 'historico' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard icon={Clock} label="Horas Hoje" value={formatarHoras(resumoTecnico.hoje)} sub="Dashboard técnico" color="emerald" />
              <StatCard icon={TrendingUp} label="Horas Semana" value={formatarHoras(resumoTecnico.semana)} sub="Dashboard técnico" color="blue" />
              <StatCard icon={FileText} label="Tickets" value={String(totalIntervencoes)} sub="Atribuídos ao técnico" color="indigo" />
              <StatCard icon={CheckCircle2} label="Concluídos" value={String(intervencoesConcluidas)} sub="Período atual" color="amber" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-gray-50">
                  <h3 className="text-xl font-black text-gray-900">Resumo de Produtividade</h3>
                  <p className="text-sm text-gray-500 font-medium">Dados vindos do dashboard técnico.</p>
                </div>
                <div className="p-8 space-y-5">
                  {[
                    { label: 'Intervenções atribuídas', value: totalIntervencoes },
                    { label: 'Em andamento', value: intervencoesAndamento },
                    { label: 'Concluídas', value: intervencoesConcluidas },
                    { label: 'Horas do mês', value: formatarHoras(resumoTecnico.mes) },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                      <span className="text-sm font-black text-gray-500 uppercase tracking-widest">{item.label}</span>
                      <span className="text-lg font-black text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-gray-50">
                  <h3 className="text-xl font-black text-gray-900">Horas por Período</h3>
                  <p className="text-sm text-gray-500 font-medium">Série recebida pelo relatório técnico.</p>
                </div>
                <div className="p-8 space-y-4">
                  {(serieHoras.length ? serieHoras : [
                    { name: 'Hoje', total: resumoTecnico.hoje },
                    { name: 'Semana', total: resumoTecnico.semana },
                    { name: 'Mês', total: resumoTecnico.mes },
                  ]).map((item) => {
                    const maximo = Math.max(1, resumoTecnico.mes, ...serieHoras.map((serie) => serie.total));
                    const largura = Math.min(100, Math.round((item.total / maximo) * 100));
                    return (
                      <div key={item.name} className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs font-black text-gray-500 uppercase tracking-widest truncate">{item.name}</span>
                          <span className="text-xs font-black text-emerald-600">{formatarHoras(item.total)}</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${largura}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-gray-50">
                <h3 className="text-xl font-black text-gray-900">Intervenções por Estado</h3>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                {(statusRelatorio.length ? statusRelatorio : [
                  { label: 'Atribuídas', total: totalIntervencoes },
                  { label: 'Em andamento', total: intervencoesAndamento },
                  { label: 'Concluídas', total: intervencoesConcluidas },
                ]).map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-[24px] p-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                    <p className="text-3xl font-black text-gray-900 mt-2">{item.total}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Parar e Guardar */}
      {modalParar.aberto && modalParar.cronometro && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 bg-gradient-to-r from-red-600 to-rose-500 text-white flex justify-between items-center">
                 <div>
                    <h3 className="text-2xl font-black">Parar e Guardar</h3>
                    <p className="text-red-50 opacity-80 text-xs font-bold uppercase tracking-widest mt-1">Finalização de Sessão de Trabalho</p>
                 </div>
                 <button onClick={() => setModalParar({aberto: false, cronometro: null})} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="p-10 space-y-8">
                 <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-[32px]">
                    <div className="text-center space-y-1">
                       <p className="text-[10px] font-black text-gray-400 uppercase">Tempo Real</p>
                       <p className="text-2xl font-black text-gray-900">{formatarTempo(modalParar.cronometro.tempoAtual || 0)}</p>
                    </div>
                    <div className="text-center space-y-1 border-l border-gray-200">
                       <p className="text-[10px] font-black text-emerald-600 uppercase">Sugestão (Arred.)</p>
                       <p className="text-2xl font-black text-emerald-600">{formatarHoras(arredondarHoras(modalParar.cronometro.tempoAtual || 0))}</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                       <FileText className="w-3 h-3" /> Descrição do Trabalho Realizado *
                    </label>
                    <textarea 
                      rows={4}
                      value={pararDados.descricao}
                      onChange={(e) => setPararDados({...pararDados, descricao: e.target.value})}
                      placeholder="O que você fez durante este tempo? (Mínimo 20 caracteres)"
                      className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] text-sm font-bold focus:bg-white focus:border-red-500 focus:ring-0 transition-all resize-none"
                    />
                    <div className="flex justify-between items-center">
                       <p className={`text-[10px] font-black uppercase ${pararDados.descricao.length < 20 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {pararDados.descricao.length} / 20 caracteres mínimos
                       </p>
                       <div className="flex items-center gap-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase">Ajuste Final (Horas):</label>
                          <input 
                            type="number" 
                            step="0.01"
                            min="0.01"
                            value={pararDados.horasAjustadas}
                            onChange={(e) => setPararDados({...pararDados, horasAjustadas: parseFloat(e.target.value)})}
                            className="w-20 px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-black text-center"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="pt-4 flex gap-4">
                    <button 
                      onClick={() => setModalParar({aberto: false, cronometro: null})}
                      className="flex-1 py-5 rounded-[20px] font-black text-sm uppercase text-gray-500 hover:bg-gray-100 transition-all"
                    >
                       Cancelar
                    </button>
                    <button 
                      onClick={handleConfirmarParar}
                      disabled={pararDados.descricao.length < 20 || status === 'loading'}
                      className="flex-[2] py-5 bg-emerald-600 text-white rounded-[20px] font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                       {status === 'loading' ? 'Guardando...' : 'Confirmar e Guardar'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any, label: string, value: string, sub: string, color: string }) {
  const colorMap: any = {
    emerald: 'bg-emerald-500 text-emerald-600',
    blue: 'bg-blue-500 text-blue-600',
    indigo: 'bg-indigo-500 text-indigo-600',
    amber: 'bg-amber-500 text-amber-600'
  };
  return (
    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-xl group hover:-translate-y-1 transition-all">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-opacity-10 ${colorMap[color].split(' ')[0]}`}>
        <Icon className={`w-7 h-7 ${colorMap[color].split(' ')[1]}`} />
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black text-gray-900 mt-2">{value}</p>
      <div className="flex items-center gap-1 mt-1">
         <div className={`w-1 h-1 rounded-full ${colorMap[color].split(' ')[0]}`}></div>
         <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">{sub}</p>
      </div>
    </div>
  );
}
