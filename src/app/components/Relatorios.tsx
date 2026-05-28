import { useEffect, useState } from 'react';
import { BarChart3, Clock, DollarSign, Download, FileText, Loader2, Users } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { relatoriosService } from '../services/api';
import { formatarHoras } from '../utils/formatters';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];
const RELATORIO_HORAS_VAZIO = {
  total_horas: 0,
  media_horas_intervencao: 0,
  por_tecnico: [],
  por_cliente: [],
  detalhes: [],
};

export function Relatorios() {
  const [tipoRelatorio, setTipoRelatorio] = useState<'dashboard' | 'intervencoes' | 'horas' | 'financeiro'>('dashboard');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [dados, setDados] = useState<any>({});

  const carregarRelatorioHoras = async () => {
    try {
      return await relatoriosService.horas();
    } catch (error) {
      console.warn('Relatorio de horas indisponivel na API:', error);
      setErro('O relatorio de horas ainda nao esta disponivel nesta versao da API. A tela foi mantida sem dados para evitar erro.');
      return RELATORIO_HORAS_VAZIO;
    }
  };

  const carregarDados = async () => {
    setCarregando(true);
    setErro('');

    try {
      const response = tipoRelatorio === 'dashboard'
        ? await relatoriosService.dashboardAdmin()
        : tipoRelatorio === 'intervencoes'
          ? await relatoriosService.intervencoes()
          : tipoRelatorio === 'horas'
            ? await carregarRelatorioHoras()
            : await relatoriosService.financeiro();

      setDados(response?.data || response || {});
    } catch (error: any) {
      console.error('Erro ao carregar relatório:', error);
      setErro(error?.message || 'Não foi possível carregar este relatório.');
      setDados({});
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [tipoRelatorio]);

  const statusData = (dados?.por_status || []).map((item: any) => ({
    name: item.status || 'Sem status',
    value: Number(item.total || 0),
  }));
  const prioridadeData = (dados?.por_prioridade || []).map((item: any) => ({
    name: item.prioridade || 'Sem prioridade',
    value: Number(item.total || 0),
  }));
  const horasTecnico = (dados?.por_tecnico || dados?.grafico_horas_tecnico || []).map((item: any) => ({
    name: item.tecnico__nome || 'Sem técnico',
    total: Number(item.total || 0),
  }));
  const horasCliente = (dados?.por_cliente || []).map((item: any) => ({
    name: item.intervencao__cliente__nome || item.cliente__nome || 'Sem cliente',
    total: Number(item.total || 0),
  }));
  const intervencoesMes = (dados?.grafico_intervencoes_mes || []).map((item: any) => ({
    name: item.mes ? new Date(item.mes).toLocaleDateString('pt-PT', { month: 'short' }) : 'Sem data',
    total: Number(item.total || 0),
  }));
  const financeiroContrato = (dados?.por_contrato || []).map((item: any) => ({
    name: item.tipo_contrato || 'Sem tipo',
    valor: Number(item.total || 0),
  }));
  const financeiroPorCliente = (dados?.por_cliente || []).map((item: any) => ({
    name: item.cliente__nome || 'Sem cliente',
    valor: Number(item.total || 0),
  }));

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Centro de Relatórios</h2>
          <p className="text-sm text-gray-500">Dados operacionais, horas e financeiro vindos da API.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={carregarDados} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm">
            <Download className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-100 overflow-x-auto pb-px">
        <TabButton active={tipoRelatorio === 'dashboard'} onClick={() => setTipoRelatorio('dashboard')} label="Geral" icon={BarChart3} />
        <TabButton active={tipoRelatorio === 'intervencoes'} onClick={() => setTipoRelatorio('intervencoes')} label="Intervenções" icon={FileText} />
        <TabButton active={tipoRelatorio === 'horas'} onClick={() => setTipoRelatorio('horas')} label="Horas" icon={Clock} />
        <TabButton active={tipoRelatorio === 'financeiro'} onClick={() => setTipoRelatorio('financeiro')} label="Financeiro" icon={DollarSign} />
      </div>

      {erro && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm font-bold text-red-700">{erro}</div>}

      {carregando ? (
        <div className="py-24 flex justify-center bg-white rounded-2xl border border-gray-100">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          {tipoRelatorio === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={Users} label="Clientes" value={dados?.total_clientes || 0} sub={`${dados?.total_empresas || 0} empresas`} color="indigo" />
                <StatCard icon={FileText} label="Contratos Ativos" value={dados?.total_contratos_ativos || 0} sub="Status activo" color="emerald" />
                <StatCard icon={BarChart3} label="Intervenções" value={dados?.total_intervencoes || 0} sub={`${dados?.intervencoes_abertas || 0} abertas`} color="amber" />
                <StatCard icon={DollarSign} label="Receita Total" value={`${Number(dados?.receita_total || 0).toLocaleString()} Kz`} sub={`${dados?.tecnicos_ativos || 0} técnicos ativos`} color="indigo" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Intervenções por mês">
                  <BarChart data={intervencoesMes.length ? intervencoesMes : [{ name: 'Sem dados', total: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartCard>
                <ChartCard title="Horas por técnico">
                  <BarChart data={horasTecnico.length ? horasTecnico : [{ name: 'Sem dados', total: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartCard>
              </div>
            </>
          )}

          {tipoRelatorio === 'intervencoes' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={FileText} label="Total" value={dados?.total_intervencoes || 0} sub="Intervenções filtradas" color="indigo" />
                <StatCard icon={Clock} label="Tempo Médio" value={dados?.tempo_medio_resolucao || '0 dias'} sub="Resolução" color="emerald" />
                <StatCard icon={BarChart3} label="Prioridades" value={prioridadeData.length} sub="Categorias usadas" color="amber" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Por status">
                  <PieChart>
                    <Pie data={statusData.length ? statusData : [{ name: 'Sem dados', value: 1 }]} dataKey="value" innerRadius={60} outerRadius={85} label>
                      {(statusData.length ? statusData : [{}]).map((_: any, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ChartCard>
                <ChartCard title="Por prioridade">
                  <PieChart>
                    <Pie data={prioridadeData.length ? prioridadeData : [{ name: 'Sem dados', value: 1 }]} dataKey="value" innerRadius={60} outerRadius={85} label>
                      {(prioridadeData.length ? prioridadeData : [{}]).map((_: any, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ChartCard>
              </div>
              <TabelaIntervencoes dados={dados?.intervencoes || []} />
            </>
          )}

          {tipoRelatorio === 'horas' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={Clock} label="Total de Horas" value={formatarHoras(dados?.total_horas)} sub="Registos lançados" color="indigo" />
                <StatCard icon={BarChart3} label="Média por Intervenção" value={formatarHoras(dados?.media_horas_intervencao)} sub="Tempo médio" color="emerald" />
                <StatCard icon={Users} label="Técnicos" value={horasTecnico.length} sub="Com horas registadas" color="amber" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Horas por técnico">
                  <BarChart data={horasTecnico.length ? horasTecnico : [{ name: 'Sem dados', total: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartCard>
                <ChartCard title="Horas por cliente">
                  <BarChart data={horasCliente.length ? horasCliente : [{ name: 'Sem dados', total: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartCard>
              </div>
            </>
          )}

          {tipoRelatorio === 'financeiro' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={DollarSign} label="Receita Total" value={`${Number(dados?.receita_total || 0).toLocaleString()} Kz`} sub="Todos contratos" color="indigo" />
                <StatCard icon={DollarSign} label="Receita do Mês" value={`${Number(dados?.receita_mes || 0).toLocaleString()} Kz`} sub="Mês atual" color="emerald" />
                <StatCard icon={FileText} label="Previsão" value={`${Number(dados?.previsao_receita || 0).toLocaleString()} Kz`} sub="Receita prevista" color="amber" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Receita por cliente">
                  <BarChart data={financeiroPorCliente.length ? financeiroPorCliente : [{ name: 'Sem dados', valor: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="valor" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartCard>
                <ChartCard title="Receita por tipo de contrato">
                  <BarChart data={financeiroContrato.length ? financeiroContrato : [{ name: 'Sem dados', valor: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartCard>
              </div>
              <TabelaContratos dados={dados?.contratos_vencendo || []} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label, icon: Icon }: { active: boolean; onClick: () => void; label: string; icon: any }) {
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

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub: string; color: string }) {
  const colorMap: any = {
    indigo: 'bg-indigo-600 text-indigo-600',
    emerald: 'bg-emerald-600 text-emerald-600',
    amber: 'bg-amber-600 text-amber-600',
  };
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className={`inline-flex p-3 rounded-xl bg-opacity-10 ${colorMap[color].split(' ')[0]}`}>
        <Icon className={`w-6 h-6 ${colorMap[color].split(' ')[1]}`} />
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-4">{label}</p>
      <p className="text-2xl font-black text-gray-900 mt-1">{value}</p>
      <p className="text-xs text-gray-400 mt-1 font-medium">{sub}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-6">{title}</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TabelaIntervencoes({ dados }: { dados: any[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-50">
        <h3 className="text-lg font-bold text-gray-900">Histórico de Intervenções</h3>
      </div>
      <table className="w-full text-left">
        <thead className="bg-gray-50/50">
          <tr className="text-xs font-bold text-gray-400 uppercase">
            <th className="px-6 py-4">Número</th>
            <th className="px-6 py-4">Título</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Prioridade</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {dados.length > 0 ? dados.map((item) => (
            <tr key={item.id} className="text-sm hover:bg-gray-50/50">
              <td className="px-6 py-4 font-bold">{item.numero}</td>
              <td className="px-6 py-4">{item.titulo}</td>
              <td className="px-6 py-4">{item.status}</td>
              <td className="px-6 py-4">{item.prioridade}</td>
            </tr>
          )) : (
            <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">Sem dados.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TabelaContratos({ dados }: { dados: any[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-50">
        <h3 className="text-lg font-bold text-gray-900">Contratos a vencer</h3>
      </div>
      <table className="w-full text-left">
        <thead className="bg-gray-50/50">
          <tr className="text-xs font-bold text-gray-400 uppercase">
            <th className="px-6 py-4">Cliente</th>
            <th className="px-6 py-4">Empresa</th>
            <th className="px-6 py-4">Data Fim</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {dados.length > 0 ? dados.map((item) => (
            <tr key={item.id} className="text-sm hover:bg-gray-50/50">
              <td className="px-6 py-4 font-bold">{item.cliente_nome || '-'}</td>
              <td className="px-6 py-4">{item.empresa_nome || '-'}</td>
              <td className="px-6 py-4">{item.data_fim ? new Date(item.data_fim).toLocaleDateString('pt-PT') : '-'}</td>
            </tr>
          )) : (
            <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-400">Sem contratos a vencer.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
