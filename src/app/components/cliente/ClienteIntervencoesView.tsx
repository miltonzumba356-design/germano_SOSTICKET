import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Plus, Send, Paperclip, Smile, X, MoreVertical, Loader2,
  CheckCircle2, AlertCircle, Camera, FileText, Film, MessageCircle,
  Pencil, Trash2, Clock,
} from 'lucide-react';
import type { Empresa, Intervencao } from '../../types/api';
import { ConversaListItem } from './ConversaListItem';
import {
  statusStyle, priorityStyle, iniciais, avatarColor, detectarTipoAnexo,
  marcarComoVista, consumirIntervencaoSelecionada, EMOJIS_RAPIDOS, totalComentarios,
  categoriaLabel, nomeEmpresa, ultimaAtualizacao, formatarHoraCurta,
} from './helpers';

interface NovoTicketState {
  titulo: string;
  descricao: string;
  cliente_id: string;
  contrato_id: string;
  prioridade: string;
  anexos: File[];
}

interface FormEditarState {
  titulo: string;
  descricao: string;
  prioridade: string;
}

export interface ClienteIntervencoesViewProps {
  usuario: { id?: string; nome?: string; empresa?: string | Empresa } | null;
  intervencoes: Intervencao[];
  carregando: boolean;
  erro: string;
  busca: string;
  setBusca: (v: string) => void;
  filtroStatus: string;
  setFiltroStatus: (v: string) => void;
  filtroPrioridade: string;
  setFiltroPrioridade: (v: string) => void;
  pagina: number;
  setPagina: (fn: (p: number) => number) => void;
  totalPaginas: number;
  contratos: any[];
  novoTicket: NovoTicketState;
  setNovoTicket: (fn: (prev: NovoTicketState) => NovoTicketState) => void;
  status: 'idle' | 'loading' | 'success' | 'error';
  exibirModalNovo: boolean;
  setExibirModalNovo: (v: boolean) => void;
  handleCreateTicket: (e: React.FormEvent) => void | Promise<void>;
  exibirModalDetalhes: boolean;
  setExibirModalDetalhes: (v: boolean) => void;
  intervencaoDetalhe: Intervencao | null;
  carregandoDetalhe: boolean;
  handleVerDetalhes: (id: string) => void | Promise<void>;
  novoComentario: string;
  setNovoComentario: (v: string) => void;
  handleEnviarComentario: (e: React.FormEvent) => void | Promise<void>;
  podeClienteAlterar: (intervencao: Intervencao) => boolean;
  exibirModalEditar: boolean;
  setExibirModalEditar: (v: boolean) => void;
  formEditar: FormEditarState;
  setFormEditar: (fn: (prev: FormEditarState) => FormEditarState) => void;
  abrirEditarCliente: (intervencao: Intervencao) => void;
  handleEditarCliente: (e: React.FormEvent) => void | Promise<void>;
  salvandoEdicao: boolean;
  handleDeletarIntervencao: (intervencao: Intervencao) => void | Promise<void>;
  handleUploadAnexo: (intervencaoId: string, file: File) => void | Promise<void>;
}

function historicoOrdenado(historico: any[] = []) {
  const porStatus = new Map<string, any>();
  historico.forEach((item) => {
    if (!item?.status || porStatus.has(item.status)) return;
    porStatus.set(item.status, item);
  });
  return Array.from(porStatus.values()).sort((a, b) => {
    const da = new Date(a.data_criacao || 0).getTime();
    const db = new Date(b.data_criacao || 0).getTime();
    return da - db;
  });
}

