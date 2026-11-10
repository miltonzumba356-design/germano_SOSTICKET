import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Loader2,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Ticket,
  User,
  X,
} from 'lucide-react';
import type { Cliente, Intervencao } from '../types/api';
import { clientesService, intervencoesService } from '../services/api';

// apchat — chat interno com o mesmo modelo do WhatsApp:
// lista de clientes à esquerda + conversa à direita + criar ticket na conversa.

function listaDe(resp: any): any[] {
  const l = Array.isArray(resp) ? resp : resp?.data?.results || resp?.results || resp?.data || [];
  return Array.isArray(l) ? l : [];
}

function comentariosDe(i: any): any[] {
  const c = i?.comentarios || i?.comentario || [];
  return Array.isArray(c) ? c : [];
}

function horaCurta(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
}

function horaMensagem(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function iniciais(texto: string) {
  return (
    texto
      .replace(/[^A-Za-zÀ-ÿ0-9 ]/g, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || '#'
  );
}

function nomeEmpresa(empresa?: string | { nome?: string; Email_empresa?: string } | null) {
  if (!empresa) return '';
  if (typeof empresa === 'string') return empresa;
  return empresa.nome || empresa.Email_empresa || '';
}

interface Props {
  usuarioNome?: string;
  onTicketCriado?: () => void;
  intervaloListaMs?: number;
  intervaloConversaMs?: number;
}

interface ModalTicket {
  titulo: string;
  descricao: string;
  prioridade: string;
  aGuardar: boolean;
  erro: string | null;
}

export function ApchatInbox({
  usuarioNome,
  onTicketCriado,
  intervaloListaMs = 15_000,
  intervaloConversaMs = 10_000,
}: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [intervencoes, setIntervencoes] = useState<Intervencao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pesquisa, setPesquisa] = useState('');

  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [detalhe, setDetalhe] = useState<Intervencao | null>(null);
  const [carregandoConversa, setCarregandoConversa] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [modalTicket, setModalTicket] = useState<ModalTicket | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  const carregarLista = async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      const [respClientes, respIntervencoes] = await Promise.all([
        clientesService.listar({ limit: 100 } as any),
        intervencoesService.listar({ limit: 100 }),
      ]);
      setClientes(listaDe(respClientes));
      setIntervencoes(listaDe(respIntervencoes));
      setErro(null);
    } catch (e: any) {
      if (!silencioso) setErro(e?.message || 'Falha ao carregar o apchat.');
    } finally {
      if (!silencioso) setCarregando(false);
    }
  };

  useEffect(() => {
    carregarLista();
    const timer = setInterval(() => carregarLista(true), intervaloListaMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervaloListaMs]);

  // cliente_id -> atendimento mais recente
  const intervencaoPorCliente = useMemo(() => {
    const mapa = new Map<string, Intervencao>();
    const ordenadas = [...intervencoes].sort((a, b) =>
      String(b.data_abertura || '').localeCompare(String(a.data_abertura || '')),
    );
    for (const i of ordenadas) {
      if (i.cliente_id && !mapa.has(i.cliente_id)) mapa.set(i.cliente_id, i);
    }
    return mapa;
  }, [intervencoes]);

  const intervencaoSelecionada = clienteSel ? intervencaoPorCliente.get(clienteSel.id) || null : null;

  const carregarConversa = async (intervencaoId: string, silencioso = false) => {
    if (!silencioso) setCarregandoConversa(true);
    try {
      const d = await intervencoesService.obterPorId(intervencaoId);
      setDetalhe(d);
    } catch {
      // silencioso
    } finally {
      if (!silencioso) setCarregandoConversa(false);
    }
  };

  // Ao mudar de cliente, carrega a conversa do atendimento mais recente.
  useEffect(() => {
    if (!intervencaoSelecionada) {
      setDetalhe(null);
      return;
    }
    carregarConversa(intervencaoSelecionada.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervencaoSelecionada?.id]);

  // Actualiza a conversa aberta a cada X segundos.
  useEffect(() => {
    if (!detalhe?.id) return;
    const timer = setInterval(() => carregarConversa(detalhe.id, true), intervaloConversaMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detalhe?.id, intervaloConversaMs]);

  // Scroll para a última mensagem.
  useEffect(() => {
    if (detalhe) fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [detalhe?.comentarios?.length, detalhe?.id]);

  const linhas = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();

    return clientes
      .map((cliente) => {
        const intervencao = intervencaoPorCliente.get(cliente.id);
        const coms = comentariosDe(intervencao);
        const ultimo = coms[coms.length - 1];
        return { cliente, intervencao, coms, ultimo };
      })
      .filter(({ cliente, intervencao, ultimo }) => {
        if (!termo) return true;
        return [
          cliente.nome,
          cliente.email,
          cliente.telefone,
          nomeEmpresa(cliente.empresa as any),
          intervencao?.numero,
          intervencao?.titulo,
          ultimo?.texto,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(termo);
      })
      .sort((a, b) => {
        const da = a.ultimo?.data_criacao || a.intervencao?.data_abertura || '';
        const db = b.ultimo?.data_criacao || b.intervencao?.data_abertura || '';
        if (da && db) return String(db).localeCompare(String(da));
        if (da) return -1;
        if (db) return 1;
        return String(a.cliente.nome || '').localeCompare(String(b.cliente.nome || ''));
      });
  }, [clientes, intervencaoPorCliente, pesquisa]);

  const totalComMensagens = linhas.filter((l) => l.coms.length > 0).length;
  const comentarios = detalhe?.comentarios || [];

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!detalhe || !texto.trim() || enviando) return;
    setEnviando(true);
    try {
      await intervencoesService.adicionarComentario(detalhe.id, {
        texto: texto.trim(),
        visivel_cliente: true,
      });
      setTexto('');
      await carregarConversa(detalhe.id, true);
      carregarLista(true);
    } catch {
      // silencioso
    } finally {
      setEnviando(false);
    }
  };

  const abrirModalTicket = () => {
    if (!clienteSel) return;
    const ultimo = comentarios[comentarios.length - 1];
    setModalTicket({
      titulo: ultimo?.texto ? String(ultimo.texto).slice(0, 80) : '',
      descricao: ultimo?.texto ? String(ultimo.texto) : '',
      prioridade: 'media',
      aGuardar: false,
      erro: null,
    });
  };

  const criarTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!modalTicket || !clienteSel) return;
    if (!modalTicket.titulo.trim() || !modalTicket.descricao.trim()) return;

    setModalTicket((m) => m && { ...m, aGuardar: true, erro: null });
    try {
      await intervencoesService.criar({
        titulo: modalTicket.titulo.trim(),
        descricao: modalTicket.descricao.trim(),
        cliente_id: clienteSel.id,
        prioridade: modalTicket.prioridade,
      });
      setModalTicket(null);
      await carregarLista(true);
      onTicketCriado?.();
    } catch (err: any) {
      setModalTicket((m) =>
        m && { ...m, aGuardar: false, erro: err?.message || 'Não foi possível criar o ticket.' },
      );
    }
  };

  return (
    <div className="space-y-3">
      {/* Barra de estado */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold bg-indigo-50 text-theme-primary">
          <MessageSquare className="w-3.5 h-3.5" />
          Chat interno
        </span>
        <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
          {clientes.length} clientes
        </span>
        <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
          {totalComMensagens} com mensagens
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid md:grid-cols-[340px_1fr] h-[640px] min-h-0">
          {/* ── Lista de clientes ─────────────────────────────── */}
          <aside className={`${clienteSel ? 'hidden md:flex' : 'flex'} flex-col min-h-0 border-r border-gray-100`}>
            <div className="p-4 border-b border-gray-100 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-theme-primary" />
                    apchat
                  </h3>
                  <p className="text-[11px] text-gray-500">Todos os clientes, como no WhatsApp</p>
                </div>
                <button
                  type="button"
                  onClick={() => carregarLista()}
                  disabled={carregando}
                  title="Actualizar"
                  className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-theme-primary transition-colors disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  placeholder="Buscar cliente, empresa ou telefone..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-theme-primary focus:ring-0 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {carregando ? (
                <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-medium">A carregar clientes...</span>
                </div>
              ) : erro ? (
                <div className="m-3 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{erro}</span>
                </div>
              ) : linhas.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 px-6 text-center">
                  <User className="w-8 h-8 text-gray-300" />
                  <p className="text-sm font-bold text-gray-700">
                    {pesquisa ? 'Nenhum cliente encontrado' : 'Sem clientes'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {pesquisa ? 'Tenta outro nome ou telefone.' : 'Os clientes aparecem aqui.'}
                  </p>
                </div>
              ) : (
                linhas.map(({ cliente, intervencao, coms, ultimo }) => {
                  const activo = clienteSel?.id === cliente.id;
                  return (
                    <button
                      key={cliente.id}
                      type="button"
                      onClick={() => setClienteSel(cliente)}
                      className={`w-full text-left px-3 py-3 flex items-center gap-3 border-b border-gray-50 transition-colors ${
                        activo ? 'bg-indigo-50/70' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-theme-primary flex items-center justify-center font-black text-xs flex-shrink-0">
                        {iniciais(cliente.nome || 'Cliente')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {cliente.nome || 'Cliente'}
                          </p>
                          <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">
                            {horaCurta(ultimo?.data_criacao || intervencao?.data_abertura)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {ultimo ? (
                            <>
                              <span className="font-semibold text-gray-600">{ultimo.usuario_nome}:</span>{' '}
                              {ultimo.texto}
                            </>
                          ) : intervencao ? (
                            <span className="italic text-gray-400">Sem mensagens · #{intervencao.numero}</span>
                          ) : (
                            <span className="italic text-gray-400">Sem atendimento</span>
                          )}
                        </p>
                      </div>
                      {coms.length > 0 && (
                        <span className="text-[10px] font-black text-theme-primary bg-indigo-50 px-1.5 py-0.5 rounded-md flex-shrink-0">
                          {coms.length}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* ── Conversa ──────────────────────────────────────── */}
          <section className={`${clienteSel ? 'flex' : 'hidden md:flex'} flex-col min-h-0 bg-gray-50`}>
            {!clienteSel ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
                <div className="w-16 h-16 rounded-3xl bg-white border border-gray-100 shadow-sm text-theme-primary flex items-center justify-center">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-800">apchat</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">
                    Seleciona um cliente à esquerda para ver a conversa interna.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Cabeçalho da conversa */}
                <header className="p-4 border-b border-gray-100 bg-white flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setClienteSel(null)}
                    className="md:hidden p-2 -ml-1 rounded-xl text-gray-500 hover:bg-gray-100"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-theme-primary flex items-center justify-center font-black text-xs flex-shrink-0">
                    {iniciais(clienteSel.nome || 'Cliente')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-gray-900 truncate">{clienteSel.nome || 'Cliente'}</p>
                    <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-gray-500">
                      {nomeEmpresa(clienteSel.empresa as any) && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <Building2 className="w-3 h-3" /> {nomeEmpresa(clienteSel.empresa as any)}
                        </span>
                      )}
                      {clienteSel.telefone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {clienteSel.telefone}
                        </span>
                      )}
                      {intervencaoSelecionada && (
                        <span className="font-bold text-theme-primary">#{intervencaoSelecionada.numero}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={abrirModalTicket}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-theme-primary text-white text-xs font-bold shadow-sm hover:bg-theme-primary-hover transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Criar ticket
                  </button>
                </header>

                {/* Mensagens */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                  {!intervencaoSelecionada ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                      <Ticket className="w-8 h-8 text-gray-300" />
                      <div>
                        <p className="text-sm font-bold text-gray-700">Sem atendimento</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Cria um ticket para começar a conversa com este cliente.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={abrirModalTicket}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-primary text-white text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-theme-primary-hover transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Criar ticket
                      </button>
                    </div>
                  ) : carregandoConversa ? (
                    <div className="h-full flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs font-medium">A carregar conversa...</span>
                    </div>
                  ) : comentarios.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                      <MessageSquare className="w-8 h-8 text-gray-300" />
                      <p className="text-sm font-bold text-gray-700">Ainda não há mensagens</p>
                      <p className="text-xs text-gray-500">Escreve a primeira mensagem para este cliente.</p>
                    </div>
                  ) : (
                    comentarios.map((com, i) => {
                      const meu = !!usuarioNome && com.usuario_nome === usuarioNome;
                      return (
                        <div key={com.id || i} className={`flex ${meu ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${
                              meu
                                ? 'bg-theme-primary text-white rounded-br-md'
                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                            }`}
                          >
                            {!meu && (
                              <p className="text-[10px] font-black uppercase tracking-wide text-theme-primary mb-0.5">
                                {com.usuario_nome || 'Equipa'}
                              </p>
                            )}
                            <p className="text-sm font-medium whitespace-pre-wrap break-words">{com.texto}</p>
                            <p
                              className={`text-[10px] mt-1 text-right ${
                                meu ? 'text-indigo-200' : 'text-gray-400'
                              }`}
                            >
                              {horaMensagem(com.data_criacao)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={fimRef} />
                </div>

                {/* Composer */}
                {intervencaoSelecionada && (
                  <form onSubmit={enviar} className="p-3 border-t border-gray-100 bg-white flex items-center gap-2">
                    <input
                      type="text"
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      placeholder="Escreve uma mensagem..."
                      className="flex-1 px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
                    />
                    <button
                      type="submit"
                      disabled={enviando || !texto.trim()}
                      className="p-3 bg-theme-primary text-white rounded-xl hover:bg-theme-primary-hover shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </form>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {/* Modal criar ticket */}
      {modalTicket && clienteSel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">Criar ticket desta conversa</h3>
              <button
                type="button"
                onClick={() => !modalTicket.aGuardar && setModalTicket(null)}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={criarTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Cliente
                </label>
                <div className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-gray-50 text-gray-700 font-medium">
                  {clienteSel.nome || 'Cliente'}
                  {clienteSel.telefone ? ` (${clienteSel.telefone})` : ''}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Título *
                </label>
                <input
                  value={modalTicket.titulo}
                  onChange={(e) => setModalTicket({ ...modalTicket, titulo: e.target.value })}
                  required
                  placeholder="Resumo do pedido"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Descrição *
                </label>
                <textarea
                  value={modalTicket.descricao}
                  onChange={(e) => setModalTicket({ ...modalTicket, descricao: e.target.value })}
                  rows={5}
                  required
                  placeholder="Detalhes do pedido"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Prioridade
                </label>
                <select
                  value={modalTicket.prioridade}
                  onChange={(e) => setModalTicket({ ...modalTicket, prioridade: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              </div>

              {modalTicket.erro && (
                <p className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" /> {modalTicket.erro}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalTicket(null)}
                  disabled={modalTicket.aGuardar}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalTicket.aGuardar}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-theme-primary text-white text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-theme-primary-hover disabled:opacity-60"
                >
                  {modalTicket.aGuardar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Criar ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
