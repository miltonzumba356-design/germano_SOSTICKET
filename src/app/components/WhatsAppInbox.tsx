import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Link2,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  Trash2,
  UserPlus,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type { Intervencao } from '../types/api';
import { clientesService, intervencoesService } from '../services/api';
import {
  Contato,
  Mensagem,
  WhatsAppApiError,
  ligarWhatsAppWS,
  whatsappService,
} from '../services/whatsappApi';
import { ChatWhatsApp, numeroWhatsApp } from './IntervencaoWhatsApp';

// Caixa de entrada WhatsApp (admin/técnico) — consome apenas a API WhatsApp + API principal.
// Modelo de referência (Zendesk/Freshdesk/Chatwoot): conversa -> contacto -> cliente -> ticket.

const STATUS_FECHADOS = ['concluida', 'concluído', 'concluido', 'cancelada', 'cancelado', 'fechada', 'fechado', 'resolvida'];

function mensagemErro(erro: unknown, fallback: string) {
  if (erro instanceof WhatsAppApiError) return erro.message;
  if (erro instanceof Error) return erro.message;
  return fallback;
}

function horaCurta(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
}

function iniciais(texto: string) {
  return texto.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '#';
}

function fundirContatos(...listas: Contato[][]) {
  const mapa = new Map<string, Contato>();
  for (const lista of listas) {
    for (const c of lista) {
      const atual = mapa.get(c.numero);
      mapa.set(c.numero, atual ? {
        ...atual,
        nome: atual.nome || c.nome,
        ultimaMensagem: atual.ultimaMensagem || c.ultimaMensagem,
        ultimaData: atual.ultimaData || c.ultimaData,
        naoLidas: Math.max(atual.naoLidas || 0, c.naoLidas || 0),
      } : c);
    }
  }
  return [...mapa.values()];
}

function listaDe(resp: any): any[] {
  const l = Array.isArray(resp) ? resp : resp?.data?.results || resp?.results || resp?.data || [];
  return Array.isArray(l) ? l : [];
}

interface Props {
  podeCriarTicket: boolean;
  onAbrirTicket: (id: string) => void;
  onTicketCriado?: () => void;
}

