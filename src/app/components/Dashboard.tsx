import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Ticket,
  Users,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  TrendingUp,
  DollarSign,
  Calendar,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { intervencoesService, relatoriosService, contratosService } from '../services/api';
import { Intervencao, Contrato } from '../types/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

// Componente de card estatístico
function StatCard({
  titulo,
  valor,
  icon: Icon,
  cor,
  subtitulo,
  tendencia,
  carregando
}: {
  titulo: string;
  valor: string | number;
  icon: any;
  cor: string;
  subtitulo?: string;
  tendencia?: { valor: string, tipo: 'up' | 'down' };
  carregando?: boolean;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${cor} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${cor.replace('bg-', 'text-')}`} />
        </div>
        {tendencia && (
          <div className={`flex items-center gap-1 text-xs font-medium ${tendencia.tipo === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
            {tendencia.tipo === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {tendencia.valor}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{titulo}</p>
        {carregando ? (
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        ) : (
          <p className="text-2xl font-bold text-gray-900">{valor}</p>
        )}
        {subtitulo && <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>}
      </div>
    </div>
  );
}

// Dados mock para os gráficos
const dadosMockStatus = [
  { name: 'Abertas', total: 12, fill: '#3b82f6' },
  { name: 'Andamento', total: 8, fill: '#f59e0b' },
  { name: 'Resolvidas', total: 15, fill: '#10b981' },
  { name: 'Fechadas', total: 5, fill: '#6b7280' },
  { name: 'Concluídas', total: 20, fill: '#8b5cf6' },
];

const dadosMockHorasTecnico = [
  { name: 'João Silva', value: 45 },
  { name: 'Maria Santos', value: 38 },
  { name: 'Pedro Costa', value: 32 },
  { name: 'Ana Oliveira', value: 28 },
];

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const dadosMockReceita = [
  { month: 'Jan', receita: 450000 },
  { month: 'Fev', receita: 520000 },
  { month: 'Mar', receita: 480000 },
  { month: 'Abr', receita: 610000 },
  { month: 'Mai', receita: 590000 },
];

const dadosMockEvolucao = [
  { date: '01/05', total: 10 },
  { date: '05/05', total: 15 },
  { date: '10/05', total: 12 },
  { date: '15/05', total: 20 },
  { date: '20/05', total: 18 },
  { date: '25/05', total: 25 },
];

export function Dashboard() {
  const { usuario } = useAuth();
  const isAdmin = usuario?.perfil === 'admin';
  const isTecnico = usuario?.perfil === 'tecnico';
  const isCliente = usuario?.perfil === 'cliente';
  const [intervencoes, setIntervencoes] = useState<Intervencao[]>([]);
  const [contratosExpira, setContratosExpira] = useState<Contrato[]>([]);
  const [dadosDashboard, setDadosDashboard] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregarDados = async () => {
    setCarregando(true);
    setErro('');

    try {
      // Carregar dados em paralelo, mas tratar erros individualmente
      const [respIntervencoes, respDashboard, respContratos] = await Promise.all([
        intervencoesService.listar({
          limit: 5,
          ...(isTecnico ? { tecnico: usuario?.id } : {}),
          ...(isCliente ? { cliente: usuario?.id } : {})
        }).catch(err => {
          console.error('Erro ao carregar intervenções:', err);
          return [];
        }),
        (isAdmin
          ? relatoriosService.dashboardAdmin()
          : isTecnico
            ? relatoriosService.dashboardTecnico()
            : isCliente
              ? relatoriosService.dashboardCliente()
              : Promise.resolve(null)).catch(err => {
          console.error('Erro ao carregar dados do dashboard:', err);
          return null;
        }),
        (isAdmin || isCliente
          ? contratosService.listar({
            limit: 5,
            status: 'ativo',
            ...(isCliente ? { cliente: usuario?.id } : {})
          })
          : Promise.resolve(null)).catch(err => {
          console.error('Erro ao carregar contratos:', err);
          return null;
        })
      ]);

      // Extração simplificada de dados
      const intervencoesData = Array.isArray(respIntervencoes) ? respIntervencoes : (respIntervencoes as any)?.results || (respIntervencoes as any)?.data || [];
      setIntervencoes(intervencoesData);
      
      const dashData = respDashboard?.data || respDashboard || {};
      setDadosDashboard(dashData);

      if (respContratos) {
        const contractsData = Array.isArray(respContratos) ? respContratos : (respContratos as any)?.results || (respContratos as any)?.data || [];
        const expira = contractsData.filter((c: any) => {
          if (!c.data_fim) return false;
          const dataFim = new Date(c.data_fim);
          const hoje = new Date();
          const diasParaExpirar = Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          return diasParaExpirar <= 30 && diasParaExpirar > 0;
        });
        setContratosExpira(expira);
      }
    } catch (err: any) {
      console.error('Erro detalhado ao carregar dashboard:', err);
      setErro(err.message || 'Erro ao carregar dados do dashboard. Por favor, verifique sua conexão ou tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [usuario?.perfil]);

  const tituloDashboard = isAdmin ? 'Dashboard Administrativo' : isTecnico ? 'Dashboard do Técnico' : 'Painel do Cliente';
  const subtituloDashboard = isAdmin 
    ? 'Visão geral do sistema e métricas de desempenho.' 
    : isTecnico 
      ? 'Acompanhe as suas intervenções e produtividade.' 
      : 'Estado dos seus contratos e pedidos de suporte.';

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {tituloDashboard}
          </h2>
          <p className="text-gray-500 mt-1">{subtituloDashboard}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-gray-600 shadow-sm">
            <Calendar className="w-4 h-4" />
            <span>Maio, 2024</span>
          </div>
          <button
            onClick={carregarDados}
            className="p-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors shadow-md shadow-indigo-100"
          >
            <TrendingUp className="w-5 h-5" />
          </button>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{erro}</span>
        </div>
      )}

      {/* 1. Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin ? (
          <>
            <StatCard
              titulo="Total de Clientes"
              valor={dadosDashboard?.total_clientes ?? dadosDashboard?.clientes_total ?? dadosDashboard?.clientes ?? 0}
              icon={Users}
              cor="bg-blue-600"
              tendencia={{ valor: '0%', tipo: 'up' }}
              carregando={carregando}
            />
            <StatCard
              titulo="Contratos Ativos"
              valor={dadosDashboard?.total_contratos_ativos ?? dadosDashboard?.contratos_ativos ?? dadosDashboard?.contratos ?? 0}
              icon={FileText}
              cor="bg-emerald-600"
              tendencia={{ valor: '0%', tipo: 'up' }}
              carregando={carregando}
            />
            <StatCard
              titulo="Intervenções Abertas"
              valor={dadosDashboard?.intervencoes_abertas ?? dadosDashboard?.tickets_abertos ?? dadosDashboard?.total_intervencoes ?? 0}
              icon={Ticket}
              cor="bg-amber-600"
              tendencia={{ valor: '0', tipo: 'up' }}
              carregando={carregando}
            />
            <StatCard
              titulo="Receita Total"
              valor={dadosDashboard?.receita_total !== undefined ? `${dadosDashboard.receita_total.toLocaleString()} Kz` : dadosDashboard?.total_receita !== undefined ? `${dadosDashboard.total_receita.toLocaleString()} Kz` : "0 Kz"}
              icon={DollarSign}
              cor="bg-indigo-600"
              tendencia={{ valor: '0%', tipo: 'up' }}
              carregando={carregando}
            />
          </>
        ) : isCliente ? (
          <>
            <StatCard
              titulo="Contratos Ativos"
              valor={dadosDashboard?.contratos_ativos ?? 0}
              icon={FileText}
              cor="bg-violet-600"
              carregando={carregando}
            />
            <StatCard
              titulo="Horas Disponíveis"
              valor={dadosDashboard?.total_horas_disponiveis !== undefined ? `${dadosDashboard.total_horas_disponiveis}h` : "0h"}
              icon={Clock}
              cor="bg-indigo-600"
              carregando={carregando}
            />
            <StatCard
              titulo="Tickets Abertos"
              valor={dadosDashboard?.intervencoes_abertas ?? 0}
              icon={Ticket}
              cor="bg-amber-600"
              carregando={carregando}
            />
            <StatCard
              titulo="Concluídas (Mês)"
              valor={dadosDashboard?.intervencoes_concluidas_mes ?? 0}
              icon={TrendingUp}
              cor="bg-emerald-600"
              carregando={carregando}
            />
          </>
        ) : (
          <>
            <StatCard
              titulo="Meus Tickets"
              valor={dadosDashboard?.total_atribuido ?? 0}
              icon={Ticket}
              cor="bg-blue-600"
              carregando={carregando}
            />
            <StatCard
              titulo="Em Andamento"
              valor={dadosDashboard?.em_andamento ?? 0}
              icon={Clock}
              cor="bg-amber-600"
              carregando={carregando}
            />
            <StatCard
              titulo="Concluído (Mês)"
              valor={dadosDashboard?.concluido_mes ?? 0}
              icon={CheckCircle}
              cor="bg-emerald-600"
              carregando={carregando}
            />
            <StatCard
              titulo="Horas Trabalhadas"
              valor={`${dadosDashboard?.horas_mes ?? 0}h`}
              icon={TrendingUp}
              cor="bg-theme-primary"
              carregando={carregando}
            />
          </>
        )}
      </div>

      {/* 2. Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Intervenções por Status */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-gray-900">Intervenções por Status</h3>
            <button className="text-gray-400 hover:text-gray-600"><MoreVertical className="w-5 h-5" /></button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosDashboard?.grafico_intervencoes_mes?.length > 0 ? dadosDashboard.grafico_intervencoes_mes : dadosMockStatus}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-gray-900">Horas por Técnico</h3>
              <button className="text-gray-400 hover:text-gray-600"><MoreVertical className="w-5 h-5" /></button>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosDashboard?.grafico_horas_tecnico?.length > 0 ? dadosDashboard.grafico_horas_tecnico : dadosMockHorasTecnico}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {(dadosDashboard?.grafico_horas_tecnico?.length > 0 ? dadosDashboard.grafico_horas_tecnico : dadosMockHorasTecnico).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-gray-900">Receita Mensal</h3>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+12.5%</span>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosDashboard?.receita_historico || dadosMockReceita}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="receita"
                    stroke="#4f46e5"
                    strokeWidth={4}
                    dot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Gráfico de Evolução de Intervenções */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-gray-900">Evolução de Intervenções</h3>
            <button className="text-gray-400 hover:text-gray-600"><MoreVertical className="w-5 h-5" /></button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dadosMockEvolucao}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Tabelas Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Últimas Intervenções */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
            <h3 className="text-lg font-bold text-gray-900">{isAdmin ? 'Últimas Intervenções' : 'Meus Tickets Recentes'}</h3>
            <button className="text-theme-primary text-sm font-semibold hover:opacity-80">Ver todas</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Ticket</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {carregando ? (
                  <tr><td colSpan={4} className="text-center py-8"><Loader2 className="animate-spin inline-block text-gray-300" /></td></tr>
                ) : intervencoes.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{ticket.titulo}</span>
                        <span className="text-xs text-gray-400">{ticket.numero}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{ticket.cliente_nome}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${ticket.status === 'concluido' ? 'bg-emerald-100 text-emerald-700' :
                          ticket.status === 'em_andamento' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><MoreVertical className="w-4 h-4 text-gray-400" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <h3 className="text-lg font-bold text-gray-900">Contratos a Expirar</h3>
              <button className="text-theme-primary text-sm font-semibold hover:opacity-80">Ver todos</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Contrato</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Data Fim</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {contratosExpira.length > 0 ? contratosExpira.map(contrato => (
                    <tr key={contrato.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">#{contrato.id.substring(0, 8)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{contrato.cliente_nome}</td>
                      <td className="px-6 py-4 text-sm font-bold text-red-600">{new Date(contrato.data_fim).toLocaleDateString('pt-PT')}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700">CRÍTICO</span>
                      </td>
                    </tr>
                  )) : (
                    <>
                      <tr className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">#CONT-2024-08</td>
                        <td className="px-6 py-4 text-sm text-gray-600">Empresa Alpha</td>
                        <td className="px-6 py-4 text-sm font-bold text-red-600">12/05/2024</td>
                        <td className="px-6 py-4"><span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700">5 DIAS</span></td>
                      </tr>
                      <tr className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">#CONT-2024-12</td>
                        <td className="px-6 py-4 text-sm text-gray-600">Tech Services</td>
                        <td className="px-6 py-4 text-sm font-bold text-orange-600">25/05/2024</td>
                        <td className="px-6 py-4"><span className="px-2.5 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-700">18 DIAS</span></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4. Alertas e Notificações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-50 border border-red-100 p-5 rounded-2xl flex items-start gap-4 hover:shadow-lg hover:shadow-red-50 transition-all duration-300">
          <div className="p-3 bg-red-100 rounded-xl shadow-sm"><AlertCircle className="w-6 h-6 text-red-600" /></div>
          <div>
            <p className="text-sm font-bold text-red-900">Contratos expirando</p>
            <p className="text-xs text-red-700 mt-1">Existem 2 contratos que vencem nos próximos 30 dias. Ação necessária.</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex items-start gap-4 hover:shadow-lg hover:shadow-amber-50 transition-all duration-300">
          <div className="p-3 bg-amber-100 rounded-xl shadow-sm"><Users className="w-6 h-6 text-amber-600" /></div>
          <div>
            <p className="text-sm font-bold text-amber-900">Sem Técnico</p>
            <p className="text-xs text-amber-700 mt-1">3 intervenções abertas aguardam atribuição de técnico.</p>
          </div>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl flex items-start gap-4 hover:shadow-lg hover:shadow-indigo-50 transition-all duration-300">
          <div className="p-3 bg-indigo-100 rounded-xl shadow-sm"><TrendingUp className="w-6 h-6 text-indigo-600" /></div>
          <div>
            <p className="text-sm font-bold text-indigo-900">Consumo de Horas</p>
            <p className="text-xs text-indigo-700 mt-1">Cliente Safir atingiu 85% do pacote de horas mensal.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
