import { useState, useEffect } from 'react';
import { Intervencao } from '../types/api';
import { intervencoesService, contratosService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Search, 
  Plus, 
  User, 
  Clock, 
  AlertCircle, 
  Loader2, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Camera,
  Upload,
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react';

export function Intervencoes() {
  const { usuario } = useAuth();
  const isAdmin = usuario?.perfil === 'admin';
  const isTecnico = usuario?.perfil === 'tecnico';
  const isCliente = usuario?.perfil === 'cliente';
  const [intervencoes, setIntervencoes] = useState<Intervencao[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('');
  const [exibirModalNovo, setExibirModalNovo] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [contratos, setContratos] = useState<any[]>([]);
  const [novoTicket, setNovoTicket] = useState({
    titulo: '',
    descricao: '',
    contrato_id: '',
    prioridade: 'media' as any,
    anexos: [] as string[]
  });
  const [exibirModalDetalhes, setExibirModalDetalhes] = useState(false);
  const [intervencaoDetalhe, setIntervencaoDetalhe] = useState<Intervencao | null>(null);
  const [novoComentario, setNovoComentario] = useState('');
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  const carregarIntervencoes = async () => {
    setCarregando(true);
    setErro('');
    try {
      const isTecnicoPerfil = usuario?.perfil === 'tecnico';
      const response = await intervencoesService.listar({ 
        page: pagina,
        limit: 10,
        search: busca || undefined,
        status: filtroStatus || undefined,
        prioridade: filtroPrioridade || undefined,
        tecnico: isTecnicoPerfil ? usuario?.id : undefined,
        cliente: isCliente ? usuario?.id : undefined
      });
      
      const results = Array.isArray(response) ? response : (response as any)?.data || (response as any)?.results || [];
      setIntervencoes(results);
      
      if ((response as any)?.pagination) {
        setTotalPaginas((response as any).pagination.total_pages || 1);
      } else if ((response as any)?.count) {
        setTotalPaginas(Math.ceil((response as any).count / 10));
      }
    } catch (err: any) {
      console.error('Erro ao carregar intervenções:', err);
      setErro('Não foi possível carregar as intervenções.');
    } finally {
      setCarregando(false);
    }
  };

  const carregarContratos = async () => {
    if (!isCliente && !isAdmin) return;
    try {
      const resp = await contratosService.listar({ status: 'activo', limit: 50 });
      setContratos(Array.isArray(resp) ? resp : resp?.data || resp?.results || []);
    } catch (err) {
      console.error('Erro ao carregar contratos:', err);
    }
  };

  useEffect(() => {
    carregarIntervencoes();
    if (isCliente || isAdmin) carregarContratos();
  }, [pagina, filtroStatus, filtroPrioridade]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPagina(1);
      carregarIntervencoes();
    }, 500);
    return () => clearTimeout(timer);
  }, [busca]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'aberto': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'em_andamento': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'resolvido': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'fechado': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'concluido': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityStyle = (prioridade: string) => {
    switch (prioridade) {
      case 'baixa': return 'bg-gray-50 text-gray-500';
      case 'media': return 'bg-blue-50 text-blue-600';
      case 'alta': return 'bg-orange-50 text-orange-600';
      case 'urgente': return 'bg-red-50 text-red-600';
      default: return 'bg-gray-50 text-gray-500';
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTicket.contrato_id) {
      setErro('Selecione um contrato para vincular a intervenção.');
      return;
    }
    
    setCarregando(true);
    setStatus('loading');
    setErro('');
    try {
      // Encontrar o cliente_id do contrato selecionado
      const contratoSelecionado = contratos.find(c => c.id === novoTicket.contrato_id);
      const clienteIdFinal = isCliente ? usuario?.id : contratoSelecionado?.cliente_id;

      if (!clienteIdFinal) {
        throw new Error('Não foi possível identificar o cliente do contrato.');
      }

      await intervencoesService.criar({
        ...novoTicket,
        cliente_id: clienteIdFinal,
        anexos: [] // Adicionado conforme nova documentação
      });
      
      setStatus('success');
      setTimeout(() => {
        setExibirModalNovo(false);
        setNovoTicket({ titulo: '', descricao: '', contrato_id: '', prioridade: 'media', anexos: [] });
        setStatus('idle');
        carregarIntervencoes();
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao criar intervenção:', err);
      setErro(err.message || 'Falha ao criar intervenção. Verifique os dados.');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setCarregando(false);
    }
  };

  const handleVerDetalhes = async (id: string) => {
    if (!id) {
      console.error('ID da intervenção está em falta!');
      return;
    }
    console.log('Solicitando detalhes da intervenção ID:', id);
    setCarregandoDetalhe(true);
    try {
      const data = await intervencoesService.obterPorId(id);
      console.log('Detalhes recebidos:', data);
      setIntervencaoDetalhe(data);
      setExibirModalDetalhes(true);
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err);
      setErro('Falha ao carregar detalhes da intervenção.');
    } finally {
      setCarregandoDetalhe(false);
    }
  };

  const handleEnviarComentario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intervencaoDetalhe || !novoComentario.trim()) return;

    try {
      await intervencoesService.adicionarComentario(intervencaoDetalhe.id, {
        texto: novoComentario,
        visivel_cliente: true
      });
      setNovoComentario('');
      // Recarregar detalhes para mostrar novo comentário
      const data = await intervencoesService.obterPorId(intervencaoDetalhe.id);
      setIntervencaoDetalhe(data);
    } catch (err) {
      console.error('Erro ao enviar comentário:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* ... existing header and filters ... */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{isTecnico ? 'Minhas Intervenções' : isCliente ? 'Meus Pedidos de Suporte' : 'Gestão de Intervenções'}</h2>
          <p className="text-sm text-gray-500">{isTecnico ? 'Tickets atribuídos a você.' : isCliente ? 'Acompanhe seus chamados e suporte.' : 'Controle de tickets, suporte e manutenção.'}</p>
        </div>
        {(isAdmin || isCliente) && (
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-all shadow-md shadow-indigo-100"
            onClick={() => setExibirModalNovo(true)}
          >
            <Plus className="w-5 h-5" />
            <span>Nova Intervenção</span>
          </button>
        )}
      </div>

      {/* Modal Nova Intervenção */}
      {exibirModalNovo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-theme-primary text-white">
              <h3 className="text-xl font-black">Nova Intervenção</h3>
              <button onClick={() => setExibirModalNovo(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Título do Pedido *</label>
                <input 
                  type="text"
                  required
                  value={novoTicket.titulo}
                  onChange={(e) => setNovoTicket({...novoTicket, titulo: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
                  placeholder="Resumo do problema"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição Detalhada *</label>
                <textarea 
                  required
                  rows={4}
                  value={novoTicket.descricao}
                  onChange={(e) => setNovoTicket({...novoTicket, descricao: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium resize-none"
                  placeholder="Descreva o que está a acontecer..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contrato Relacionado *</label>
                  <select 
                    required
                    value={novoTicket.contrato_id}
                    onChange={(e) => setNovoTicket({...novoTicket, contrato_id: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
                  >
                    <option value="">Selecione...</option>
                    {contratos.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.cliente_nome.toUpperCase()} — {(c.tipo_contrato || 'Contrato').toUpperCase()} (#{c.numero || c.id.substring(0, 4).toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Prioridade Sugerida</label>
                  <select 
                    value={novoTicket.prioridade}
                    onChange={(e) => setNovoTicket({...novoTicket, prioridade: e.target.value as any})}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Anexos / Fotos do Problema</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input 
                      type="file"
                      id="input-file-anexo"
                      className="hidden"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files) {
                          Array.from(files).forEach(file => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const base64String = reader.result as string;
                              setNovoTicket(prev => ({
                                ...prev, 
                                anexos: [...prev.anexos, base64String]
                              }));
                            };
                            reader.readAsDataURL(file);
                          });
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => document.getElementById('input-file-anexo')?.click()}
                      className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl hover:border-theme-primary hover:bg-theme-primary-light transition-all group"
                    >
                      <Camera className="w-6 h-6 text-gray-400 group-hover:text-theme-primary" />
                      <span className="text-sm font-bold text-gray-500 group-hover:text-theme-primary">Tirar Foto ou Escolher Arquivo</span>
                    </button>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => {
                      const url = prompt('Cole o link do anexo aqui:');
                      if (url) {
                        setNovoTicket({...novoTicket, anexos: [...novoTicket.anexos, url]});
                      }
                    }}
                    className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-colors"
                    title="Adicionar por Link"
                  >
                    <Upload className="w-6 h-6" />
                  </button>
                </div>

                {novoTicket.anexos.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-4">
                    {novoTicket.anexos.map((anexo, i) => (
                      <div key={i} className="relative group">
                        {anexo.startsWith('data:image') ? (
                          <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-indigo-100 shadow-sm">
                            <img src={anexo} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-20 h-20 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border-2 border-indigo-100">
                            <Paperclip className="w-8 h-8" />
                          </div>
                        )}
                        <button 
                          type="button"
                          onClick={() => setNovoTicket({...novoTicket, anexos: novoTicket.anexos.filter((_, idx) => idx !== i)})}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {erro && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-bold uppercase tracking-tight flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {erro}
                </div>
              )}

              <div className="pt-4 flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => setExibirModalNovo(false)}
                  className="flex-1 py-4 text-sm font-black text-gray-500 uppercase tracking-widest hover:bg-gray-100 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={carregando || status === 'success'}
                  className={`flex-[2] py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${
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
                      <span>Processando...</span>
                    </>
                  ) : status === 'success' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Chamado Aberto!</span>
                    </>
                  ) : status === 'error' ? (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      <span>Erro no Pedido</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Criar Intervenção</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Intervenções */}

      {/* Filtros Avançados */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título, número ou descrição..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select 
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">STATUS: TODOS</option>
              <option value="aberto">ABERTOS</option>
              <option value="em_andamento">EM ANDAMENTO</option>
              <option value="resolvido">RESOLVIDOS</option>
              <option value="fechado">FECHADOS</option>
              <option value="concluido">CONCLUÍDOS</option>
            </select>
            <select 
              value={filtroPrioridade}
              onChange={(e) => setFiltroPrioridade(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">PRIORIDADE: TODAS</option>
              <option value="urgente">URGENTE</option>
              <option value="alta">ALTA</option>
              <option value="media">MÉDIA</option>
              <option value="baixa">BAIXA</option>
            </select>
            <button className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Intervenções */}
      <div className="grid grid-cols-1 gap-4">
        {carregando ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-32 bg-gray-50 rounded-xl animate-pulse"></div>
          ))
        ) : intervencoes.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-xl border border-dashed border-gray-200">
            <Info className="w-12 h-12 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-500 text-sm font-medium">Nenhuma intervenção encontrada com estes filtros.</p>
          </div>
        ) : intervencoes.map((intervencao) => (
          <div key={intervencao.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:border-indigo-200 transition-all group overflow-hidden">
            <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400">#{intervencao.numero}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded border ${getStatusStyle(intervencao.status)}`}>
                    {intervencao.status.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded ${getPriorityStyle(intervencao.prioridade)}`}>
                    {intervencao.prioridade}
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{intervencao.titulo}</h3>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium">{intervencao.cliente_nome}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                       <User className="w-3 h-3 text-gray-400" />
                    </div>
                    <span className="font-medium">{intervencao.tecnico_nome || 'Aguardando Atribuição'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{new Date(intervencao.data_abertura).toLocaleDateString('pt-PT')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-gray-400" title="Comentários">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-xs font-bold">{intervencao.total_comentarios || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400" title="Anexos">
                    <Paperclip className="w-4 h-4" />
                    <span className="text-xs font-bold">{intervencao.total_anexos || 0}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   {usuario?.perfil === 'tecnico' && (
                     <>
                       <button className="px-4 py-2 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
                         Atualizar Status
                       </button>
                       <button className="px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                         Lançar Horas
                       </button>
                     </>
                   )}
                   <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVerDetalhes(intervencao.id);
                      }}
                      disabled={carregandoDetalhe}
                      className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-2"
                    >
                     {carregandoDetalhe && <Loader2 className="w-3 h-3 animate-spin" />}
                     Detalhes
                   </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

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

      {/* Modal Detalhes Intervenção */}
      {exibirModalDetalhes && intervencaoDetalhe && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-theme-primary to-indigo-700 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">#{intervencaoDetalhe.numero} — {intervencaoDetalhe.titulo}</h3>
                  <p className="text-indigo-100 text-sm font-bold uppercase tracking-widest">{intervencaoDetalhe.status.replace('_', ' ')}</p>
                </div>
              </div>
              <button onClick={() => setExibirModalDetalhes(false)} className="p-3 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna Esquerda: Info e Comentários */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Descrição */}
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Descrição do Pedido</h4>
                    <p className="text-gray-700 font-medium leading-relaxed">{intervencaoDetalhe.descricao}</p>
                  </div>

                  {/* Comentários */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-black text-gray-900 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-theme-primary" />
                      Comunicação / Chat
                    </h4>
                    
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {!intervencaoDetalhe.comentarios || intervencaoDetalhe.comentarios.length === 0 ? (
                        <p className="text-sm text-gray-500 italic py-4">Nenhuma mensagem trocada ainda.</p>
                      ) : (
                        intervencaoDetalhe.comentarios.map((com, i) => (
                          <div key={i} className={`flex flex-col ${com.usuario_nome === usuario?.nome ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-2xl ${com.usuario_nome === usuario?.nome ? 'bg-theme-primary text-white' : 'bg-gray-100 text-gray-800'}`}>
                              <p className="text-sm font-medium">{com.texto}</p>
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tight">
                              {com.usuario_nome} • {new Date(com.data_criacao).toLocaleString('pt-PT')}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleEnviarComentario} className="mt-6 flex gap-2">
                      <input 
                        type="text"
                        value={novoComentario}
                        onChange={(e) => setNovoComentario(e.target.value)}
                        placeholder="Escreva uma mensagem..."
                        className="flex-1 px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
                      />
                      <button 
                        type="submit"
                        className="p-4 bg-theme-primary text-white rounded-2xl hover:bg-theme-primary-hover shadow-lg shadow-indigo-100 transition-all"
                      >
                        <ArrowRight className="w-6 h-6" />
                      </button>
                    </form>
                  </div>
                </div>

                {/* Coluna Direita: Status, Info Técnica e Anexos */}
                <div className="space-y-8">
                  {/* Info Sidebar */}
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Responsáveis</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold text-gray-700">{intervencaoDetalhe.cliente_nome}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold text-gray-700">{intervencaoDetalhe.tecnico_nome || 'Não atribuído'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Métricas</h4>
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                        <Clock className="w-4 h-4 text-theme-primary" />
                        <span>{intervencaoDetalhe.horas_trabalhadas || 0}h registradas</span>
                      </div>
                    </div>
                  </div>

                  {/* Anexos */}
                  <div>
                    <h4 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-widest">
                      <Paperclip className="w-4 h-4 text-theme-primary" />
                      Anexos ({intervencaoDetalhe.anexos?.length || 0})
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {intervencaoDetalhe.anexos?.map((anexo, i) => (
                        <a 
                          key={i}
                          href={anexo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-white border border-gray-100 rounded-2xl hover:border-theme-primary transition-all group shadow-sm"
                        >
                          {anexo.nome_arquivo.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <img src={anexo.url} alt={anexo.nome_arquivo} className="w-full h-16 object-cover rounded-lg mb-2" />
                          ) : (
                            <div className="w-full h-16 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:text-theme-primary mb-2">
                              <FileText className="w-6 h-6" />
                            </div>
                          )}
                          <p className="text-[10px] font-bold text-gray-600 truncate">{anexo.nome_arquivo}</p>
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Histórico */}
                  <div>
                    <h4 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-widest">
                      <Clock className="w-4 h-4 text-theme-primary" />
                      Linha do Tempo
                    </h4>
                    <div className="space-y-4 border-l-2 border-indigo-50 ml-3 pl-6">
                      {intervencaoDetalhe.historico_status?.map((hist, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[31px] top-0 w-3 h-3 bg-theme-primary rounded-full border-2 border-white"></div>
                          <p className="text-xs font-black text-theme-primary uppercase tracking-tight">{hist.status.replace('_', ' ')}</p>
                          <p className="text-[10px] text-gray-500 font-medium">Por {hist.alterado_por_nome}</p>
                          <p className="text-[10px] text-gray-400">{new Date(hist.data_criacao).toLocaleString('pt-PT')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