export function ClienteIntervencoesView(props: ClienteIntervencoesViewProps) {
  const {
    usuario, intervencoes, carregando, erro, busca, setBusca,
    filtroStatus, setFiltroStatus, filtroPrioridade, setFiltroPrioridade,
    pagina, setPagina, totalPaginas, contratos, novoTicket, setNovoTicket,
    status, exibirModalNovo, setExibirModalNovo, handleCreateTicket,
    exibirModalDetalhes, setExibirModalDetalhes, intervencaoDetalhe, carregandoDetalhe,
    handleVerDetalhes, novoComentario, setNovoComentario, handleEnviarComentario,
    podeClienteAlterar, exibirModalEditar, setExibirModalEditar, formEditar, setFormEditar,
    abrirEditarCliente, handleEditarCliente, salvandoEdicao, handleDeletarIntervencao,
    handleUploadAnexo,
  } = props;

  const [menuAberto, setMenuAberto] = useState(false);
  const [emojiAberto, setEmojiAberto] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const fimDaThreadRef = useRef<HTMLDivElement>(null);
  const inputAnexoRef = useRef<HTMLInputElement>(null);
  const jaTentouHandoff = useRef(false);

  // Recebe uma conversa pré-selecionada vinda do Dashboard ("Conversas recentes")
  useEffect(() => {
    if (jaTentouHandoff.current) return;
    jaTentouHandoff.current = true;
    const idSelecionado = consumirIntervencaoSelecionada();
    if (idSelecionado) {
      setExibirModalNovo(false);
      handleVerDetalhes(idSelecionado);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marca a conversa aberta como vista (heurística local de "não lida")
  useEffect(() => {
    if (exibirModalDetalhes && intervencaoDetalhe) {
      marcarComoVista(intervencaoDetalhe);
    }
  }, [exibirModalDetalhes, intervencaoDetalhe?.id, intervencaoDetalhe ? totalComentarios(intervencaoDetalhe) : 0]);

  useEffect(() => {
    fimDaThreadRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [intervencaoDetalhe?.comentarios?.length, exibirModalDetalhes]);

  const abrirConversa = (intervencao: Intervencao) => {
    setExibirModalNovo(false);
    setHistoricoAberto(false);
    handleVerDetalhes(intervencao.id);
  };

  const abrirComposer = () => {
    setExibirModalDetalhes(false);
    setExibirModalNovo(true);
  };

  const listaFiltrada = useMemo(() => intervencoes, [intervencoes]);

  const inserirEmoji = (emoji: string) => {
    setNovoComentario(`${novoComentario}${emoji}`);
  };

  const onSelecionarAnexoChat = async (files: FileList | null) => {
    if (!files || !files.length || !intervencaoDetalhe) return;
    setEnviandoAnexo(true);
    try {
      for (const file of Array.from(files)) {
        await handleUploadAnexo(intervencaoDetalhe.id, file);
      }
    } finally {
      setEnviandoAnexo(false);
      if (inputAnexoRef.current) inputAnexoRef.current.value = '';
    }
  };

  const podeEditar = intervencaoDetalhe ? podeClienteAlterar(intervencaoDetalhe) : false;

  return (
    <div className="flex h-[calc(100vh-7.5rem)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* ── Coluna esquerda: lista de conversas ── */}
      <aside className="w-full sm:w-[340px] flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/40">
        <div className="p-4 space-y-3 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900">Atendimentos Contábeis</h2>
              <p className="text-[11px] font-semibold text-gray-400">Portal Contábil Digital</p>
            </div>
            <button
              onClick={abrirComposer}
              className="p-2 bg-theme-primary text-white rounded-full hover:bg-theme-primary-hover shadow-md transition-all"
              title="Novo Atendimento"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar atendimentos..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 rounded-full outline-none focus:ring-2 focus:ring-theme-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="flex-shrink-0 bg-gray-100 rounded-full px-3 py-1.5 text-[11px] font-bold text-gray-600 outline-none"
            >
              <option value="">Todos status</option>
              <option value="aberto">Aberto</option>
              <option value="em_andamento">Em Atendimento</option>
              <option value="resolvido">Resolvido</option>
              <option value="fechado">Fechado</option>
              <option value="concluido">Concluído</option>
            </select>
            <select
              value={filtroPrioridade}
              onChange={(e) => setFiltroPrioridade(e.target.value)}
              className="flex-shrink-0 bg-gray-100 rounded-full px-3 py-1.5 text-[11px] font-bold text-gray-600 outline-none"
            >
              <option value="">Toda prioridade</option>
              <option value="urgente">Urgente</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {carregando ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
          ) : listaFiltrada.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum atendimento encontrado.</p>
            </div>
          ) : (
            listaFiltrada.map((intervencao) => (
              <ConversaListItem
                key={intervencao.id}
                intervencao={intervencao}
                ativo={exibirModalDetalhes && intervencaoDetalhe?.id === intervencao.id}
                nomeUsuario={usuario?.nome}
                onClick={() => abrirConversa(intervencao)}
              />
            ))
          )}
        </div>

        {totalPaginas > 1 && (
          <div className="p-3 border-t border-gray-100 bg-white">
            <button
              onClick={() => setPagina((p) => (p < totalPaginas ? p + 1 : p))}
              disabled={pagina >= totalPaginas || carregando}
              className="w-full py-2 text-xs font-bold text-theme-primary bg-theme-light rounded-lg disabled:opacity-40 transition-all"
            >
              {pagina >= totalPaginas ? 'Todos os atendimentos carregados' : 'Carregar mais atendimentos'}
            </button>
          </div>
        )}
      </aside>

      {/* ── Coluna direita ── */}
      <section className="flex-1 flex flex-col min-w-0 bg-[#f7f5fb]">
        {exibirModalNovo ? (
          <NovaConversa
            novoTicket={novoTicket}
            setNovoTicket={setNovoTicket}
            contratos={contratos}
            status={status}
            carregando={carregando}
            erro={erro}
            onCancelar={() => setExibirModalNovo(false)}
            onSubmit={handleCreateTicket}
          />
        ) : exibirModalDetalhes && intervencaoDetalhe ? (
          <>
            {/* Cabeçalho da conversa */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 bg-white border-b border-gray-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-full ${avatarColor(intervencaoDetalhe.id)} text-white flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                  {iniciais(intervencaoDetalhe.titulo)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate">{intervencaoDetalhe.titulo}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-gray-400">#{intervencaoDetalhe.numero}</span>
                    <span className={`px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded ${statusStyle(intervencaoDetalhe.status).bg} ${statusStyle(intervencaoDetalhe.status).text}`}>
                      {statusStyle(intervencaoDetalhe.status).label}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded ${priorityStyle(intervencaoDetalhe.prioridade).bg} ${priorityStyle(intervencaoDetalhe.prioridade).text}`}>
                      {priorityStyle(intervencaoDetalhe.prioridade).label}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setHistoricoAberto((v) => !v)}
                  className="p-2 text-gray-400 hover:text-theme-primary hover:bg-theme-primary-light rounded-full transition-colors"
                  title="Histórico"
                >
                  <Clock className="w-4 h-4" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setMenuAberto((v) => !v)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuAberto && (
                    <div className="absolute right-0 top-10 w-52 bg-white border border-gray-100 rounded-xl shadow-2xl z-20 overflow-hidden">
                      <button
                        onClick={() => { setMenuAberto(false); abrirEditarCliente(intervencaoDetalhe); }}
                        disabled={!podeEditar}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-bold hover:bg-gray-50 ${podeEditar ? 'text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
                      >
                        <Pencil className="w-4 h-4" /> Editar atendimento
                      </button>
                      <button
                        onClick={() => { setMenuAberto(false); handleDeletarIntervencao(intervencaoDetalhe); }}
                        disabled={!podeEditar}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-bold hover:bg-red-50 ${podeEditar ? 'text-red-600' : 'text-gray-300 cursor-not-allowed'}`}
                      >
                        <Trash2 className="w-4 h-4" /> Remover
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setExibirModalDetalhes(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Ficha do atendimento */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 px-5 py-2.5 bg-theme-light border-b border-gray-100">
              <MetaItem label="Categoria" valor={categoriaLabel(intervencaoDetalhe.tipo_intervencao)} />
              <MetaItem label="Empresa" valor={nomeEmpresa(usuario?.empresa) || '-'} />
              <MetaItem label="Responsável" valor={intervencaoDetalhe.tecnico_nome || 'Aguardando atribuição'} />
              <MetaItem label="Aberto em" valor={intervencaoDetalhe.data_abertura ? new Date(intervencaoDetalhe.data_abertura).toLocaleDateString('pt-PT') : '-'} />
              <MetaItem label="Última atualização" valor={formatarHoraCurta(ultimaAtualizacao(intervencaoDetalhe)) || '-'} />
            </div>

            {!podeEditar && (
              <div className="px-5 py-1.5 bg-amber-50 border-b border-amber-100 text-[11px] font-bold text-amber-700 text-center">
                Este atendimento só pode ser editado ou removido enquanto estiver em aberto.
              </div>
            )}

            {historicoAberto && (
              <div className="px-5 py-3 bg-white border-b border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Linha do tempo</p>
                <div className="flex flex-wrap gap-2">
                  {historicoOrdenado(intervencaoDetalhe.historico_status).map((h, i) => (
                    <span key={i} className="px-2.5 py-1 bg-gray-100 rounded-full text-[10px] font-bold text-gray-600">
                      {statusStyle(h.status).label} · {h.data_criacao ? new Date(h.data_criacao).toLocaleDateString('pt-PT') : '-'}
                    </span>
                  ))}
                  {(!intervencaoDetalhe.historico_status || intervencaoDetalhe.historico_status.length === 0) && (
                    <span className="text-xs text-gray-400">Sem histórico registado.</span>
                  )}
                </div>
              </div>
            )}

            {exibirModalEditar && (
              <EdicaoInline
                formEditar={formEditar}
                setFormEditar={setFormEditar}
                salvando={salvandoEdicao}
                onCancelar={() => setExibirModalEditar(false)}
                onSubmit={handleEditarCliente}
              />
            )}

            {/* Thread de mensagens */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {carregandoDetalhe ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
              ) : (
                <>
                  {/* Mensagem de abertura (a descrição inicial do pedido) */}
                  <MensagemBolha
                    autor={intervencaoDetalhe.cliente_nome || usuario?.nome}
                    texto={intervencaoDetalhe.descricao}
                    data={intervencaoDetalhe.data_abertura}
                    minha
                    rotulo="Solicitação inicial"
                  />

                  {intervencaoDetalhe.anexos && intervencaoDetalhe.anexos.length > 0 && (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] flex flex-wrap gap-2 justify-end">
                        {intervencaoDetalhe.anexos.map((anexo: any, i: number) => (
                          <AnexoChip key={i} url={anexo.url} nome={anexo.nome_arquivo} />
                        ))}
                      </div>
                    </div>
                  )}

                  {(intervencaoDetalhe.comentarios || []).map((com: any, i: number) => (
                    <MensagemBolha
                      key={i}
                      autor={com.usuario_nome}
                      texto={com.texto}
                      data={com.data_criacao}
                      minha={com.usuario_nome === usuario?.nome}
                    />
                  ))}
                  <div ref={fimDaThreadRef} />
                </>
              )}
            </div>

            {/* Composer de mensagem */}
            <form onSubmit={handleEnviarComentario} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 relative">
              {emojiAberto && (
                <div className="absolute bottom-16 left-3 bg-white border border-gray-100 rounded-2xl shadow-2xl p-3 grid grid-cols-8 gap-1 z-30">
                  {EMOJIS_RAPIDOS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { inserirEmoji(emoji); setEmojiAberto(false); }}
                      className="text-xl hover:bg-gray-100 rounded-lg p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setEmojiAberto((v) => !v)}
                className="p-2.5 text-gray-400 hover:text-theme-primary hover:bg-theme-primary-light rounded-full transition-colors flex-shrink-0"
              >
                <Smile className="w-5 h-5" />
              </button>
              <input
                ref={inputAnexoRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => onSelecionarAnexoChat(e.target.files)}
              />
              <button
                type="button"
                onClick={() => inputAnexoRef.current?.click()}
                disabled={enviandoAnexo}
                className="p-2.5 text-gray-400 hover:text-theme-primary hover:bg-theme-primary-light rounded-full transition-colors flex-shrink-0 disabled:opacity-40"
              >
                {enviandoAnexo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
              </button>
              <input
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                placeholder="Escreva uma mensagem para o seu contabilista..."
                className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full outline-none focus:ring-2 focus:ring-theme-primary transition-all text-sm"
              />
              <button
                type="submit"
                disabled={!novoComentario.trim()}
                className="p-2.5 bg-theme-primary text-white rounded-full hover:bg-theme-primary-hover shadow-md transition-all disabled:opacity-40 flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <EstadoVazio />
        )}
      </section>
    </div>
  );
}

function MetaItem({ label, valor }: { label: string; valor?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-black text-theme-dark uppercase tracking-wide">{label}:</span>
      <span className="text-[11px] font-bold text-gray-700 truncate max-w-[160px]">{valor || '-'}</span>
    </div>
  );
}

function EstadoVazio() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <div className="w-24 h-24 rounded-full bg-theme-light flex items-center justify-center mb-4">
        <MessageCircle className="w-12 h-12 text-theme-primary" />
      </div>
      <h3 className="text-lg font-black text-gray-700">Selecione um atendimento</h3>
      <p className="text-sm text-gray-400 mt-1 max-w-xs">
        Escolha um atendimento contábil na lista à esquerda ou solicite um novo para falar com o seu contabilista.
      </p>
    </div>
  );
}

function MensagemBolha({
  autor, texto, data, minha, rotulo,
}: { autor?: string; texto?: string; data?: string | null; minha: boolean; rotulo?: string }) {
  return (
    <div className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${minha ? 'items-end' : 'items-start'} flex flex-col`}>
        {rotulo && (
          <span className="text-[10px] font-black text-theme-primary uppercase tracking-widest mb-1 mr-1">{rotulo}</span>
        )}
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            minha
              ? 'bg-theme-primary text-white rounded-2xl rounded-br-sm'
              : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100'
          }`}
        >
          {!minha && <p className="text-[10px] font-black opacity-60 mb-0.5">{autor || 'Gabinete de Contabilidade'}</p>}
          <p className="whitespace-pre-wrap break-words">{texto}</p>
        </div>
        <span className="text-[10px] text-gray-400 mt-1 mx-1">
          {data ? new Date(data).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
        </span>
      </div>
    </div>
  );
}

function AnexoChip({ url, nome }: { url: string; nome?: string }) {
  const tipo = detectarTipoAnexo(url);
  const Icon = tipo === 'pdf' ? FileText : tipo === 'video' ? Film : Paperclip;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 bg-violet-50 text-theme-primary rounded-xl text-xs font-bold hover:bg-violet-100 transition-colors max-w-[220px]"
    >
      {tipo === 'imagem' ? (
        <img src={url} alt={nome} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <Icon className="w-4 h-4 flex-shrink-0" />
      )}
      <span className="truncate">{nome || 'Anexo'}</span>
    </a>
  );
}

function EdicaoInline({
  formEditar, setFormEditar, salvando, onCancelar, onSubmit,
}: {
  formEditar: FormEditarState;
  setFormEditar: (fn: (prev: FormEditarState) => FormEditarState) => void;
  salvando: boolean;
  onCancelar: () => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
}) {
  return (
    <form onSubmit={onSubmit} className="px-5 py-4 bg-white border-b border-gray-100 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Editar atendimento</p>
        <button type="button" onClick={onCancelar} className="p-1 text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <input
        required
        value={formEditar.titulo}
        onChange={(e) => setFormEditar((prev) => ({ ...prev, titulo: e.target.value }))}
        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-theme-primary"
        placeholder="Título"
      />
      <textarea
        required
        rows={3}
        value={formEditar.descricao}
        onChange={(e) => setFormEditar((prev) => ({ ...prev, descricao: e.target.value }))}
        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-theme-primary resize-none"
        placeholder="Descrição"
      />
      <div className="flex items-center gap-3">
        <select
          value={formEditar.prioridade}
          onChange={(e) => setFormEditar((prev) => ({ ...prev, prioridade: e.target.value }))}
          className="px-3 py-2 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-theme-primary"
        >
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
          <option value="urgente">Urgente</option>
        </select>
        <button
          type="submit"
          disabled={salvando}
          className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-xl text-sm font-bold hover:bg-theme-primary-hover disabled:opacity-50"
        >
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Guardar
        </button>
      </div>
    </form>
  );
}

function NovaConversa({
  novoTicket, setNovoTicket, contratos, status, carregando, erro, onCancelar, onSubmit,
}: {
  novoTicket: NovoTicketState;
  setNovoTicket: (fn: (prev: NovoTicketState) => NovoTicketState) => void;
  contratos: any[];
  status: 'idle' | 'loading' | 'success' | 'error';
  carregando: boolean;
  erro: string;
  onCancelar: () => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-theme-primary text-white flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <p className="text-sm font-black text-gray-900">Novo Atendimento Contábil</p>
        </div>
        <button onClick={onCancelar} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 max-w-xl">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assunto do Atendimento *</label>
          <input
            required
            value={novoTicket.titulo}
            onChange={(e) => setNovoTicket((prev) => ({ ...prev, titulo: e.target.value }))}
            className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-2xl focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
            placeholder="Ex.: Emissão de fatura, dúvida fiscal, envio de documentos..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descreva a sua Solicitação *</label>
          <textarea
            required
            rows={4}
            value={novoTicket.descricao}
            onChange={(e) => setNovoTicket((prev) => ({ ...prev, descricao: e.target.value }))}
            className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-2xl focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium resize-none"
            placeholder="Essa mensagem será a primeira da conversa..."
          />
        </div>

        {contratos.length !== 1 && (
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contrato Relacionado</label>
            <select
              value={novoTicket.contrato_id}
              onChange={(e) => setNovoTicket((prev) => ({ ...prev, contrato_id: e.target.value }))}
              className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-2xl focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
            >
              <option value="">Selecione...</option>
              {contratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c.tipo_contrato || c.tipo_de_pagamento || 'Contrato').toUpperCase()} (#{c.numero || c.id.substring(0, 4).toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Prioridade</label>
          <select
            value={novoTicket.prioridade}
            onChange={(e) => setNovoTicket((prev) => ({ ...prev, prioridade: e.target.value }))}
            className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-2xl focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Anexos / Documentos</label>
          <input
            type="file"
            id="cliente-input-anexo-novo"
            className="hidden"
            accept="image/*,application/pdf"
            multiple
            onChange={(e) => {
              const files = e.target.files;
              if (files) {
                setNovoTicket((prev) => ({ ...prev, anexos: [...prev.anexos, ...Array.from(files)] }));
              }
            }}
          />
          <button
            type="button"
            onClick={() => document.getElementById('cliente-input-anexo-novo')?.click()}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-theme-primary hover:bg-theme-primary-light transition-all group"
          >
            <Camera className="w-6 h-6 text-gray-400 group-hover:text-theme-primary" />
            <span className="text-sm font-bold text-gray-500 group-hover:text-theme-primary">Anexar Documento ou Foto</span>
          </button>

          {novoTicket.anexos.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-3">
              {novoTicket.anexos.map((anexo, i) => (
                <div key={i} className="relative group">
                  <div className="w-20 h-20 bg-theme-light rounded-xl flex flex-col items-center justify-center text-theme-primary border-2 border-violet-200 px-2 text-center">
                    <Paperclip className="w-6 h-6" />
                    <span className="mt-1 text-[9px] font-bold text-gray-600 leading-tight truncate w-full">{anexo.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNovoTicket((prev) => ({ ...prev, anexos: prev.anexos.filter((_, idx) => idx !== i) }))}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {erro && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {erro}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 py-3.5 text-sm font-black text-gray-500 uppercase tracking-widest hover:bg-gray-100 rounded-2xl transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={carregando || status === 'success'}
            className={`flex-[2] py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${
              status === 'success'
                ? 'bg-emerald-500 text-white'
                : status === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-theme-primary text-white hover:bg-theme-primary-hover'
            } disabled:opacity-50`}
          >
            {status === 'loading' ? (
              <><Loader2 className="w-5 h-5 animate-spin" /><span>Enviando...</span></>
            ) : status === 'success' ? (
              <><CheckCircle2 className="w-5 h-5" /><span>Atendimento aberto!</span></>
            ) : status === 'error' ? (
              <><AlertCircle className="w-5 h-5" /><span>Erro no envio</span></>
            ) : (
              <><Send className="w-5 h-5" /><span>Enviar Solicitação</span></>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
