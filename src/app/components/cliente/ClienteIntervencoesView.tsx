import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Plus, Send, Paperclip, Smile, X, MoreVertical, Loader2,
  CheckCircle2, AlertCircle, Camera, FileText, Film, MessageCircle,
  Pencil, Trash2, Clock, ArrowLeft, SlidersHorizontal, Check,
  Bot, ClipboardList, UploadCloud, Image as ImageIcon,
} from 'lucide-react';
import type { Empresa, Intervencao } from '../../types/api';
import { ConversaListItem } from './ConversaListItem';
import { useClienteChrome } from './ClienteShell';
import {
  statusStyle, priorityStyle, detectarTipoAnexo,
  marcarComoVista, consumirIntervencaoSelecionada, EMOJIS_RAPIDOS, totalComentarios,
  categoriaLabel, nomeEmpresa, ultimaAtualizacao, formatarHoraCurta, consumirSinalNovoAtendimento,
} from './helpers';

const HEX_PATTERN = {
  backgroundColor: '#fafafa',
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'%3E%3Cpath d='M28 0L56 16v32L28 64 0 48V16z' fill='none' stroke='%23ece4fb' stroke-width='1.2'/%3E%3C/svg%3E\")",
  backgroundSize: '56px 100px',
};

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

const FILTROS_STATUS = [
  { valor: '', label: 'Todas' },
  { valor: 'aberto', label: 'Abertas' },
  { valor: 'em_andamento', label: 'Em Andamento' },
  { valor: 'concluido', label: 'Concluídas' },
  { valor: 'fechado', label: 'Fechadas' },
];

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

  const { ocultarChrome } = useClienteChrome();
  const [menuAberto, setMenuAberto] = useState(false);
  const [emojiAberto, setEmojiAberto] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [filtroPrioridadeAberto, setFiltroPrioridadeAberto] = useState(false);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const fimDaThreadRef = useRef<HTMLDivElement>(null);
  const inputAnexoRef = useRef<HTMLInputElement>(null);
  const jaTentouHandoff = useRef(false);

  const modoChat = exibirModalNovo || (exibirModalDetalhes && !!intervencaoDetalhe);

  // Esconde o cabeçalho/barra de abas do shell enquanto a conversa está em tela cheia.
  useEffect(() => {
    ocultarChrome(modoChat);
    return () => ocultarChrome(false);
  }, [modoChat, ocultarChrome]);

  // Recebe um atendimento pré-selecionado (ou o pedido de abrir um novo) vindo do Dashboard
  useEffect(() => {
    if (jaTentouHandoff.current) return;
    jaTentouHandoff.current = true;
    const idSelecionado = consumirIntervencaoSelecionada();
    if (idSelecionado) {
      setExibirModalNovo(false);
      handleVerDetalhes(idSelecionado);
    } else if (consumirSinalNovoAtendimento()) {
      setExibirModalDetalhes(false);
      setExibirModalNovo(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marca o atendimento aberto como visto (heurística local de "não lida")
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

  const fecharChat = () => {
    setExibirModalNovo(false);
    setExibirModalDetalhes(false);
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

  if (exibirModalNovo) {
    return (
      <NovoAtendimento
        novoTicket={novoTicket}
        setNovoTicket={setNovoTicket}
        contratos={contratos}
        status={status}
        carregando={carregando}
        erro={erro}
        onVoltar={fecharChat}
        onSubmit={handleCreateTicket}
      />
    );
  }

  if (exibirModalDetalhes && intervencaoDetalhe) {
    return (
      <div className="fixed inset-0 z-30 flex flex-col bg-white cliente-font-body">
        {/* Cabeçalho da conversa */}
        <div className="flex-shrink-0 bg-white border-b border-[#e5e7eb]">
          <div className="flex items-center gap-2 px-3 py-3">
            <button onClick={fecharChat} className="p-2 text-[#191c1e] hover:bg-gray-100 rounded-full flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="cliente-font-heading text-[15px] font-bold text-[#630ed4] truncate">{intervencaoDetalhe.titulo}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${statusStyle(intervencaoDetalhe.status).dot}`} />
                <span className="text-xs text-[#4a4455]">{statusStyle(intervencaoDetalhe.status).label}</span>
                <span className="text-xs text-[#4a4455]">· Atualizado {formatarHoraCurta(ultimaAtualizacao(intervencaoDetalhe)) || '-'}</span>
              </div>
            </div>
            <span className="cliente-font-mono flex-shrink-0 px-2.5 py-1 bg-[#ede0ff] text-[#630ed4] text-[11px] font-semibold rounded-full">
              #{intervencaoDetalhe.numero}
            </span>
            <button
              onClick={() => setHistoricoAberto((v) => !v)}
              className="p-2 text-[#191c1e] hover:bg-gray-100 rounded-full flex-shrink-0"
              title="Histórico"
            >
              <Clock className="w-[18px] h-[18px]" />
            </button>
            <div className="relative flex-shrink-0">
              <button onClick={() => setMenuAberto((v) => !v)} className="p-2 text-[#191c1e] hover:bg-gray-100 rounded-full">
                <MoreVertical className="w-[18px] h-[18px]" />
              </button>
              {menuAberto && (
                <div className="absolute right-0 top-10 w-52 bg-white border border-gray-100 rounded-xl shadow-2xl z-20 overflow-hidden">
                  <button
                    onClick={() => { setMenuAberto(false); abrirEditarCliente(intervencaoDetalhe); }}
                    disabled={!podeEditar}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold hover:bg-gray-50 ${podeEditar ? 'text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
                  >
                    <Pencil className="w-4 h-4" /> Editar atendimento
                  </button>
                  <button
                    onClick={() => { setMenuAberto(false); handleDeletarIntervencao(intervencaoDetalhe); }}
                    disabled={!podeEditar}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold hover:bg-red-50 ${podeEditar ? 'text-red-600' : 'text-gray-300 cursor-not-allowed'}`}
                  >
                    <Trash2 className="w-4 h-4" /> Remover
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ficha do atendimento */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-2.5 text-[11px]">
            <MetaItem label="Categoria" valor={categoriaLabel(intervencaoDetalhe.tipo_intervencao)} />
            <MetaItem label="Empresa" valor={nomeEmpresa(usuario?.empresa) || '-'} />
            <MetaItem label="Responsável" valor={intervencaoDetalhe.tecnico_nome || 'Aguardando atribuição'} />
            <MetaItem label="Aberto em" valor={intervencaoDetalhe.data_abertura ? new Date(intervencaoDetalhe.data_abertura).toLocaleDateString('pt-PT') : '-'} />
            <MetaItem label="Prioridade" valor={priorityStyle(intervencaoDetalhe.prioridade).label} />
          </div>
        </div>

        {!podeEditar && (
          <div className="flex-shrink-0 px-4 py-1.5 bg-amber-50 border-b border-amber-100 text-[11px] font-semibold text-amber-700 text-center">
            Este atendimento só pode ser editado ou removido enquanto estiver em aberto.
          </div>
        )}

        {historicoAberto && (
          <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Linha do tempo</p>
            <div className="flex flex-wrap gap-2">
              {historicoOrdenado(intervencaoDetalhe.historico_status).map((h, i) => (
                <span key={i} className="px-2.5 py-1 bg-gray-100 rounded-full text-[10px] font-semibold text-gray-600">
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
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={HEX_PATTERN}>
          {carregandoDetalhe ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
          ) : (
            <>
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

              {(intervencaoDetalhe.comentarios || []).map((com: any, i: number, lista: any[]) => (
                <MensagemBolha
                  key={i}
                  autor={com.usuario_nome}
                  texto={com.texto}
                  data={com.data_criacao}
                  minha={com.usuario_nome === usuario?.nome}
                  repetida={i > 0 && lista[i - 1]?.usuario_nome === com.usuario_nome}
                />
              ))}
              <div ref={fimDaThreadRef} />
            </>
          )}
        </div>

        {/* Composer de mensagem */}
        <form onSubmit={handleEnviarComentario} className="flex-shrink-0 p-3 bg-white border-t border-[#e5e7eb] flex items-center gap-2 relative">
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
            className="p-2.5 text-[#630ed4] bg-[#ede0ff] hover:bg-[#e2d1ff] rounded-full transition-colors flex-shrink-0 disabled:opacity-40"
          >
            {enviandoAnexo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={() => setEmojiAberto((v) => !v)}
            className="p-2 text-[#4a4455] hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          >
            <Smile className="w-5 h-5" />
          </button>
          <input
            value={novoComentario}
            onChange={(e) => setNovoComentario(e.target.value)}
            placeholder="Escreva uma mensagem..."
            className="flex-1 px-4 py-2.5 bg-white border border-[#e5e7eb] rounded-[12px] outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-[#7c3aed] transition-all text-sm"
          />
          {novoComentario.trim() ? (
            <button
              type="submit"
              className="p-2.5 bg-[#7c3aed] text-white rounded-full hover:bg-[#630ed4] shadow-md transition-all flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => inputAnexoRef.current?.click()}
              className="p-2.5 text-[#4a4455] hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 space-y-4">
      <div>
        <h2 className="cliente-font-heading text-2xl font-bold text-[#191c1e]">Atendimentos</h2>
        <p className="text-sm text-[#4a4455] mt-0.5">Portal Contábil Digital</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a4455]" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar atendimentos..."
            className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-[#e5e7eb] rounded-full outline-none focus:ring-2 focus:ring-[#7c3aed] transition-all"
          />
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setFiltroPrioridadeAberto((v) => !v)}
            className={`p-3 rounded-full border transition-colors ${filtroPrioridade ? 'bg-[#7c3aed] text-white border-[#7c3aed]' : 'bg-white text-[#4a4455] border-[#e5e7eb]'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          {filtroPrioridadeAberto && (
            <div className="absolute right-0 top-12 w-48 bg-white border border-gray-100 rounded-xl shadow-2xl z-20 p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Prioridade</p>
              <select
                value={filtroPrioridade}
                onChange={(e) => { setFiltroPrioridade(e.target.value); setFiltroPrioridadeAberto(false); }}
                className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm outline-none"
              >
                <option value="">Todas</option>
                <option value="urgente">Urgente</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
        {FILTROS_STATUS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltroStatus(f.valor)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              filtroStatus === f.valor ? 'bg-[#7c3aed] text-white' : 'bg-[#eceef0] text-[#4a4455]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-semibold">{erro}</div>
      )}

      <div className="space-y-3 pb-4">
        {carregando ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-white/60 rounded-[18px] animate-pulse" />)
        ) : listaFiltrada.length === 0 ? (
          <div className="py-16 text-center">
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

        {totalPaginas > 1 && (
          <button
            onClick={() => setPagina((p) => (p < totalPaginas ? p + 1 : p))}
            disabled={pagina >= totalPaginas || carregando}
            className="w-full py-3 text-sm font-semibold text-[#7c3aed] disabled:opacity-40 transition-all"
          >
            {pagina >= totalPaginas ? 'Todos os atendimentos carregados' : 'Carregar mais atendimentos'}
          </button>
        )}
      </div>

      <button
        onClick={abrirComposer}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 bg-[#7c3aed] text-white rounded-full shadow-xl shadow-[#7c3aed]/30 flex items-center justify-center hover:bg-[#630ed4] transition-colors"
        title="Novo Atendimento"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

function MetaItem({ label, valor }: { label: string; valor?: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="font-bold text-[#630ed4] uppercase tracking-wide">{label}:</span>
      <span className="font-medium text-[#4a4455] truncate max-w-[140px]">{valor || '-'}</span>
    </div>
  );
}

function MensagemBolha({
  autor, texto, data, minha, rotulo, repetida,
}: { autor?: string; texto?: string; data?: string | null; minha: boolean; rotulo?: string; repetida?: boolean }) {
  return (
    <div className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[82%] ${minha ? 'items-end' : 'items-start'} flex flex-col`}>
        {!repetida && !minha && (
          <span className="text-xs font-semibold text-[#4a4455] mb-1 ml-1">{autor || 'Gabinete de Contabilidade'}</span>
        )}
        {rotulo && (
          <span className="text-[10px] font-bold text-[#7c3aed] uppercase tracking-widest mb-1 mr-1">{rotulo}</span>
        )}
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm rounded-[18px] ${
            minha
              ? `bg-[#7c3aed] text-white ${repetida ? 'rounded-br-[4px]' : ''}`
              : `bg-[#f1f5f9] text-[#111827] ${repetida ? 'rounded-bl-[4px]' : ''}`
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{texto}</p>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-[#4a4455] mt-1 mx-1">
          {data ? new Date(data).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
          {minha && <Check className="w-3 h-3" />}
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
      className="flex items-center gap-2 px-3 py-2 bg-[#7c3aed] text-white rounded-[14px] text-xs font-semibold hover:opacity-90 transition-opacity max-w-[220px] shadow-sm"
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
    <form onSubmit={onSubmit} className="flex-shrink-0 px-4 py-4 bg-white border-b border-gray-100 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Editar atendimento</p>
        <button type="button" onClick={onCancelar} className="p-1 text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <input
        required
        value={formEditar.titulo}
        onChange={(e) => setFormEditar((prev) => ({ ...prev, titulo: e.target.value }))}
        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#7c3aed]"
        placeholder="Título"
      />
      <textarea
        required
        rows={3}
        value={formEditar.descricao}
        onChange={(e) => setFormEditar((prev) => ({ ...prev, descricao: e.target.value }))}
        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#7c3aed] resize-none"
        placeholder="Descrição"
      />
      <div className="flex items-center gap-3">
        <select
          value={formEditar.prioridade}
          onChange={(e) => setFormEditar((prev) => ({ ...prev, prioridade: e.target.value }))}
          className="px-3 py-2 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#7c3aed]"
        >
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
          <option value="urgente">Urgente</option>
        </select>
        <button
          type="submit"
          disabled={salvando}
          className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] text-white rounded-xl text-sm font-semibold hover:bg-[#630ed4] disabled:opacity-50"
        >
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Guardar
        </button>
      </div>
    </form>
  );
}

const NIVEIS_PRIORIDADE = [
  { valor: 'baixa', label: 'Baixa', dot: 'bg-emerald-500' },
  { valor: 'media', label: 'Média', dot: 'bg-amber-500' },
  { valor: 'alta', label: 'Alta', dot: 'bg-orange-500' },
  { valor: 'urgente', label: 'Urgente', dot: 'bg-red-600' },
];

function CardSecao({ icon: Icon, titulo, children }: { icon: any; titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[18px] shadow-sm p-5">
      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100">
        <Icon className="w-4 h-4 text-[#7c3aed]" />
        <h3 className="cliente-font-heading text-sm font-bold text-[#191c1e]">{titulo}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function NovoAtendimentoOld({
  novoTicket, setNovoTicket, contratos, status, carregando, erro, onVoltar, onSubmit,
}: {
  novoTicket: NovoTicketState;
  setNovoTicket: (fn: (prev: NovoTicketState) => NovoTicketState) => void;
  contratos: any[];
  status: 'idle' | 'loading' | 'success' | 'error';
  carregando: boolean;
  erro: string;
  onVoltar: () => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-white cliente-font-body">
      <div className="flex-shrink-0 flex items-center gap-3 px-3 py-3 bg-white border-b border-[#e5e7eb]">
        <button onClick={onVoltar} className="p-2 text-[#191c1e] hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="cliente-font-heading text-[15px] font-bold text-[#630ed4]">Novo Atendimento Contábil</p>
      </div>

      <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#4a4455] uppercase tracking-widest ml-1">Assunto do Atendimento *</label>
          <input
            required
            value={novoTicket.titulo}
            onChange={(e) => setNovoTicket((prev) => ({ ...prev, titulo: e.target.value }))}
            className="w-full px-4 py-3 bg-white border border-[#e5e7eb] rounded-[14px] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 outline-none transition-all text-sm"
            placeholder="Ex.: Emissão de fatura, dúvida fiscal, envio de documentos..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#4a4455] uppercase tracking-widest ml-1">Descreva a sua Solicitação *</label>
          <textarea
            required
            rows={4}
            value={novoTicket.descricao}
            onChange={(e) => setNovoTicket((prev) => ({ ...prev, descricao: e.target.value }))}
            className="w-full px-4 py-3 bg-white border border-[#e5e7eb] rounded-[14px] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 outline-none transition-all text-sm resize-none"
            placeholder="Essa mensagem será a primeira da conversa..."
          />
        </div>

        {contratos.length !== 1 && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#4a4455] uppercase tracking-widest ml-1">Contrato Relacionado</label>
            <select
              value={novoTicket.contrato_id}
              onChange={(e) => setNovoTicket((prev) => ({ ...prev, contrato_id: e.target.value }))}
              className="w-full px-4 py-3 bg-white border border-[#e5e7eb] rounded-[14px] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 outline-none transition-all text-sm"
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

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#4a4455] uppercase tracking-widest ml-1">Prioridade</label>
          <select
            value={novoTicket.prioridade}
            onChange={(e) => setNovoTicket((prev) => ({ ...prev, prioridade: e.target.value }))}
            className="w-full px-4 py-3 bg-white border border-[#e5e7eb] rounded-[14px] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 outline-none transition-all text-sm"
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#4a4455] uppercase tracking-widest ml-1">Anexos / Documentos</label>
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
            className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-white border-2 border-dashed border-[#e5e7eb] rounded-[14px] hover:border-[#7c3aed] hover:bg-[#ede0ff]/30 transition-all group"
          >
            <Camera className="w-5 h-5 text-[#4a4455] group-hover:text-[#7c3aed]" />
            <span className="text-sm font-semibold text-[#4a4455] group-hover:text-[#7c3aed]">Anexar Documento ou Foto</span>
          </button>

          {novoTicket.anexos.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-3">
              {novoTicket.anexos.map((anexo, i) => (
                <div key={i} className="relative group">
                  <div className="w-20 h-20 bg-[#ede0ff] rounded-xl flex flex-col items-center justify-center text-[#7c3aed] border-2 border-violet-200 px-2 text-center">
                    <Paperclip className="w-6 h-6" />
                    <span className="mt-1 text-[9px] font-semibold text-gray-600 leading-tight truncate w-full">{anexo.name}</span>
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
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {erro}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 pb-4">
          <button
            type="button"
            onClick={onVoltar}
            className="flex-1 py-3.5 text-sm font-bold text-[#4a4455] uppercase tracking-widest hover:bg-gray-100 rounded-[14px] transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={carregando || status === 'success'}
            className={`flex-[2] py-3.5 rounded-[14px] text-sm font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${
              status === 'success'
                ? 'bg-emerald-500 text-white'
                : status === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-[#7c3aed] text-white hover:bg-[#630ed4]'
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
