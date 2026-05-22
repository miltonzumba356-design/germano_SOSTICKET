import { useState, useEffect } from 'react';
import { Contrato, Cliente } from '../types/api';
import { contratosService, clientesService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  FileText, 
  Clock, 
  Filter,
  CheckCircle2,
  XCircle,
  ArrowRight,
  X,
  User,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';

function getEmpresaNome(empresa: Cliente['empresa']) {
  if (!empresa) return '';
  if (typeof empresa === 'string') return empresa;
  return String(empresa.nome || empresa.Email_empresa || 'Empresa');
}

export function Contratos() {
  const { usuario } = useAuth();
  const isAdmin = usuario?.perfil === 'admin';
  const isCliente = usuario?.perfil === 'cliente';
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [exibirModal, setExibirModal] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [exibirModalDetalhes, setExibirModalDetalhes] = useState(false);
  const [contratoDetalhe, setContratoDetalhe] = useState<Contrato | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Estado do formulário de novo contrato
  const [formData, setFormData] = useState({
    cliente_id: '',
    tipo: 'horas' as 'horas' | 'mensal' | 'anual',
    horas_contratadas: '0',
    horas_utilizadas: '0',
    valor_total: '0',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    status: 'activo' as any,
    observacoes: ''
  });

  const carregarContratos = async () => {
    setCarregando(true);
    setErro('');
    try {
      const response = await contratosService.listar({ 
        search: busca || undefined,
        status: (filtroStatus as any) || undefined,
        cliente_id: isCliente ? usuario?.id : undefined,
        page: pagina,
        limit: 10
      });
      const lista = Array.isArray(response) 
        ? response 
        : (response as any)?.results || (response as any)?.data || [];
      setContratos(Array.isArray(lista) ? lista : []);
      setTotalPaginas((response as any)?.pagination?.total_pages || (response as any)?.total_pages || 1);
    } catch (error: any) {
      console.error('Erro ao carregar contratos:', error);
      setErro('Não foi possível carregar os contratos.');
    } finally {
      setCarregando(false);
    }
  };

  const carregarClientes = async () => {
    try {
      const response = await clientesService.listar({ limit: 100 });
      const lista = Array.isArray(response) 
        ? response 
        : (response as any)?.results || (response as any)?.data || [];
      setClientes(Array.isArray(lista) ? lista : []);
    } catch (err) {
      console.error('Erro ao carregar clientes para o contrato:', err);
    }
  };

  useEffect(() => {
    carregarContratos();
    carregarClientes();
  }, [pagina, filtroStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarContratos();
    }, 500);
    return () => clearTimeout(timer);
  }, [busca]);

  const handleVerDetalhes = async (id: string) => {
    setCarregando(true);
    setErro('');
    try {
      const resp = await contratosService.obterPorId(id);
      setContratoDetalhe(resp);
      setExibirModalDetalhes(true);
    } catch (err) {
      console.error('Erro ao carregar detalhes do contrato:', err);
      setErro('Falha ao carregar detalhes do contrato.');
    } finally {
      setCarregando(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente_id) {
      setErro('Selecione um cliente.');
      return;
    }

    setCarregando(true);
    setStatus('loading');
    setErro('');

    try {
      await contratosService.criar({
        cliente_id: formData.cliente_id,
        tipo_contrato: 'suporte', // Valor padrão ou vindo do form
        tipo_de_pagamento: formData.tipo as any,
        horas_contratadas: String(formData.horas_contratadas),
        horas_utilizadas: String(formData.horas_utilizadas),
        valor_total: String(formData.valor_total),
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim,
        status: formData.status as any,
        observacoes: formData.observacoes
      });
      
      setStatus('success');
      setTimeout(() => {
        setExibirModal(false);
        setFormData({
          cliente_id: '',
          tipo: 'horas',
          horas_contratadas: '0',
          horas_utilizadas: '0',
          valor_total: '0',
          data_inicio: new Date().toISOString().split('T')[0],
          data_fim: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          status: 'activo',
          observacoes: ''
        });
        setStatus('idle');
        carregarContratos();
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao criar contrato:', err);
      setErro(err.message || 'Falha ao criar novo contrato.');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Contratos</h2>
          <p className="text-sm text-gray-500">Controle de pacotes de horas e mensalidades.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setExibirModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-all shadow-md shadow-indigo-100"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Contrato</span>
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por número ou cliente..." 
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-theme-primary transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="flex-1 md:flex-none bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-theme-primary text-gray-600"
          >
            <option value="">Todos Status</option>
            <option value="activo">Ativos</option>
            <option value="expirado">Expirados</option>
            <option value="cancelado">Cancelados</option>
          </select>
          <button className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-theme-primary hover:bg-theme-primary-light transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Lista de Contratos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {carregando ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse"></div>
          ))
        ) : contratos.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum contrato encontrado.</p>
          </div>
        ) : contratos.map((contrato) => {
          const percHoras = contrato.horas_contratadas ? Math.min(100, Math.round((Number(contrato.horas_utilizadas) / Number(contrato.horas_contratadas)) * 100)) : 0;
          const statusCor = contrato.status === 'activo' ? 'emerald' : contrato.status === 'expirado' ? 'red' : 'gray';
          
          return (
            <div key={contrato.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-${statusCor}-100 text-${statusCor}-600`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">#{contrato.numero || contrato.id.substring(0, 6).toUpperCase()}</h3>
                      <p className="text-sm font-bold text-gray-500">{contrato.cliente_nome}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full bg-${statusCor}-50 text-${statusCor}-600 border border-${statusCor}-100`}>
                    {contrato.status?.toUpperCase() || 'ACTIVO'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</p>
                    <p className="text-sm font-bold text-gray-900 capitalize">{contrato.tipo_contrato}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Valor Total</p>
                    <p className="text-sm font-bold text-gray-900">{contrato.valor_total} Kz</p>
                  </div>
                  <div className="space-y-1 hidden sm:block">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Validade</p>
                    <p className="text-sm font-bold text-gray-900">{new Date(contrato.data_fim).toLocaleDateString('pt-PT')}</p>
                  </div>
                </div>

                {contrato.tipo_de_pagamento === 'horas' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Uso de Horas: <span className="font-bold text-gray-900">{contrato.horas_utilizadas}h</span> / {contrato.horas_contratadas}h</span>
                      </div>
                      <span className={`font-bold ${percHoras > 90 ? 'text-red-600' : percHoras > 70 ? 'text-amber-600' : 'text-emerald-600'}`}>{percHoras}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          percHoras > 90 ? 'bg-red-500' : percHoras > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percHoras}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleVerDetalhes(contrato.id)}
                    className="text-sm font-bold text-theme-primary hover:text-theme-primary-hover flex items-center gap-1"
                  >
                    Ver Detalhes <ArrowRight className="w-4 h-4" />
                  </button>
                  <button className="text-sm font-bold text-gray-500 hover:text-amber-600">Editar</button>
                </div>
                <div className="flex items-center gap-2">
                   <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancelar Contrato">
                    <XCircle className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Renovar">
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Adicionar Contrato */}
      {exibirModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Novo Contrato</h3>
              <button onClick={() => setExibirModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Cliente *</label>
                  <select 
                    name="cliente_id"
                    required
                    value={formData.cliente_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">Selecione um cliente...</option>
                    {clientes.map(c => {
                      const empresaNome = getEmpresaNome(c.empresa);
                      return <option key={c.id} value={c.id}>{c.nome}{empresaNome ? ` (${empresaNome})` : ''}</option>;
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Tipo de Contrato *</label>
                  <select 
                    name="tipo"
                    required
                    value={formData.tipo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary bg-white"
                  >
                    <option value="horas">Horas</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">Horas Contratadas *</label>
                    <input 
                      type="text" 
                      name="horas_contratadas"
                      required
                      value={formData.horas_contratadas}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">Horas Utilizadas</label>
                    <input 
                      type="text" 
                      name="horas_utilizadas"
                      value={formData.horas_utilizadas}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Valor Total (Kz) *</label>
                  <input 
                    type="text" 
                    name="valor_total"
                    required
                    value={formData.valor_total}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">Data Início *</label>
                    <input 
                      type="date" 
                      name="data_inicio"
                      required
                      value={formData.data_inicio}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">Data Fim *</label>
                    <input 
                      type="date" 
                      name="data_fim"
                      required
                      value={formData.data_fim}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Observações</label>
                  <textarea 
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  ></textarea>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50 rounded-b-2xl">
                <button type="button" onClick={() => setExibirModal(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancelar</button>
                <button 
                  type="submit"
                  disabled={carregando || status === 'success'}
                  className={`flex items-center justify-center gap-2 px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg ${
                    status === 'success' 
                      ? 'bg-emerald-500 text-white shadow-emerald-100' 
                      : status === 'error'
                      ? 'bg-red-500 text-white shadow-red-100'
                      : 'bg-theme-primary text-white shadow-indigo-100 hover:bg-theme-primary-hover'
                  } disabled:opacity-50`}
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : status === 'success' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Contrato Ativo!</span>
                    </>
                  ) : status === 'error' ? (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      <span>Erro ao Salvar</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Salvar Contrato</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="mt-8 flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">
            Página {pagina} de {totalPaginas}
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1 || carregando}
              className="p-2.5 border border-gray-200 rounded-xl text-gray-400 hover:text-theme-primary hover:border-theme-primary disabled:opacity-30 transition-all bg-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas || carregando}
              className="p-2.5 border border-gray-200 rounded-xl text-gray-400 hover:text-theme-primary hover:border-theme-primary disabled:opacity-30 transition-all bg-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Detalhes do Contrato */}
      {exibirModalDetalhes && contratoDetalhe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-theme-primary text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black">Detalhes do Contrato</h3>
                  <p className="text-xs font-bold text-white/80 uppercase tracking-widest">
                    #{contratoDetalhe.id?.substring(0, 8) || 'CONTRATO'}
                  </p>
                </div>
              </div>
              <button onClick={() => setExibirModalDetalhes(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto">
              {/* Cliente e Status */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <User className="w-6 h-6 text-theme-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</p>
                    <h4 className="text-lg font-bold text-gray-900">{contratoDetalhe.cliente_nome}</h4>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Atual</p>
                  <span className={`px-4 py-1.5 text-xs font-black rounded-full uppercase tracking-tighter ${
                    contratoDetalhe.status === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {contratoDetalhe.status}
                  </span>
                </div>
              </div>

              {/* Grid de Informações Principais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</p>
                  <p className="text-sm font-bold text-gray-900 capitalize">{contratoDetalhe.tipo_contrato}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pagamento</p>
                  <p className="text-sm font-bold text-gray-900 capitalize">{contratoDetalhe.tipo_de_pagamento}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Início</p>
                    <p className="text-sm font-bold text-gray-900">
                      {contratoDetalhe.data_inicio ? new Date(contratoDetalhe.data_inicio).toLocaleDateString('pt-PT') : '-'}
                    </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fim</p>
                    <p className="text-sm font-bold text-gray-900">
                      {contratoDetalhe.data_fim ? new Date(contratoDetalhe.data_fim).toLocaleDateString('pt-PT') : '-'}
                    </p>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Estatísticas de Horas e Valores */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Horas Contratadas</p>
                  </div>
                  <p className="text-xl font-black text-indigo-700">{contratoDetalhe.horas_contratadas}h</p>
                </div>
                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Horas Utilizadas</p>
                  </div>
                  <p className="text-xl font-black text-amber-700">{contratoDetalhe.horas_utilizadas}h</p>
                </div>
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Horas Disponíveis</p>
                  </div>
                  <p className="text-xl font-black text-emerald-700">{contratoDetalhe.horas_disponiveis}h</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Valor Total do Contrato</p>
                  <p className="text-2xl font-black text-gray-900">{Number(contratoDetalhe.valor_total).toLocaleString()} Kz</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Valor p/ Hora</p>
                  <p className="text-2xl font-black text-gray-900">{Number(contratoDetalhe.valor_hora).toLocaleString()} Kz</p>
                </div>
              </div>

              {contratoDetalhe.observacoes && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Observações Internas</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-2xl italic">"{contratoDetalhe.observacoes}"</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-100 flex justify-end bg-gray-50/50">
              <button 
                onClick={() => setExibirModalDetalhes(false)}
                className="px-8 py-3 bg-theme-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-100 hover:bg-theme-primary-hover transition-all"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
