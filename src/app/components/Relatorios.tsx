import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  Clock, 
  DollarSign, 
  PieChart as PieChartIcon, 
  Filter,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';
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

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

import { relatoriosService } from '../services/api';

export function Relatorios() {
  const [tipoRelatorio, setTipoRelatorio] = useState<'dashboard' | 'intervencoes' | 'horas' | 'financeiro'>('dashboard');
  const [periodo, setPeriodo] = useState('mensal');
  const [carregando, setCarregando] = useState(false);
  const [dadosHoras, setDadosHoras] = useState<any>(null);
  const [dadosIntervencoes, setDadosIntervencoes] = useState<any>(null);

  const carregarDadosHoras = async () => {
    setCarregando(true);
    try {
      const response = await relatoriosService.horas();
      setDadosHoras(response?.data || response || []);
    } catch (err) {
      console.error('Erro ao carregar relatório de horas:', err);
    } finally {
      setCarregando(false);
    }
  };

  const carregarDadosIntervencoes = async () => {
    setCarregando(true);
    try {
      const response = await relatoriosService.intervencoes();
      setDadosIntervencoes(response?.data || response || []);
    } catch (err) {
      console.error('Erro ao carregar relatório de intervenções:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (tipoRelatorio === 'horas') {
      carregarDadosHoras();
    } else if (tipoRelatorio === 'intervencoes') {
      carregarDadosIntervencoes();
    }
  }, [tipoRelatorio, periodo]);

  // Dados Mock para os Relatórios
  const dadosStatus = [
    { name: 'Resolvido', value: 45 },
    { name: 'Em Andamento', value: 25 },
    { name: 'Aberto', value: 15 },
    { name: 'Pendente', value: 15 },
  ];

  const dadosReceita = [
    { month: 'Jan', valor: 450000 },
    { month: 'Fev', valor: 520000 },
    { month: 'Mar', valor: 480000 },
    { month: 'Abr', valor: 610000 },
    { month: 'Mai', valor: 590000 },
    { month: 'Jun', valor: 720000 },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Centro de Relatórios</h2>
          <p className="text-sm text-gray-500">Análise detalhada de performance, financeira e operacional.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm">
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 font-medium text-sm">
            <Download className="w-4 h-4" />
            Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Navegação de Relatórios */}
      <div className="flex items-center gap-2 border-b border-gray-100 overflow-x-auto pb-px">
        <TabButton active={tipoRelatorio === 'dashboard'} onClick={() => setTipoRelatorio('dashboard')} label="Geral" icon={BarChart3} />
        <TabButton active={tipoRelatorio === 'intervencoes'} onClick={() => setTipoRelatorio('intervencoes')} label="Intervenções" icon={FileText} />
        <TabButton active={tipoRelatorio === 'horas'} onClick={() => setTipoRelatorio('horas')} label="Horas" icon={Clock} />
        <TabButton active={tipoRelatorio === 'financeiro'} onClick={() => setTipoRelatorio('financeiro')} label="Financeiro" icon={DollarSign} />
      </div>

      {/* Filtros Globais */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
          <Calendar className="w-4 h-4 text-gray-400" />
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="bg-transparent text-xs font-bold text-gray-600 outline-none">
            <option value="hoje">HOJE</option>
            <option value="semanal">ESTA SEMANA</option>
            <option value="mensal">ESTE MÊS</option>
            <option value="trimestral">ÚLTIMOS 3 MESES</option>
            <option value="anual">ESTE ANO</option>
          </select>
        </div>
        <select className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 text-xs font-bold text-gray-600 outline-none">
          <option>TODOS CLIENTES</option>
        </select>
        <select className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 text-xs font-bold text-gray-600 outline-none">
          <option>TODOS TÉCNICOS</option>
        </select>
        <div className="ml-auto">
          <button className="flex items-center gap-2 text-indigo-600 text-xs font-bold hover:underline">
            <Filter className="w-3 h-3" /> LIMPAR FILTROS
          </button>
        </div>
      </div>

      {/* Conteúdo Dinâmico */}
      <div className="space-y-8 animate-in fade-in duration-500">
        
        {tipoRelatorio === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard icon={FileText} label="Total Intervenções" value="142" sub="85% resolvidas" color="indigo" />
            <StatCard icon={Clock} label="Total de Horas" value="1,240h" sub="Média 8.4h/dia" color="emerald" />
            <StatCard icon={DollarSign} label="Faturação Estimada" value="2.4M Kz" sub="+15% vs previsto" color="amber" />
            
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Volume de Trabalho x Receita</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dadosReceita}>
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip />
                    <Area type="monotone" dataKey="valor" stroke="#4f46e5" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Status dos Tickets</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {dadosStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" align="center" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {tipoRelatorio === 'intervencoes' && (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard icon={FileText} label="Total Intervenções" value={String(dadosIntervencoes?.total_intervencoes || 0)} sub="No período selecionado" color="indigo" />
                <StatCard icon={Clock} label="Tempo Médio" value={`${dadosIntervencoes?.tempo_medio_resolucao || 0}h`} sub="Tempo de resolução" color="emerald" />
                <StatCard icon={Filter} label="Abertas" value={String(dadosIntervencoes?.por_status?.find((s: any) => s.name === 'aberto')?.total || 0)} sub="Aguardando início" color="amber" />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                   <h3 className="text-lg font-bold text-gray-900 mb-6">Distribuição por Status</h3>
                   <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dadosIntervencoes?.por_status?.length > 0 ? dadosIntervencoes.por_status : [{name: 'Sem dados', total: 0}]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                   <h3 className="text-lg font-bold text-gray-900 mb-6">Distribuição por Prioridade</h3>
                   <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={dadosIntervencoes?.por_prioridade?.length > 0 ? dadosIntervencoes.por_prioridade : [{name: 'Sem dados', total: 1}]} 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={60}
                            outerRadius={80} 
                            dataKey="total" 
                            label
                          >
                            {(dadosIntervencoes?.por_prioridade || [{}]).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>

             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                   <h3 className="text-lg font-bold text-gray-900">Histórico de Intervenções</h3>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50">
                    <tr className="text-xs font-bold text-gray-400 uppercase">
                      <th className="px-6 py-4">Nº</th>
                      <th className="px-6 py-4">Título</th>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Técnico</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dadosIntervencoes?.intervencoes?.length > 0 ? dadosIntervencoes.intervencoes.map((it: any) => (
                      <tr key={it.id} className="text-sm hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-bold">{it.numero}</td>
                        <td className="px-6 py-4">{it.titulo}</td>
                        <td className="px-6 py-4">{it.cliente_nome}</td>
                        <td className="px-6 py-4">{it.tecnico_nome || 'Não atribuído'}</td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              it.status === 'concluido' ? 'bg-emerald-100 text-emerald-700' :
                              it.status === 'em_andamento' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                           }`}>
                              {it.status.toUpperCase()}
                           </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Nenhuma intervenção encontrada para este período.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {tipoRelatorio === 'horas' && (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={Clock} label="Total de Horas" value={`${dadosHoras?.total_horas || 0}h`} sub="No período selecionado" color="indigo" />
                <StatCard icon={BarChart3} label="Média por Ticket" value={`${dadosHoras?.media_horas_intervencao || 0}h`} sub="Tempo médio de trabalho" color="emerald" />
                <StatCard icon={Users} label="Técnicos Ativos" value={String(dadosHoras?.por_tecnico?.length || 0)} sub="Trabalhando no período" color="amber" />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                   <h3 className="text-lg font-bold text-gray-900 mb-6">Horas por Técnico</h3>
                   <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dadosHoras?.por_tecnico?.length > 0 ? dadosHoras.por_tecnico : [{name: 'Sem dados', horas: 0}]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="horas" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                   <h3 className="text-lg font-bold text-gray-900 mb-6">Horas por Cliente</h3>
                   <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dadosHoras?.por_cliente?.length > 0 ? dadosHoras.por_cliente : [{name: 'Sem dados', horas: 0}]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="horas" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>

             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                   <h3 className="text-lg font-bold text-gray-900">Detalhamento de Lançamentos</h3>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50">
                    <tr className="text-xs font-bold text-gray-400 uppercase">
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Técnico</th>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Ticket</th>
                      <th className="px-6 py-4">Horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dadosHoras?.detalhes?.length > 0 ? dadosHoras.detalhes.map((d: any, i: number) => (
                      <tr key={i} className="text-sm hover:bg-gray-50/50">
                        <td className="px-6 py-4 text-gray-500">{new Date(d.data).toLocaleDateString('pt-PT')}</td>
                        <td className="px-6 py-4 font-bold">{d.tecnico}</td>
                        <td className="px-6 py-4">{d.cliente}</td>
                        <td className="px-6 py-4 text-gray-500">{d.ticket}</td>
                        <td className="px-6 py-4 font-bold text-indigo-600">{d.horas}h</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Nenhum lançamento de horas encontrado para este período.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {tipoRelatorio === 'financeiro' && (
           <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="w-10 h-10 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Relatório em processamento</h3>
              <p className="text-gray-500 max-w-sm mx-auto">Estamos consolidando os dados de faturamento do período selecionado. Tente novamente em instantes ou exporte para PDF.</p>
           </div>
        )}

      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, icon: Icon }: { active: boolean, onClick: () => void, label: string, icon: any }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${
        active ? 'text-indigo-600 border-indigo-600 bg-indigo-50/30' : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50/50'
      }`}
    >
      <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
      {label}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any, label: string, value: string, sub: string, color: string }) {
  const colorMap: any = {
    indigo: 'bg-indigo-600 text-indigo-600',
    emerald: 'bg-emerald-600 text-emerald-600',
    amber: 'bg-amber-600 text-amber-600'
  };
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm group hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-opacity-10 ${colorMap[color].split(' ')[0]}`}>
          <Icon className={`w-6 h-6 ${colorMap[color].split(' ')[1]}`} />
        </div>
        <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition-colors" />
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-gray-900 mt-1">{value}</p>
      <p className="text-xs text-gray-400 mt-1 font-medium">{sub}</p>
    </div>
  );
}