export function WhatsAppInbox({ podeCriarTicket, onAbrirTicket, onTicketCriado }: Props) {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [wsLigado, setWsLigado] = useState(false);
  const [estadoWhatsApp, setEstadoWhatsApp] = useState<string | null>(null);
  const [pesquisa, setPesquisa] = useState('');
  const [filtro, setFiltro] = useState<'todas' | 'por_ler' | 'por_identificar'>('todas');
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const [tickets, setTickets] = useState<Intervencao[]>([]);
  const [carregandoTickets, setCarregandoTickets] = useState(false);

  const [modalContato, setModalContato] = useState<null | { modo: 'criar' | 'editar'; numero: string; nome: string }>(null);
  const [modalAssociar, setModalAssociar] = useState(false);
  const [modalTicket, setModalTicket] = useState<null | { titulo: string; descricao: string; cliente_id: string; prioridade: string; confirmar: boolean }>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  const selecionadoRef = useRef<string | null>(null);
  selecionadoRef.current = selecionado;
  const ultimasRecebidas = useRef<Record<string, Mensagem[]>>({});

  // número normalizado -> cliente da API principal
  const clientePorNumero = useMemo(() => {
    const mapa = new Map<string, any>();
    clientes.forEach((c) => {
      const n = numeroWhatsApp(c.telefone);
      if (n) mapa.set(n, c);
    });
    return mapa;
  }, [clientes]);

  const contatoAtual = useMemo(
    () => (selecionado ? contatos.find((c) => c.numero === selecionado) || ({ numero: selecionado, nome: null, raw: null } as Contato) : null),
    [contatos, selecionado],
  );
  const clienteAtual = contatoAtual ? clientePorNumero.get(contatoAtual.numero) : undefined;

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [conversas, lista, cli] = await Promise.allSettled([
        whatsappService.conversas(),
        whatsappService.listarContatos(),
        clientesService.listar({ limit: 500 }),
      ]);
      if (conversas.status === 'rejected' && lista.status === 'rejected') throw conversas.reason;
      setContatos(fundirContatos(
        conversas.status === 'fulfilled' ? conversas.value : [],
        lista.status === 'fulfilled' ? lista.value : [],
      ));
      if (cli.status === 'fulfilled') setClientes(listaDe(cli.value));
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível carregar as conversas WhatsApp.'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Tickets do cliente associado à conversa seleccionada
  const carregarTickets = useCallback(async (clienteId?: string) => {
    if (!clienteId) { setTickets([]); return; }
    setCarregandoTickets(true);
    try {
      setTickets(listaDe(await intervencoesService.listar({ cliente_id: clienteId, limit: 5 })));
    } catch {
      setTickets([]);
    } finally {
      setCarregandoTickets(false);
    }
  }, []);

  useEffect(() => {
    carregarTickets(clienteAtual?.id);
  }, [clienteAtual?.id, carregarTickets]);

  useEffect(() => {
    if (selecionado) setContatos((l) => l.map((c) => (c.numero === selecionado ? { ...c, naoLidas: 0 } : c)));
  }, [selecionado]);

  // Tempo real para a lista (o chat aberto tem a sua própria ligação)
  useEffect(() => {
    const ligacao = ligarWhatsAppWS({
      onEstado: setWsLigado,
      onEvento: (evento) => {
        if (evento.event === 'connection.update' && 'state' in evento) { setEstadoWhatsApp(evento.state); return; }
        if (evento.event !== 'messages.upsert' || !('mensagem' in evento)) return;
        const { contato, mensagem } = evento;
        const numero = numeroWhatsApp(mensagem?.numero || contato?.numero);
        if (!numero) return;
        if (mensagem && !mensagem.fromMe) {
          ultimasRecebidas.current[numero] = [...(ultimasRecebidas.current[numero] || []), mensagem].slice(-10);
        }
        setContatos((lista) => {
          const existente = lista.find((c) => c.numero === numero);
          const aberto = selecionadoRef.current === numero;
          const atualizado: Contato = {
            ...(existente || contato || { numero, nome: null, raw: null }),
            numero,
            nome: existente?.nome || contato?.nome || null,
            ultimaMensagem: mensagem?.texto || existente?.ultimaMensagem,
            ultimaData: mensagem?.data || new Date().toISOString(),
            naoLidas: aberto || mensagem?.fromMe ? 0 : (existente?.naoLidas || 0) + 1,
          };
          return [atualizado, ...lista.filter((c) => c.numero !== numero)];
        });
      },
    });
    return () => ligacao.fechar();
  }, []);

  const filtrados = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();
    return [...contatos]
      .sort((a, b) => (b.ultimaData ? Date.parse(b.ultimaData) : 0) - (a.ultimaData ? Date.parse(a.ultimaData) : 0))
      .filter((c) => {
        if (filtro === 'por_ler' && !c.naoLidas) return false;
        if (filtro === 'por_identificar' && clientePorNumero.has(c.numero)) return false;
        if (!termo) return true;
        const cli = clientePorNumero.get(c.numero);
        return c.numero.includes(termo) || (c.nome || '').toLowerCase().includes(termo) || (cli?.nome || '').toLowerCase().includes(termo);
      });
  }, [contatos, pesquisa, filtro, clientePorNumero]);

  const ticketAberto = tickets.find((t) => !STATUS_FECHADOS.includes(String(t.status).toLowerCase()));

  // ---------- Acções ----------

  const guardarContato = async (e: FormEvent) => {
    e.preventDefault();
    if (!modalContato) return;
    const numero = numeroWhatsApp(modalContato.numero);
    if (!numero) { setErroModal('Indique um número válido (ex.: 244923000000).'); return; }
    setAGuardar(true); setErroModal(null);
    try {
      const nome = modalContato.nome.trim() || null;
      if (modalContato.modo === 'criar') await whatsappService.criarContato({ numero, nome });
      else await whatsappService.alterarContato(numero, { nome });
      setContatos((l) => {
        const ex = l.find((c) => c.numero === numero);
        const novo = { ...(ex || { numero, raw: null }), nome } as Contato;
        return ex ? l.map((c) => (c.numero === numero ? novo : c)) : [novo, ...l];
      });
      if (modalContato.modo === 'criar') setSelecionado(numero);
      setModalContato(null);
    } catch (err) {
      setErroModal(mensagemErro(err, 'Não foi possível guardar o contacto.'));
    } finally {
      setAGuardar(false);
    }
  };

  const apagarContato = async (numero: string) => {
    if (!window.confirm(`Apagar o contacto +${numero}? O histórico guardado na API WhatsApp será removido.`)) return;
    try {
      await whatsappService.apagarContato(numero);
      setContatos((l) => l.filter((c) => c.numero !== numero));
      if (selecionado === numero) setSelecionado(null);
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível apagar o contacto.'));
    }
  };

  /** Associa o número ao cliente gravando-o no campo telefone do cliente (API principal). */
  const associarCliente = async (clienteId: string) => {
    if (!contatoAtual) return;
    const cliente = clientes.find((c) => c.id === clienteId);
    if (!cliente) return;
    if (cliente.telefone && numeroWhatsApp(cliente.telefone) !== contatoAtual.numero &&
      !window.confirm(`${cliente.nome} já tem o telefone ${cliente.telefone}. Substituir por +${contatoAtual.numero}?`)) return;
    setAGuardar(true); setErroModal(null);
    try {
      await clientesService.atualizacaoParcial(clienteId, { telefone: contatoAtual.numero });
      await whatsappService.alterarContato(contatoAtual.numero, { nome: cliente.nome }).catch(() =>
        whatsappService.criarContato({ numero: contatoAtual.numero, nome: cliente.nome }).catch(() => null));
      setClientes((l) => l.map((c) => (c.id === clienteId ? { ...c, telefone: contatoAtual.numero } : c)));
      setContatos((l) => l.map((c) => (c.numero === contatoAtual.numero ? { ...c, nome: c.nome || cliente.nome } : c)));
      setModalAssociar(false);
    } catch (err) {
      setErroModal(mensagemErro(err, 'Não foi possível associar o cliente.'));
    } finally {
      setAGuardar(false);
    }
  };

  const abrirCriarTicket = async () => {
    if (!contatoAtual) return;
    setErroModal(null);
    // Usa as últimas mensagens recebidas como descrição do pedido
    let recebidas = ultimasRecebidas.current[contatoAtual.numero] || [];
    if (recebidas.length === 0) {
      const hist = await whatsappService.mensagensDoContato(contatoAtual.numero).catch(() => [] as Mensagem[]);
      recebidas = hist.filter((m) => !m.fromMe).slice(-5);
    }
    const textos = recebidas.map((m) => m.texto).filter(Boolean);
    const primeira = textos[textos.length - 1] || contatoAtual.ultimaMensagem || '';
    setModalTicket({
      titulo: primeira ? primeira.slice(0, 80) : `Pedido via WhatsApp +${contatoAtual.numero}`,
      descricao: `Pedido recebido por WhatsApp (+${contatoAtual.numero}).\n\n${textos.join('\n') || primeira}`.trim(),
      cliente_id: clienteAtual?.id || '',
      prioridade: 'media',
      confirmar: true,
    });
  };

  const criarTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!modalTicket || !contatoAtual) return;
    if (!modalTicket.cliente_id) { setErroModal('Seleccione o cliente do ticket.'); return; }
    setAGuardar(true); setErroModal(null);
    try {
      const criado: any = await intervencoesService.criar({
        titulo: modalTicket.titulo.trim(),
        descricao: modalTicket.descricao.trim(),
        cliente_id: modalTicket.cliente_id,
        prioridade: modalTicket.prioridade,
      });
      const ticket = criado?.data?.id ? criado.data : criado;
      if (modalTicket.confirmar) {
        const ref = ticket?.numero ? ` #${ticket.numero}` : '';
        await whatsappService.enviar({
          numero: contatoAtual.numero,
          texto: `Olá! Recebemos o seu pedido${ref} ("${modalTicket.titulo.trim()}"). A nossa equipa vai tratar dele e responderemos por aqui.`,
        }).catch(() => null);
      }
      // garante que o número fica associado ao cliente
      if (!clienteAtual) {
        await clientesService.atualizacaoParcial(modalTicket.cliente_id, { telefone: contatoAtual.numero }).catch(() => null);
        setClientes((l) => l.map((c) => (c.id === modalTicket.cliente_id ? { ...c, telefone: contatoAtual.numero } : c)));
      }
      setModalTicket(null);
      await carregarTickets(modalTicket.cliente_id);
      onTicketCriado?.();
      if (ticket?.id) onAbrirTicket(ticket.id);
    } catch (err) {
      setErroModal(mensagemErro(err, 'Não foi possível criar o ticket.'));
    } finally {
      setAGuardar(false);
    }
  };

  // ---------- Render ----------

  const nomeContato = (c: Contato) => clientePorNumero.get(c.numero)?.nome || c.nome || `+${c.numero}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold ${wsLigado ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {wsLigado ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {wsLigado ? 'Tempo real ligado' : 'A ligar ao tempo real...'}
        </span>
        {estadoWhatsApp && <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 font-semibold">WhatsApp: {estadoWhatsApp}</span>}
      </div>

      {erro && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="flex-1">{erro}</span>
          <button onClick={() => setErro(null)} aria-label="Fechar"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex h-[calc(100vh-260px)] min-h-[520px] rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {/* Conversas / contactos */}
        <aside className={`${selecionado ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-gray-100`}>
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  placeholder="Pesquisar nome ou número"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <button onClick={carregar} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Actualizar" title="Actualizar">
                <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => { setErroModal(null); setModalContato({ modo: 'criar', numero: '', nome: '' }); }}
                className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                aria-label="Novo contacto" title="Novo contacto"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-1 text-[11px] font-bold">
              {([['todas', 'Todas'], ['por_ler', 'Por ler'], ['por_identificar', 'Por identificar']] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFiltro(id)}
                  className={`px-2.5 py-1 rounded-full ${filtro === id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {carregando && contatos.length === 0 ? (
              <div className="p-6 flex justify-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : filtrados.length === 0 ? (
              <p className="p-6 text-sm text-center text-gray-500">{pesquisa || filtro !== 'todas' ? 'Nenhum resultado.' : 'Ainda não há conversas.'}</p>
            ) : filtrados.map((c) => {
              const cli = clientePorNumero.get(c.numero);
              return (
                <button
                  key={c.numero}
                  onClick={() => setSelecionado(c.numero)}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-left border-b border-gray-50 hover:bg-gray-50 ${selecionado === c.numero ? 'bg-emerald-50/70' : ''}`}
                >
                  <span className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {iniciais(nomeContato(c))}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900 truncate">{nomeContato(c)}</span>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">{horaCurta(c.ultimaData)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500 truncate">{c.ultimaMensagem || `+${c.numero}`}</span>
                      {!!c.naoLidas && (
                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">{c.naoLidas}</span>
                      )}
                    </span>
                    {!cli && <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Por identificar</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Conversa */}
        <section className={`${selecionado ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col`}>
          {!contatoAtual ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <MessageCircle className="w-12 h-12 mb-3" />
              <p className="text-sm">Selecione uma conversa para ver as mensagens.</p>
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
                <button onClick={() => setSelecionado(null)} className="md:hidden p-1 -ml-1 text-gray-500" aria-label="Voltar">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{nomeContato(contatoAtual)}</p>
                  <p className="text-xs text-gray-500">
                    +{contatoAtual.numero}
                    {clienteAtual ? ` · Cliente: ${clienteAtual.nome}` : ' · Não associado a cliente'}
                  </p>
                </div>
                {!clienteAtual && (
                  <button
                    onClick={() => { setErroModal(null); setModalAssociar(true); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Associar cliente
                  </button>
                )}
                {podeCriarTicket && (
                  <button
                    onClick={abrirCriarTicket}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary-hover"
                  >
                    <Ticket className="w-3.5 h-3.5" /> Criar ticket
                  </button>
                )}
                <button
                  onClick={() => { setErroModal(null); setModalContato({ modo: 'editar', numero: contatoAtual.numero, nome: contatoAtual.nome || '' }); }}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Editar contacto"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => apagarContato(contatoAtual.numero)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" aria-label="Apagar contacto">
                  <Trash2 className="w-4 h-4" />
                </button>
              </header>

              {clienteAtual && (
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2 overflow-x-auto text-xs">
                  <span className="font-bold text-gray-500 flex-shrink-0">Tickets:</span>
                  {carregandoTickets ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                  ) : tickets.length === 0 ? (
                    <span className="text-gray-400">nenhum</span>
                  ) : tickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onAbrirTicket(t.id)}
                      className={`flex-shrink-0 px-2 py-1 rounded-lg font-semibold border ${t.id === ticketAberto?.id ? 'border-theme-primary text-theme-primary bg-white' : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'}`}
                      title={t.titulo}
                    >
                      #{t.numero || t.id.slice(0, 4)} · {String(t.status).replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 min-h-0">
                <ChatWhatsApp key={contatoAtual.numero} numero={contatoAtual.numero} titulo={nomeContato(contatoAtual)} semCabecalho preencher />
              </div>
            </>
          )}
        </section>
      </div>

      {/* Modal contacto */}
      {modalContato && (
        <Modal titulo={modalContato.modo === 'criar' ? 'Novo contacto' : 'Editar contacto'} onFechar={() => !aGuardar && setModalContato(null)}>
          <form onSubmit={guardarContato} className="space-y-4">
            <Campo label="Número (com indicativo)">
              <input
                value={modalContato.numero}
                onChange={(e) => setModalContato({ ...modalContato, numero: e.target.value })}
                disabled={modalContato.modo === 'editar'}
                placeholder="244923000000" inputMode="tel" required
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </Campo>
            <Campo label="Nome">
              <input
                value={modalContato.nome}
                onChange={(e) => setModalContato({ ...modalContato, nome: e.target.value })}
                placeholder="Opcional"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </Campo>
            {erroModal && <p className="text-sm text-red-600">{erroModal}</p>}
            <Botoes aGuardar={aGuardar} onCancelar={() => setModalContato(null)} />
          </form>
        </Modal>
      )}

      {/* Modal associar cliente */}
      {modalAssociar && contatoAtual && (
        <Modal titulo="Associar a cliente" onFechar={() => !aGuardar && setModalAssociar(false)}>
          <AssociarCliente
            clientes={clientes}
            numero={contatoAtual.numero}
            aGuardar={aGuardar}
            erro={erroModal}
            onEscolher={associarCliente}
          />
        </Modal>
      )}

      {/* Modal criar ticket */}
      {modalTicket && contatoAtual && (
        <Modal titulo="Criar ticket desta conversa" onFechar={() => !aGuardar && setModalTicket(null)}>
          <form onSubmit={criarTicket} className="space-y-4">
            {ticketAberto && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Este cliente já tem o ticket aberto <b>#{ticketAberto.numero || ticketAberto.id.slice(0, 4)}</b>.{' '}
                <button type="button" className="underline font-bold" onClick={() => { setModalTicket(null); onAbrirTicket(ticketAberto.id); }}>
                  Abrir esse em vez de criar
                </button>
              </p>
            )}
            <Campo label="Cliente *">
              <select
                value={modalTicket.cliente_id}
                onChange={(e) => setModalTicket({ ...modalTicket, cliente_id: e.target.value })}
                required
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">Seleccione...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.telefone ? ` (${c.telefone})` : ''}</option>)}
              </select>
            </Campo>
            <Campo label="Título *">
              <input
                value={modalTicket.titulo}
                onChange={(e) => setModalTicket({ ...modalTicket, titulo: e.target.value })}
                required
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </Campo>
            <Campo label="Descrição *">
              <textarea
                value={modalTicket.descricao}
                onChange={(e) => setModalTicket({ ...modalTicket, descricao: e.target.value })}
                rows={5} required
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none"
              />
            </Campo>
            <Campo label="Prioridade">
              <select
                value={modalTicket.prioridade}
                onChange={(e) => setModalTicket({ ...modalTicket, prioridade: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </Campo>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={modalTicket.confirmar} onChange={(e) => setModalTicket({ ...modalTicket, confirmar: e.target.checked })} />
              Enviar confirmação ao cliente por WhatsApp
            </label>
            {erroModal && <p className="text-sm text-red-600">{erroModal}</p>}
            <Botoes aGuardar={aGuardar} onCancelar={() => setModalTicket(null)} textoGuardar="Criar ticket" />
          </form>
        </Modal>
      )}
    </div>
  );
}

function AssociarCliente({ clientes, numero, aGuardar, erro, onEscolher }: {
  clientes: any[]; numero: string; aGuardar: boolean; erro: string | null; onEscolher: (id: string) => void;
}) {
  const [termo, setTermo] = useState('');
  const lista = clientes.filter((c) => {
    const t = termo.trim().toLowerCase();
    return !t || (c.nome || '').toLowerCase().includes(t) || (c.email || '').toLowerCase().includes(t);
  }).slice(0, 50);
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">O número <b>+{numero}</b> será gravado como telefone do cliente escolhido.</p>
      <input
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Pesquisar cliente"
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
      />
      <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 rounded-xl border border-gray-100">
        {lista.length === 0 ? (
          <p className="p-4 text-sm text-center text-gray-500">Nenhum cliente encontrado.</p>
        ) : lista.map((c) => (
          <button
            key={c.id}
            disabled={aGuardar}
            onClick={() => onEscolher(c.id)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-gray-900 truncate">{c.nome}</span>
              <span className="block text-xs text-gray-500 truncate">{c.email}{c.telefone ? ` · ${c.telefone}` : ''}</span>
            </span>
          </button>
        ))}
      </div>
      {aGuardar && <p className="text-xs text-gray-500 flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> A associar...</p>}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}

function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-4" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900">{titulo}</h3>
          <button type="button" onClick={onFechar} className="text-gray-400 hover:text-gray-600" aria-label="Fechar"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
      {children}
    </label>
  );
}

function Botoes({ aGuardar, onCancelar, textoGuardar = 'Guardar' }: { aGuardar: boolean; onCancelar: () => void; textoGuardar?: string }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onCancelar} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
      <button type="submit" disabled={aGuardar} className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-2">
        {aGuardar && <Loader2 className="w-4 h-4 animate-spin" />}
        {textoGuardar}
      </button>
    </div>
  );
}
